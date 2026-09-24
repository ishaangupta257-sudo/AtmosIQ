"""
Stage 4 (forecast) — 72-hour recursive PM2.5 / AQI forecast.

Loads the saved per-location artifact (no retraining per request) and rolls the
model forward hour by hour:
  * future temp / humidity / wind / fire come from the forecast collector
    (OpenWeather live, or the coupled synthetic continuation);
  * future no2 / o3 come from each location's diurnal climatology (documented
    approximation — we forecast PM2.5 directly, not every pollutant);
  * the PBL proxy, fire proximity, ventilation and time features are recomputed
    each step with the *exact* stage-3 functions, so train/serve features match;
  * lagged PM2.5 is fed recursively from the model's own predictions.

Output is the RAW forecast; stage 5 (bias_correction) adjusts it before serving.
"""
from __future__ import annotations
import numpy as np
import pandas as pd
import joblib

from config import (ARTIFACT_DIR, LAG_HOURS, FORECAST_HOURS, LOCATION_BY_ID,
                    pm25_to_aqi, aqi_category)
from common import log, utcnow
from collectors import openweather
from features.build_features import (FEATURE_COLS, pbl_proxy, location_fire_weight)

_LAG_BASE = ["pm25", "no2", "temp", "wind_speed", "humidity"]
L = max(LAG_HOURS)   # seed history length needed to prime lags


def _load(location_id):
    path = ARTIFACT_DIR / f"{location_id}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"no trained model for '{location_id}' — run train first")
    return joblib.load(path)


def forecast(location_id, hours=FORECAST_HOURS):
    art = _load(location_id)
    model, cols = art["model"], art["feature_cols"]
    seed = art["seed_frame"].tail(L)
    fw = openweather.forecast_weather(location_id, hours)     # future weather+fire
    fut_idx = fw.index
    full_idx = seed.index.append(fut_idx)
    n = len(full_idx)

    # --- per-metric arrays spanning [seed history | future] ---
    def arr(col, future_vals):
        return np.concatenate([seed[col].to_numpy(dtype=float), np.asarray(future_vals, float)])

    temp = arr("temp", fw["temp"]);            humidity = arr("humidity", fw["humidity"])
    wind = arr("wind_speed", fw["wind_speed"]); wind_dir = arr("wind_dir", fw["wind_dir"])
    fire = arr("fire_intensity", fw["fire_intensity"])

    hod = full_idx.hour.to_numpy()
    no2_clim, o3_clim = art["no2_clim"], art["o3_clim"]
    no2_mean = float(np.mean(list(no2_clim.values()))) if no2_clim else 40.0
    o3_mean = float(np.mean(list(o3_clim.values()))) if o3_clim else 30.0
    no2 = np.concatenate([seed["no2"].to_numpy(float),
                          np.array([no2_clim.get(int(h), no2_mean) for h in fut_idx.hour])])
    o3 = np.concatenate([seed["o3"].to_numpy(float),
                         np.array([o3_clim.get(int(h), o3_mean) for h in fut_idx.hour])])

    pm25 = np.concatenate([seed["pm25"].to_numpy(float), np.full(len(fut_idx), np.nan)])

    # --- derived features across the full span (stage-3 functions) ---
    pbl = pbl_proxy(pd.Series(temp, index=full_idx), pd.Series(wind, index=full_idx), full_idx).to_numpy()
    fweight = location_fire_weight(location_id)
    fire_prox = fire * fweight
    ventilation = (wind * pbl) / 1000.0
    hour_sin = np.sin(hod / 24 * 2 * np.pi)
    hour_cos = np.cos(hod / 24 * 2 * np.pi)

    out = []
    now = utcnow()
    for k in range(len(fut_idx)):
        ci = L + k
        feat = {
            "temp": temp[ci], "humidity": humidity[ci], "wind_speed": wind[ci],
            "wind_dir": wind_dir[ci], "no2": no2[ci], "o3": o3[ci],
            "fire_prox": fire_prox[ci], "pbl_proxy": pbl[ci],
            "hour_sin": hour_sin[ci], "hour_cos": hour_cos[ci], "ventilation": ventilation[ci],
        }
        src = {"pm25": pm25, "no2": no2, "temp": temp, "wind_speed": wind, "humidity": humidity}
        for c in _LAG_BASE:
            for h in LAG_HOURS:
                feat[f"{c}_lag{h}"] = src[c][ci - h]
        x = pd.DataFrame([[feat[c] for c in cols]], columns=cols)
        yhat = float(np.clip(model.predict(x)[0], 5, 900))
        pm25[ci] = yhat
        aqi = pm25_to_aqi(yhat)
        ts = fut_idx[k]
        out.append({
            "hour": k + 1,
            "at": ts.to_pydatetime().isoformat(),
            "pm25": round(yhat, 1),
            "aqi": aqi,
            "category": aqi_category(aqi),
        })
    log("predict", f"{location_id}: raw {len(out)}h forecast (AQI now~{out[0]['aqi']} -> {out[-1]['aqi']})")
    return {"location": location_id, "generated_at": now.isoformat(),
            "horizon_hours": len(out), "bias_corrected": False, "forecast": out}


if __name__ == "__main__":
    import json, sys
    loc = sys.argv[1] if len(sys.argv) > 1 else "anand-vihar"
    print(json.dumps(forecast(loc)["forecast"][:6], indent=2))
