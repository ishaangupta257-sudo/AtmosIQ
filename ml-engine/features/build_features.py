"""
Stage 3 — Feature Engineering.

Turns the clean hourly frames (stage 2) into the model's feature matrix. Beyond
the raw met + pollutant columns it derives the features that make this a
*coupled* meteorology-chemistry model rather than a plain AQI autoregressor:

  * Lag features: pm2.5 / no2 / temp / wind / humidity at t-3, t-6, t-12, t-24
    (captures accumulation & persistence).
  * Fire proximity: the regional FIRMS stubble-burning intensity multiplied by a
    per-location distance weight (sum of exp(-d/FIRE_SCALE_KM) over the belt),
    i.e. a distance-weighted stubble-burning influence signal.
  * PBL proxy (documented approximation): direct planetary-boundary-layer height
    is not in the free APIs, so we approximate mixing depth from the signals that
    physically drive it — daytime heating (a positive hourly temperature
    gradient = an unstable, deepening layer), absolute hour-of-day insolation,
    and mechanical mixing from wind. A nighttime temperature *inversion*
    (dT/dt <= 0 with low wind) collapses the proxy toward its floor. This is a
    proxy, not a measurement; it is clamped to a plausible 150-1800 m range.
    See README ("PBL-proxy approximation").

The target is PM2.5 at time t, predicted from *contemporaneous* meteorology/fire
+ *lagged* pollutants (never the concurrent PM2.5 itself — that would leak). At
inference the same construction is driven by forecast weather, so the nowcast
generalizes into a 72-hour recursive forecast (stage 4).
"""
from __future__ import annotations
import numpy as np
import pandas as pd

from config import LOCATIONS, LOCATION_BY_ID, LAG_HOURS, TARGET
from common import haversine_km, log

FIRE_SCALE_KM = 150.0
_BELT = [(30.24, 75.84), (30.34, 76.38), (29.97, 76.83),
         (29.69, 76.99), (30.90, 75.85), (30.38, 76.78)]

_LAG_BASE = ["pm25", "no2", "temp", "wind_speed", "humidity"]
BASE_FEATURES = ["temp", "humidity", "wind_speed", "wind_dir", "no2", "o3",
                 "fire_prox", "pbl_proxy", "hour_sin", "hour_cos", "ventilation"]
FEATURE_COLS = BASE_FEATURES + [f"{c}_lag{h}" for c in _LAG_BASE for h in LAG_HOURS]


def location_fire_weight(location_id: str) -> float:
    """Distance weight of the stubble belt as seen from one location (0..~n)."""
    loc = LOCATION_BY_ID[location_id]
    return float(sum(np.exp(-haversine_km(loc["lat"], loc["lon"], la, lo) / FIRE_SCALE_KM)
                     for la, lo in _BELT))


def pbl_proxy(temp: pd.Series, wind: pd.Series, index: pd.DatetimeIndex) -> pd.Series:
    """Approximate boundary-layer height (m). See module docstring."""
    hod = index.hour.to_numpy(dtype=float)
    insolation = np.clip(np.cos((hod - 14) / 24 * 2 * np.pi), 0, 1)  # daytime factor
    dT = temp.diff().fillna(0).to_numpy()                            # heating vs inversion
    heating = np.clip(dT, -3, 3)
    proxy = 200 + 750 * insolation + 120 * heating + 45 * wind.to_numpy()
    return pd.Series(np.clip(proxy, 150, 1800), index=index)


def _time_and_derived(w: pd.DataFrame, loc_id: str) -> pd.DataFrame:
    idx = w.index
    hod = idx.hour.to_numpy(dtype=float)
    w = w.copy()
    w["hour_sin"] = np.sin(hod / 24 * 2 * np.pi)
    w["hour_cos"] = np.cos(hod / 24 * 2 * np.pi)
    w["pbl_proxy"] = pbl_proxy(w["temp"], w["wind_speed"], idx)
    fire = w["fire_intensity"] if "fire_intensity" in w else pd.Series(0.0, index=idx)
    w["fire_prox"] = fire.fillna(0) * location_fire_weight(loc_id)
    w["ventilation"] = (w["wind_speed"] * w["pbl_proxy"]) / 1000.0
    return w


def _add_lags(w: pd.DataFrame) -> pd.DataFrame:
    for c in _LAG_BASE:
        if c in w.columns:
            for h in LAG_HOURS:
                w[f"{c}_lag{h}"] = w[c].shift(h)
    return w


def build_matrix(frames: dict[str, pd.DataFrame]) -> dict[str, dict]:
    """Return {location_id: {'X': DataFrame, 'y': Series, 'frame': enriched df}}."""
    out = {}
    total = 0
    for loc in LOCATIONS:
        w = frames.get(loc["id"])
        if w is None or w.empty:
            continue
        w = _add_lags(_time_and_derived(w, loc["id"]))
        cols = [c for c in FEATURE_COLS if c in w.columns]
        data = w.dropna(subset=cols + [TARGET])
        if len(data) < 48:
            continue
        out[loc["id"]] = {"X": data[cols], "y": data[TARGET], "frame": w}
        total += len(data)
    log("features", f"built matrix for {len(out)} locations | {total} rows "
                    f"| {len(FEATURE_COLS)} features")
    return out
