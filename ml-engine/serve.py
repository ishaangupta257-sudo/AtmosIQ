"""
AtmosIQ ML service (FastAPI) — the compute layer the Node/Express backend calls.

The frontend never touches this directly; Node proxies it. Endpoints:

  GET  /health
  GET  /locations                       current AQI for every location
  GET  /current/{location}              current AQI + pollutant breakdown
  GET  /weather/{location}              temp / humidity / wind
  GET  /forecast/{location}             bias-corrected 72h forecast
  GET  /forecast/{location}/raw         raw (pre-bias-correction) forecast
  GET  /forecast/{location}/explain     SHAP feature attribution
  GET  /fires                           active fire/stubble hotspots
  GET  /alerts                          threshold alerts (from last pipeline run)
  POST /pipeline/run                    run the full pipeline now
  GET  /pipeline/status                 last run + per-stage status

Run: uvicorn serve:app --port 8000   (from the ml-engine directory)
"""
from __future__ import annotations
from functools import lru_cache

from fastapi import FastAPI, HTTPException

from config import (LOCATIONS, LOCATION_BY_ID, ARTIFACT_DIR, POLLUTANTS,
                    pm25_to_aqi, aqi_category, grap_stage)
from common import log
import db
from collectors import openweather, firms
from model.predict import forecast as raw_forecast
from bias_correction.bias_correction import apply as bias_apply
from explainability.shap_explain import explain as shap_explain

app = FastAPI(title="AtmosIQ ML Engine", version="1.0")


def _has_model(loc_id):
    return (ARTIFACT_DIR / f"{loc_id}.joblib").exists()


def _latest_processed():
    """Most recent processed row per location -> current conditions."""
    rows = db.find("processed_readings")
    latest = {}
    for r in rows:
        loc = r.get("location")
        ts = r.get("timestamp")
        if loc and (loc not in latest or ts > latest[loc].get("timestamp", "")):
            latest[loc] = r
    return latest


def _current(loc_id):
    row = _latest_processed().get(loc_id)
    if row and row.get("pm25") is not None:
        pm25 = float(row["pm25"])
        breakdown = {p: (round(float(row[p]), 1) if row.get(p) is not None else None)
                     for p in POLLUTANTS}
    else:
        # pipeline not run yet — derive a live snapshot from a quick collect
        from collectors.base import history_index
        from collectors._synthetic import build_world
        w = build_world(LOCATION_BY_ID[loc_id], history_index(6)).iloc[-1]
        pm25 = float(w["pm25"])
        breakdown = {p: round(float(w[p]), 1) for p in POLLUTANTS}
    aqi = pm25_to_aqi(pm25)
    wx = openweather.current_weather(loc_id)
    return {"location": loc_id, "name": LOCATION_BY_ID[loc_id]["name"],
            "lat": LOCATION_BY_ID[loc_id]["lat"], "lon": LOCATION_BY_ID[loc_id]["lon"],
            "aqi": aqi, "category": aqi_category(aqi), "grap_stage": grap_stage(aqi),
            "pollutants": breakdown, "weather": wx}


@app.get("/health")
def health():
    trained = [l["id"] for l in LOCATIONS if _has_model(l["id"])]
    return {"ok": True, "db_mode": db.mode(), "trained_locations": trained,
            "model_ready": len(trained) > 0}


@app.get("/locations")
def locations():
    return {"locations": [_current(l["id"]) for l in LOCATIONS]}


@app.get("/current/{location}")
def current(location: str):
    if location not in LOCATION_BY_ID:
        raise HTTPException(404, "unknown location")
    return _current(location)


@app.get("/weather/{location}")
def weather(location: str):
    if location not in LOCATION_BY_ID:
        raise HTTPException(404, "unknown location")
    return {"location": location, **openweather.current_weather(location)}


def _require_model(location):
    if location not in LOCATION_BY_ID:
        raise HTTPException(404, "unknown location")
    if not _has_model(location):
        raise HTTPException(503, "model not trained yet — POST /pipeline/run first")


@app.get("/forecast/{location}")
def forecast_corrected(location: str):
    _require_model(location)
    return bias_apply(raw_forecast(location))


@app.get("/forecast/{location}/raw")
def forecast_raw(location: str):
    _require_model(location)
    return raw_forecast(location)


@app.get("/forecast/{location}/explain")
def forecast_explain(location: str):
    _require_model(location)
    return shap_explain(location)


@app.get("/fires")
def fires():
    return {"fires": firms.latest_hotspots()}


@app.get("/alerts")
def alerts():
    return {"alerts": db.find("alerts")}


@app.post("/pipeline/run")
def pipeline_run():
    from pipeline import run
    return run(full=True)


@app.get("/pipeline/status")
def pipeline_status():
    return db.get_doc("pipeline_status", "latest") or {"status": "never_run"}
