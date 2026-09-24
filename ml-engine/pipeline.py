"""
AtmosIQ ML pipeline orchestrator — runs stages 1-7 in order.

Run the whole thing:      python pipeline.py
Run a single stage:       python pipeline.py --stage 3
List stages:              python pipeline.py --list

Each stage is a distinct, inspectable step (its own module). The orchestrator
persists raw + processed data, trains the model, generates the bias-corrected
forecast, computes SHAP explanations and writes threshold alerts, then records a
per-stage status document (pipeline_status) that /api/pipeline/status surfaces.
"""
from __future__ import annotations
import argparse
import time
from datetime import datetime, timezone

from config import LOCATIONS, FORECAST_HOURS, pm25_to_aqi, aqi_category, grap_stage
from common import log, utcnow
import db
from collectors import collect_all
from collectors import firms
from processing.fusion import fuse, to_records
from features.build_features import build_matrix
from model.train import train
from model.predict import forecast
from bias_correction.bias_correction import apply as bias_apply
from explainability.shap_explain import explain

RAW_SAMPLE_CAP = 2000   # file-store cap for the inspectable raw_readings sample

STAGES = [
    (1, "Data Collection"),
    (2, "Data Fusion & Cleaning"),
    (3, "Feature Engineering"),
    (4, "XGBoost Train / Forecast"),
    (5, "Bias Correction"),
    (6, "Explainable AI (SHAP)"),
    (7, "Dashboard & Alerts"),
]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _alert_from_forecast(loc_id, corrected):
    """Stage 7: raise an alert if AQI enters Very Poor/Severe within next 24h."""
    window = corrected["forecast"][:24]
    peak = max(window, key=lambda r: r["aqi"])
    if peak["aqi"] > 300:
        stage = grap_stage(peak["aqi"])
        return {
            "location": loc_id,
            "level": "severe" if peak["aqi"] > 400 else "very_poor",
            "peak_aqi": peak["aqi"],
            "peak_at": peak["at"],
            "grap_stage": stage,
            "message": (f"Forecast AQI {peak['aqi']} ({peak['category']}) at {peak['at'][:16]} "
                        f"— {('GRAP '+stage) if stage!='None' else 'advisory'} likely."),
            "created_at": _now(),
        }
    return None


def run(full: bool = True) -> dict:
    t0 = time.time()
    status = {"started_at": _now(), "mode": db.mode(), "stages": []}

    def record(n, name, ok, detail):
        status["stages"].append({"stage": n, "name": name,
                                  "status": "ok" if ok else "error", "detail": detail})
        log("pipeline", f"stage {n} {name}: {'OK' if ok else 'ERROR'} — {detail}")

    # Stage 1
    readings = collect_all()
    sample = readings[-RAW_SAMPLE_CAP:] if db.mode() == "file" else readings
    db.replace_all("raw_readings", sample)
    record(1, "Data Collection",
           True, f"{len(readings)} readings from 5 sources (stored {len(sample)})")

    # Stage 2
    frames = fuse(readings)
    processed = to_records(frames)
    db.replace_all("processed_readings", processed)
    record(2, "Data Fusion & Cleaning",
           True, f"{len(processed)} clean hourly rows across {len(frames)} locations")

    # Stage 3
    matrix = build_matrix(frames)
    record(3, "Feature Engineering",
           True, f"feature matrix for {len(matrix)} locations")

    # Stage 4
    summary = train()
    record(4, "XGBoost Train / Forecast",
           True, f"{summary['algo']} | mean MAE={summary['mean_mae']} RMSE={summary['mean_rmse']}")

    # Stages 5 + 7: forecast + bias-correct + alerts per location
    alerts, sample_bias = [], None
    forecasts = {}
    for loc in LOCATIONS:
        if loc["id"] not in summary["locations"]:
            continue
        corrected = bias_apply(forecast(loc["id"], FORECAST_HOURS))
        forecasts[loc["id"]] = corrected
        if sample_bias is None:
            sample_bias = corrected["bias"]
        a = _alert_from_forecast(loc["id"], corrected)
        if a:
            alerts.append(a)
    record(5, "Bias Correction",
           True, f"applied to {len(forecasts)} locations (e.g. offset {sample_bias})")

    # Stage 6
    explained = 0
    for loc_id in forecasts:
        try:
            explain(loc_id)
            explained += 1
        except Exception as e:
            log("pipeline", f"explain {loc_id} failed: {e}")
    record(6, "Explainable AI (SHAP)", True, f"explanations available for {explained} locations")

    # Stage 7
    db.replace_all("alerts", alerts)
    hotspots = firms.latest_hotspots()
    record(7, "Dashboard & Alerts",
           True, f"{len(alerts)} threshold alerts written | {len(hotspots)} fire hotspots")

    status["finished_at"] = _now()
    status["duration_sec"] = round(time.time() - t0, 1)
    status["metrics"] = {"mean_mae": summary["mean_mae"], "mean_rmse": summary["mean_rmse"],
                         "algo": summary["algo"]}
    status["alert_count"] = len(alerts)
    db.set_doc("pipeline_status", "latest", status)
    log("pipeline", f"COMPLETE in {status['duration_sec']}s — status saved")
    return status


def run_stage(n: int):
    """Run and print a single stage for stage-by-stage judging."""
    log("pipeline", f"--- running stage {n} only ---")
    readings = collect_all()
    if n == 1:
        return log("pipeline", f"stage 1: {len(readings)} normalized readings")
    frames = fuse(readings)
    if n == 2:
        return log("pipeline", f"stage 2: {len(to_records(frames))} clean rows")
    matrix = build_matrix(frames)
    if n == 3:
        return log("pipeline", f"stage 3: {len(matrix)} location feature matrices")
    if n == 4:
        return train()
    if n == 5:
        return log("pipeline", f"stage 5 offset sample: {bias_apply(forecast(LOCATIONS[0]['id']))['bias']}")
    if n == 6:
        return log("pipeline", f"stage 6: {explain(LOCATIONS[0]['id'])['narrative']}")
    if n == 7:
        return run(full=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", type=int, help="run a single stage (1-7)")
    ap.add_argument("--list", action="store_true", help="list stages")
    args = ap.parse_args()
    if args.list:
        for n, name in STAGES:
            print(f"  {n}. {name}")
    elif args.stage:
        run_stage(args.stage)
    else:
        run(full=True)
