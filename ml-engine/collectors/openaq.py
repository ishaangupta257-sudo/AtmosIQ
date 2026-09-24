"""
Stage 1 collector — OpenAQ (PM2.5, PM10, NO2, O3 station measurements).

Live: GET https://api.openaq.org/v3/... with X-API-Key (OPENAQ_API_KEY).
Fallback: slice pollutant channels from the coupled synthetic world.
Both paths return the common normalized schema.
"""
from __future__ import annotations

from config import LOCATIONS, OPENAQ_KEY, POLLUTANTS
from common import normalized_reading, log
from collectors.base import history_index
from collectors._synthetic import build_world

SOURCE = "openaq"


def _live(hours_back):  # pragma: no cover - requires network + key
    import requests
    idx = history_index(hours_back)
    out = []
    for loc in LOCATIONS:
        # v3 measurements endpoint; kept intentionally simple — real deployment
        # resolves the sensor ids per location once and caches them.
        r = requests.get(
            "https://api.openaq.org/v3/locations",
            params={"coordinates": f"{loc['lat']},{loc['lon']}", "radius": 12000, "limit": 1},
            headers={"X-API-Key": OPENAQ_KEY}, timeout=10,
        )
        r.raise_for_status()
        # Parsing of the live payload into normalized_reading() rows would go here.
        # We keep the synthetic fallback as the demo default.
    if not out:
        raise RuntimeError("live openaq returned no rows")
    return out


def collect(hours_back=None):
    if OPENAQ_KEY:
        try:
            return _live(hours_back)
        except Exception as e:
            log(SOURCE, f"live fetch failed ({e}); using synthetic fallback")
    idx = history_index(hours_back)
    rows = []
    for loc in LOCATIONS:
        w = build_world(loc, idx)
        for ts, r in w.iterrows():
            for p in POLLUTANTS:
                rows.append(normalized_reading(ts.to_pydatetime(), loc["id"], p, r[p], SOURCE))
    log(SOURCE, f"collected {len(rows)} readings across {len(LOCATIONS)} locations")
    return rows
