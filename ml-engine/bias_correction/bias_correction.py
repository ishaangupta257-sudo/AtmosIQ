"""
Stage 5 — Bias Correction.

Raw model output carries a small systematic bias (a model can, over a recent
window, run consistently low or high versus the CPCB reference). We estimate
that bias from the held-out validation residuals saved at train time —
mean(actual - predicted) over a recent rolling window — and add it back as a
PM2.5 offset before the forecast is served.

This is a deliberately separate, independently demoable stage: predict.forecast()
returns the RAW forecast; apply() returns the CORRECTED one, so the demo can show
"raw vs bias-corrected" side by side (the /raw and default forecast endpoints).
"""
from __future__ import annotations
import numpy as np
import joblib

from config import ARTIFACT_DIR, pm25_to_aqi, aqi_category
from common import log

ROLL_WINDOW = 24   # most-recent validation hours used to estimate the offset


def compute_offset(location_id: str) -> dict:
    art = joblib.load(ARTIFACT_DIR / f"{location_id}.joblib")
    actual = np.asarray(art.get("val_actual", []), float)
    pred = np.asarray(art.get("val_pred", []), float)
    if actual.size == 0:
        return {"pm25_offset": 0.0, "window": 0}
    w = min(ROLL_WINDOW, actual.size)
    resid = actual[-w:] - pred[-w:]
    return {"pm25_offset": round(float(np.mean(resid)), 2),
            "window": int(w),
            "resid_std": round(float(np.std(resid)), 2)}


def apply(raw: dict) -> dict:
    """Return a bias-corrected copy of a raw forecast dict from predict.forecast()."""
    loc = raw["location"]
    off = compute_offset(loc)
    delta = off["pm25_offset"]
    corrected = []
    for row in raw["forecast"]:
        pm = max(5.0, row["pm25"] + delta)
        aqi = pm25_to_aqi(pm)
        corrected.append({**row, "pm25": round(pm, 1), "aqi": aqi,
                          "category": aqi_category(aqi)})
    log("bias", f"{loc}: applied PM2.5 offset {delta:+.2f} ug/m3 "
                f"(rolling window {off['window']}h)")
    return {**raw, "bias_corrected": True, "bias": off, "forecast": corrected}


if __name__ == "__main__":
    import sys, json
    from model.predict import forecast
    loc = sys.argv[1] if len(sys.argv) > 1 else "anand-vihar"
    print(json.dumps(apply(forecast(loc))["bias"], indent=2))
