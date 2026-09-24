"""
Coupled synthetic world model — the fallback data source.

When live API keys are absent we cannot block the pipeline, so we generate a
*physically coupled* hourly world per location. Crucially this is NOT random
noise: PM2.5 is driven by wind stagnation, boundary-layer height, traffic
diurnality, fire (stubble-burning) influence and AR(1) persistence — the exact
meteorology-chemistry coupling the XGBoost model is meant to learn. That makes
stage-4 validation metrics and stage-6 SHAP explanations meaningful even in the
keyless demo, and the same collectors switch to real APIs when keys are set.

The world is deterministic per location (seeded), so raw -> features -> model
-> forecast is fully reproducible across runs.
"""
from __future__ import annotations
import numpy as np
import pandas as pd

from common import seeded_rng

# Regional stubble-burning season peaks in late Oct / early Nov (day-of-year).
_FIRE_PEAK_DOY = 305
_FIRE_WIDTH = 22.0


def _fire_intensity(index: pd.DatetimeIndex, rng) -> np.ndarray:
    doy = index.dayofyear.to_numpy(dtype=float)
    season = np.exp(-((doy - _FIRE_PEAK_DOY) ** 2) / (2 * _FIRE_WIDTH ** 2))
    daily = rng.gamma(2.0, 0.5, size=len(index))
    return np.clip(season * (40 + 60 * daily), 0, None)  # ~count of hotspots/day scale


def build_world(location: dict, index: pd.DatetimeIndex) -> pd.DataFrame:
    """Return an hourly coupled dataframe for one location over `index`."""
    rng = seeded_rng("world", location["id"])
    n = len(index)
    hod = index.hour.to_numpy(dtype=float)
    doy = index.dayofyear.to_numpy(dtype=float)

    # --- Weather ---
    seasonal_t = 8.0 * np.cos((doy - 200) / 365.0 * 2 * np.pi)   # cooler in winter
    diurnal_t = 6.5 * np.cos((hod - 15) / 24.0 * 2 * np.pi)       # peak mid-afternoon
    temp = 24 + seasonal_t + diurnal_t + rng.normal(0, 1.2, n)
    humidity = np.clip(70 - 1.6 * (temp - 24) + rng.normal(0, 6, n), 15, 100)
    # wind: AR(1) around a NW-winter mean, calmer at night
    wind = np.empty(n)
    wind[0] = 8
    for i in range(1, n):
        target = 7 + 3 * np.sin((hod[i] - 12) / 24 * 2 * np.pi)
        wind[i] = 0.85 * wind[i - 1] + 0.15 * target + rng.normal(0, 0.8)
    wind = np.clip(wind, 0.4, None)
    wind_dir = (310 + 25 * np.sin(np.arange(n) / 40) + rng.normal(0, 15, n)) % 360

    # --- Boundary layer (latent truth) ---
    # High midday, collapses at night; suppressed further by calm winds (stability).
    pbl = (300 + 650 * np.clip(np.cos((hod - 14) / 24 * 2 * np.pi), 0, 1)
           + 40 * wind + rng.normal(0, 30, n))
    pbl = np.clip(pbl, 120, 1800)

    # --- Fire influence ---
    fire = _fire_intensity(index, rng)

    # --- PM2.5 (latent truth, then observed = truth + obs noise) ---
    # Accumulation inversely proportional to ventilation (wind * pbl);
    # plus rush-hour traffic bumps, fire contribution, AR(1) persistence.
    ventilation = (wind * pbl) / 1000.0
    traffic = 18 * (np.exp(-((hod - 9) ** 2) / 6) + np.exp(-((hod - 20) ** 2) / 8))
    base = 120 / np.clip(ventilation, 0.6, None)
    fire_contrib = 0.9 * fire
    pm = np.empty(n)
    pm[0] = 180
    for i in range(1, n):
        drive = base[i] + traffic[i] + fire_contrib[i]
        pm[i] = 0.72 * pm[i - 1] + 0.28 * drive + rng.normal(0, 6)
    pm25 = np.clip(pm, 8, 900)

    pm10 = np.clip(pm25 * rng.uniform(1.5, 1.8) + 20 + rng.normal(0, 12, n), 10, None)
    no2 = np.clip(28 + 0.9 * traffic + 0.05 * pm25 + rng.normal(0, 6, n), 3, None)
    # ozone: builds midday with sun, titrated down by NO2 and high PM
    o3 = np.clip(30 + 40 * np.clip(np.cos((hod - 14) / 24 * 2 * np.pi), 0, 1)
                 - 0.15 * no2 - 0.02 * pm25 + rng.normal(0, 5, n), 2, None)

    return pd.DataFrame({
        "temp": temp, "humidity": humidity, "wind_speed": wind, "wind_dir": wind_dir,
        "pbl_true": pbl, "fire_intensity": fire,
        "pm25": pm25, "pm10": pm10, "no2": no2, "o3": o3,
    }, index=index)
