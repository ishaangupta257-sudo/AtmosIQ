"""
Stage 1 collector — NASA FIRMS (active fire / stubble-burning hotspots).

Live: FIRMS area CSV API (MAP_KEY = NASA_FIRMS_KEY) over the Punjab/Haryana box.
Fallback: draw hotspots in the stubble-burning belt NW of Delhi with a count
proportional to the synthetic regional fire intensity. Hotspots feed the
distance-weighted fire-proximity feature in stage 3.

Returns two things via collect(): normalized regional-intensity readings (for
the unified store) and a hotspot list (lat/lon/brightness/confidence) exposed
separately through latest_hotspots() for the /api/fires endpoint.
"""
from __future__ import annotations
import numpy as np

from config import LOCATIONS, FIRMS_KEY
from common import normalized_reading, log, seeded_rng
from collectors.base import history_index
from collectors._synthetic import build_world

SOURCE = "firms"

# Stubble-burning belt reference points NW of Delhi.
_BELT = [
    ("Sangrur, Punjab", 30.24, 75.84), ("Patiala, Punjab", 30.34, 76.38),
    ("Kurukshetra, Haryana", 29.97, 76.83), ("Karnal, Haryana", 29.69, 76.99),
    ("Ludhiana, Punjab", 30.90, 75.85), ("Ambala, Haryana", 30.38, 76.78),
]


def collect(hours_back=None):
    """Regional fire-intensity as a normalized time series (used in fusion)."""
    idx = history_index(hours_back)
    # fire intensity is regional; attach it to every location so the join is clean
    ref = build_world(LOCATIONS[0], idx)["fire_intensity"]
    rows = []
    for loc in LOCATIONS:
        for ts, v in zip(ref.index, ref.to_numpy()):
            rows.append(normalized_reading(ts.to_pydatetime(), loc["id"], "fire_intensity", v, SOURCE))
    log(SOURCE, f"collected {len(rows)} fire-intensity readings")
    return rows


def latest_hotspots():
    """Current active hotspots for the map/API, count scaled by today's intensity."""
    idx = history_index(24)
    intensity = float(build_world(LOCATIONS[0], idx)["fire_intensity"].iloc[-1])
    n = int(np.clip(intensity / 12, 2, len(_BELT)))
    rng = seeded_rng("firms-hotspots", idx[-1].date().isoformat())
    picks = rng.choice(len(_BELT), size=n, replace=False)
    out = []
    for i in picks:
        place, lat, lon = _BELT[i]
        bright = float(rng.uniform(300, 360))
        out.append({
            "id": f"f{i}", "lat": round(lat + rng.normal(0, 0.05), 3),
            "lon": round(lon + rng.normal(0, 0.05), 3), "place": place,
            "brightness": round(bright), "confidence": "high" if bright > 325 else "nominal",
        })
    return out
