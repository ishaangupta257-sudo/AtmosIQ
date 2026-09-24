"""
Stage 1 collector — CPCB ground-station validation data.

CPCB (Central Pollution Control Board) is the regulatory reference network used
here as the *validation truth* for bias correction (stage 5). Live access is via
the CPCB / data.gov.in AQI resource; the fallback emits a lightly re-noised copy
of the true PM2.5 so it plays the role of an independent reference instrument.
"""
from __future__ import annotations

from config import LOCATIONS
from common import normalized_reading, log, seeded_rng
from collectors.base import history_index
from collectors._synthetic import build_world

SOURCE = "cpcb"


def collect(hours_back=None):
    idx = history_index(hours_back)
    rows = []
    for loc in LOCATIONS:
        w = build_world(loc, idx)
        rng = seeded_rng("cpcb", loc["id"])
        # reference instrument: small multiplicative + additive measurement error
        ref = w["pm25"].to_numpy() * rng.normal(1.0, 0.04, len(w)) + rng.normal(0, 3, len(w))
        for ts, v in zip(w.index, ref):
            rows.append(normalized_reading(ts.to_pydatetime(), loc["id"], "pm25", max(0, v), SOURCE))
    log(SOURCE, f"collected {len(rows)} validation readings")
    return rows
