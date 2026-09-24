"""
Stage 6 — Explainable AI (SHAP).

Uses SHAP (SHapley Additive exPlanations) on the trained XGBoost model to answer
"why this forecast?" — the signed contribution of each feature to the current
PM2.5 prediction. We explain the most recent conditions row (the state the
72-hour forecast rolls forward from), rank features by |contribution|, translate
them to plain language, and tie the result back to actionable GRAP framing.

Powers the small "Why this forecast?" panel on the frontend forecast card.
Falls back to model feature-importances if a SHAP TreeExplainer can't be built.
"""
from __future__ import annotations
import numpy as np
import joblib

from config import ARTIFACT_DIR, LAG_HOURS, pm25_to_aqi, grap_stage
from common import log

# plain-language labels for the engineered features
_LABELS = {
    "pbl_proxy": "Boundary-layer height (mixing depth)",
    "ventilation": "Atmospheric ventilation (wind x mixing depth)",
    "wind_speed": "Wind speed", "wind_dir": "Wind direction",
    "temp": "Temperature", "humidity": "Humidity",
    "pm25": "PM2.5", "no2": "NO2 (traffic)", "o3": "Ozone",
    "fire_prox": "Fire / stubble-burning proximity",
    "hour_sin": "Time of day", "hour_cos": "Time of day",
}
for _c in ["pm25", "no2", "temp", "wind_speed", "humidity"]:
    for _h in LAG_HOURS:
        _LABELS[f"{_c}_lag{_h}"] = f"{_LABELS.get(_c, _c)} {_h}h ago"


def _friendly(feat: str) -> str:
    return _LABELS.get(feat, feat)


def _current_row(art):
    cols = art["feature_cols"]
    seed = art["seed_frame"]
    row = seed[cols].dropna().iloc[[-1]]
    return row, cols


def explain(location_id: str, top_k: int = 5) -> dict:
    art = joblib.load(ARTIFACT_DIR / f"{location_id}.joblib")
    model = art["model"]
    row, cols = _current_row(art)
    x = row.to_numpy()

    contributions = None
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        sv = explainer.shap_values(x)
        contributions = np.asarray(sv)[0]
        method = "shap-tree"
    except Exception as e:  # pragma: no cover
        log("shap", f"TreeExplainer unavailable ({e}); using feature_importances")
        imp = getattr(model, "feature_importances_", np.ones(len(cols)))
        # sign contribution by centered feature value so direction is indicative
        centered = (x[0] - np.nanmean(x))
        contributions = imp * np.sign(centered)
        method = "importance-fallback"

    pred = float(model.predict(row)[0])
    aqi = pm25_to_aqi(pred)

    order = np.argsort(-np.abs(contributions))[:top_k]
    drivers = [{
        "feature": cols[i],
        "label": _friendly(cols[i]),
        "value": round(float(row.iloc[0, i]), 2),
        "contribution": round(float(contributions[i]), 2),
        "direction": "raises" if contributions[i] > 0 else "lowers",
    } for i in order]

    top = drivers[0]["label"].lower() if drivers else "meteorology"
    stage = grap_stage(aqi)
    narrative = (f"Predicted AQI ~{aqi} ({stage if stage!='None' else 'below GRAP thresholds'}). "
                 f"The largest driver is {top}"
                 + (f", followed by {drivers[1]['label'].lower()}." if len(drivers) > 1 else "."))
    if stage in ("Stage III", "Stage IV"):
        narrative += f" This aligns with GRAP {stage} triggers (construction curbs, vehicle restrictions)."

    log("shap", f"{location_id}: top driver = {top} [{method}]")
    return {"location": location_id, "predicted_pm25": round(pred, 1),
            "predicted_aqi": aqi, "grap_stage": stage, "method": method,
            "drivers": drivers, "narrative": narrative}


if __name__ == "__main__":
    import sys, json
    loc = sys.argv[1] if len(sys.argv) > 1 else "anand-vihar"
    print(json.dumps(explain(loc), indent=2))
