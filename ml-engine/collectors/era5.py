"""
Stage 1 collector — ERA5 / Copernicus (historical reanalysis weather for training).

Live: the Copernicus CDS API (cdsapi) with CDS_API_KEY returns reanalysis
temp / humidity / wind for the training window. Fallback: the coupled synthetic
world's weather channels. ERA5 supplies the *historical* meteorology the model
trains on (OpenWeather supplies the *forecast* meteorology used at inference).
"""
from __future__ import annotations

from config import LOCATIONS
from common import normalized_reading, log
from collectors.base import history_index
from collectors._synthetic import build_world

SOURCE = "era5"
WEATHER = ["temp", "humidity", "wind_speed", "wind_dir"]


def collect(hours_back=None):
    idx = history_index(hours_back)
    rows = []
    for loc in LOCATIONS:
        w = build_world(loc, idx)
        for ts, r in w.iterrows():
            for m in WEATHER:
                rows.append(normalized_reading(ts.to_pydatetime(), loc["id"], m, r[m], SOURCE))
    log(SOURCE, f"collected {len(rows)} historical weather readings")
    return rows
