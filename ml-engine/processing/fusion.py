"""
Stage 2 — Data Fusion & Cleaning.

Takes the flat list of normalized readings from stage 1 (5 sources, different
native cadences) and produces one clean hourly dataframe per location keyed by
(location, timestamp):

  1. Pivot metric -> column, averaging duplicate source readings of the same
     metric (e.g. ERA5 + OpenWeather both report temp).
  2. Resample to a strict hourly grid (config.FREQ).
  3. Missing values: linear interpolation for SHORT gaps (<= MAX_INTERP_GAP h);
     LONG gaps are left NaN and flagged, never fabricated.
  4. Outliers: per-pollutant IQR clipping (values outside [Q1-3*IQR, Q3+3*IQR]
     are winsorized to the fence) so a bad sensor spike can't reach the model.

Output: dict[location_id] -> DataFrame, and a flat 'processed_readings' record
list persisted to the store.
"""
from __future__ import annotations
import numpy as np
import pandas as pd

from config import LOCATIONS, POLLUTANTS, FREQ
from common import log

MAX_INTERP_GAP = 6          # hours; longer gaps stay NaN + flagged
IQR_K = 3.0                 # fence multiplier for outlier winsorizing
_NUMERIC = POLLUTANTS + ["temp", "humidity", "wind_speed", "wind_dir", "fire_intensity"]


def _clip_outliers(s: pd.Series) -> tuple[pd.Series, int]:
    if s.notna().sum() < 8:
        return s, 0
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    if iqr <= 0:
        return s, 0
    lo, hi = q1 - IQR_K * iqr, q3 + IQR_K * iqr
    mask = (s < lo) | (s > hi)
    return s.clip(lo, hi), int(mask.sum())


def fuse(readings: list[dict]) -> dict[str, pd.DataFrame]:
    df = pd.DataFrame(readings)
    if df.empty:
        raise ValueError("stage 2: no readings to fuse")
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    frames, flags, clipped = {}, 0, 0
    for loc in LOCATIONS:
        sub = df[df["location"] == loc["id"]]
        if sub.empty:
            continue
        # average across sources reporting the same metric at the same hour
        wide = (sub.pivot_table(index="timestamp", columns="metric",
                                values="value", aggfunc="mean")
                   .sort_index())
        wide = wide.resample(FREQ).mean()

        for col in [c for c in _NUMERIC if c in wide.columns]:
            gap = wide[col].isna()
            wide[col] = wide[col].interpolate(method="time", limit=MAX_INTERP_GAP,
                                              limit_area="inside")
            still = wide[col].isna() & gap
            flags += int(still.sum())
            wide[col + "_flag"] = still.astype(int)
            if col in POLLUTANTS:
                wide[col], c = _clip_outliers(wide[col])
                clipped += c

        wide["location"] = loc["id"]
        frames[loc["id"]] = wide

    log("fusion", f"{len(frames)} locations fused | {flags} long-gap NaNs flagged "
                  f"| {clipped} outliers winsorized")
    return frames


def to_records(frames: dict[str, pd.DataFrame]) -> list[dict]:
    out = []
    for loc_id, w in frames.items():
        for ts, row in w.iterrows():
            rec = {"timestamp": ts.to_pydatetime(), "location": loc_id}
            for k, v in row.items():
                if k == "location":
                    continue
                rec[k] = None if (isinstance(v, float) and np.isnan(v)) else float(v)
            out.append(rec)
    return out
