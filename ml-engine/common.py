"""
Shared helpers used across pipeline stages: the common normalized reading
schema, geo distance, deterministic RNG, and lightweight logging.
"""
from __future__ import annotations
import math
import hashlib
from datetime import datetime, timezone

import numpy as np


def log(stage: str, msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {stage:<16} {msg}", flush=True)


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)


def normalized_reading(timestamp, location_id, metric, value, source):
    """The single common schema every collector emits (stage 1)."""
    return {
        "timestamp": timestamp,          # tz-aware datetime, hour-aligned
        "location": location_id,         # slug from config.LOCATIONS
        "metric": metric,                # pm25 / pm10 / no2 / o3 / temp / humidity / wind_speed / wind_dir
        "value": float(value),
        "source": source,                # openaq / cpcb / era5 / openweather / firms
    }


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def seeded_rng(*parts) -> np.random.Generator:
    """Deterministic RNG keyed by arbitrary parts -> reproducible synthetic data."""
    key = "|".join(str(p) for p in parts)
    seed = int(hashlib.sha256(key.encode()).hexdigest()[:8], 16)
    return np.random.default_rng(seed)
