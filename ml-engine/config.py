"""
AtmosIQ ML Engine — central configuration.

Locations, file paths, time-series parameters and the CPCB PM2.5 -> AQI
breakpoints all live here so every pipeline stage reads from one source of
truth. Nothing here is secret; real API keys are read from the environment
(see .env.example) and are optional — collectors fall back to cached/synthetic
sample data when a key is absent.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"
ARTIFACT_DIR = BASE_DIR / "model" / "artifacts"
for _d in (DATA_DIR, CACHE_DIR, ARTIFACT_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---- Delhi-NCR monitored locations (subset of CAAQMS network) ----
# id is the slug used across the whole stack (backend + frontend).
LOCATIONS = [
    {"id": "anand-vihar", "name": "Anand Vihar", "lat": 28.6469, "lon": 77.3161},
    {"id": "rk-puram",    "name": "R.K. Puram",  "lat": 28.5637, "lon": 77.1745},
    {"id": "dwarka",      "name": "Dwarka",      "lat": 28.5921, "lon": 77.0460},
    {"id": "noida-62",    "name": "Noida Sec-62","lat": 28.6270, "lon": 77.3720},
    {"id": "gurugram",    "name": "Gurugram",    "lat": 28.4595, "lon": 77.0266},
    {"id": "rohini",      "name": "Rohini",      "lat": 28.7410, "lon": 77.0670},
    {"id": "faridabad",   "name": "Faridabad",   "lat": 28.4089, "lon": 77.3178},
    {"id": "ito",         "name": "ITO",         "lat": 28.6289, "lon": 77.2410},
]
LOCATION_BY_ID = {l["id"]: l for l in LOCATIONS}

# ---- Time-series parameters ----
FREQ = "h"                 # hourly resampling step (pandas offset alias)
TRAIN_HISTORY_DAYS = 60    # how much history collectors synthesize/pull for training
FORECAST_HOURS = 72        # forecast horizon
LAG_HOURS = [3, 6, 12, 24] # lag features
FIRE_RADIUS_KM = 250       # FIRMS hotspots within this radius influence Delhi-NCR

# Pollutants we track (target model is trained on PM2.5, others are features)
POLLUTANTS = ["pm25", "pm10", "no2", "o3"]
TARGET = "pm25"

# ---- External API keys (optional — absence triggers cached/synthetic fallback) ----
OPENAQ_KEY      = os.getenv("OPENAQ_API_KEY", "")
OPENWEATHER_KEY = os.getenv("OPENWEATHER_API_KEY", "")
FIRMS_KEY       = os.getenv("NASA_FIRMS_KEY", "")
CDS_KEY         = os.getenv("CDS_API_KEY", "")   # ERA5 / Copernicus

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB", "atmosiq")

# ---- CPCB PM2.5 (24h) sub-index breakpoints -> National AQI ----
# (concentration_low, concentration_high, aqi_low, aqi_high). Edges are
# contiguous (each band's low = previous band's high) so no concentration falls
# between bands. Matching uses a cascading `c <= hi` so intermediate values are
# always mapped.
# NOTE: CPCB defines AQI on a 24h average; in this hourly pipeline we apply the
# breakpoints per-hour as a documented approximation for a live/short-horizon
# nowcast. See README (PBL proxy + AQI note).
PM25_BREAKPOINTS = [
    (0,   30,   0,   50),
    (30,  60,   51,  100),
    (60,  90,   101, 200),
    (90,  120,  201, 300),
    (120, 250,  301, 400),
    (250, 500,  401, 500),
]


def pm25_to_aqi(pm25: float) -> int:
    """Convert a PM2.5 concentration (ug/m3) to CPCB National AQI (sub-index)."""
    c = max(0.0, float(pm25))
    for lo, hi, alo, ahi in PM25_BREAKPOINTS:
        if c <= hi:
            return round((ahi - alo) / (hi - lo) * (c - lo) + alo)
    return 500


def aqi_category(aqi: int) -> str:
    for hi, label in [(50, "Good"), (100, "Satisfactory"), (200, "Moderate"),
                      (300, "Poor"), (400, "Very Poor")]:
        if aqi <= hi:
            return label
    return "Severe"


def grap_stage(aqi: int) -> str:
    """Map an AQI value to the CAQM Graded Response Action Plan stage."""
    if aqi <= 200:
        return "None"
    if aqi <= 300:
        return "Stage I"
    if aqi <= 400:
        return "Stage II"
    if aqi <= 450:
        return "Stage III"
    return "Stage IV"
