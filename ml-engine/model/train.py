"""
Stage 4 (train/validate) — XGBoost PM2.5 regression, one model per location.

Key correctness points:
  * TIME-BASED split, not random: the last VAL_FRAC of each location's timeline
    is held out as a future window. Random shuffling would leak future into past
    in a time-series problem and inflate metrics.
  * Metrics (MAE, RMSE) are logged per location and to artifacts/metrics.json so
    they can be cited in the demo/PPT.
  * Each artifact bundles everything predict.py / bias_correction.py need:
    the model, the feature column order, a seed buffer (recent enriched frame
    tail) to prime lag features, diurnal no2/o3 climatology for the forecast,
    and the validation residuals (for stage 5 bias correction and the raw-vs-
    corrected demo).

XGBoost is preferred; if it can't load (e.g. missing OpenMP) we fall back to
scikit-learn's HistGradientBoostingRegressor so training never hard-blocks.
"""
from __future__ import annotations
import json
import numpy as np
import pandas as pd
import joblib

from config import (LOCATIONS, ARTIFACT_DIR, TARGET, TRAIN_HISTORY_DAYS)
from common import log
from collectors import collect_all
from processing.fusion import fuse
from features.build_features import build_matrix, FEATURE_COLS

VAL_FRAC = 0.2
SEED_TAIL = 48   # rows of enriched frame saved to prime lags at inference


def _make_model():
    try:
        from xgboost import XGBRegressor
        return ("xgboost", XGBRegressor(
            n_estimators=350, max_depth=6, learning_rate=0.05,
            subsample=0.85, colsample_bytree=0.85, min_child_weight=3,
            reg_lambda=1.2, n_jobs=4, random_state=42, tree_method="hist"))
    except Exception as e:  # pragma: no cover
        log("train", f"xgboost unavailable ({e}); using sklearn HistGBR fallback")
        from sklearn.ensemble import HistGradientBoostingRegressor
        return ("sklearn-histgbr", HistGradientBoostingRegressor(
            max_iter=400, max_depth=6, learning_rate=0.05, random_state=42))


def _diurnal_climatology(frame: pd.DataFrame, col: str) -> dict:
    """Mean value of `col` by hour-of-day — used to project no2/o3 into future."""
    s = frame[col].dropna()
    if s.empty:
        return {h: 0.0 for h in range(24)}
    by_hour = s.groupby(s.index.hour).mean()
    return {int(h): float(by_hour.get(h, s.mean())) for h in range(24)}


def train(hours_back=None):
    log("train", f"collecting {TRAIN_HISTORY_DAYS}d history for training...")
    readings = collect_all(hours_back)
    frames = fuse(readings)
    matrix = build_matrix(frames)

    algo_name, _ = _make_model()
    summary = {"algo": algo_name, "feature_count": len(FEATURE_COLS),
               "locations": {}, "target": TARGET}

    for loc in LOCATIONS:
        m = matrix.get(loc["id"])
        if not m:
            continue
        X, y = m["X"], m["y"]
        split = int(len(X) * (1 - VAL_FRAC))
        Xtr, Xva, ytr, yva = X.iloc[:split], X.iloc[split:], y.iloc[:split], y.iloc[split:]

        _, model = _make_model()
        model.fit(Xtr, ytr)
        pred = np.asarray(model.predict(Xva))
        mae = float(np.mean(np.abs(pred - yva.to_numpy())))
        rmse = float(np.sqrt(np.mean((pred - yva.to_numpy()) ** 2)))

        frame = m["frame"]
        joblib.dump({
            "model": model,
            "algo": algo_name,
            "feature_cols": list(X.columns),
            "target": TARGET,
            "seed_frame": frame.tail(SEED_TAIL),
            "no2_clim": _diurnal_climatology(frame, "no2"),
            "o3_clim": _diurnal_climatology(frame, "o3"),
            "val_metrics": {"mae": round(mae, 2), "rmse": round(rmse, 2), "n": int(len(yva))},
            "val_actual": yva.to_numpy().tolist(),
            "val_pred": pred.tolist(),
        }, ARTIFACT_DIR / f"{loc['id']}.joblib")

        summary["locations"][loc["id"]] = {"mae": round(mae, 2), "rmse": round(rmse, 2),
                                           "train_rows": int(len(Xtr)), "val_rows": int(len(Xva))}
        log("train", f"{loc['id']:<12} MAE={mae:6.2f}  RMSE={rmse:6.2f}  (val n={len(yva)})")

    maes = [v["mae"] for v in summary["locations"].values()]
    summary["mean_mae"] = round(float(np.mean(maes)), 2) if maes else None
    summary["mean_rmse"] = round(float(np.mean([v["rmse"] for v in summary["locations"].values()])), 2) if maes else None
    (ARTIFACT_DIR / "metrics.json").write_text(json.dumps(summary, indent=2))
    log("train", f"done. mean MAE={summary['mean_mae']}  mean RMSE={summary['mean_rmse']}  "
                 f"[{algo_name}] -> {ARTIFACT_DIR}")
    return summary


if __name__ == "__main__":
    train()
