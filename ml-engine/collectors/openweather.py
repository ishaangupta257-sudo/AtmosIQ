"""
Stage 1 collector — OpenWeather (current + forecast temperature, humidity, wind).

OpenWeather provides the *forecast* meteorology consumed at inference time: the
72-hour recursive PM2.5 forecast (stage 4) needs future temp / wind / humidity
to drive it. Live path uses the One Call / forecast endpoint with
OPENWEATHER_API_KEY; fallback continues the coupled synthetic world forward.
"""
from __future__ import annotations

from config import LOCATIONS, LOCATION_BY_ID, OPENWEATHER_KEY, FORECAST_HOURS
from common import normalized_reading, log
from collectors.base import history_index, future_index
from collectors._synthetic import build_world

SOURCE = "openweather"
WEATHER = ["temp", "humidity", "wind_speed", "wind_dir"]


def collect(hours_back=None):
    """Recent observed weather (overlaps ERA5; used for current conditions)."""
    idx = history_index(hours_back or 48)
    rows = []
    for loc in LOCATIONS:
        w = build_world(loc, idx)
        for ts, r in w.iterrows():
            for m in WEATHER:
                rows.append(normalized_reading(ts.to_pydatetime(), loc["id"], m, r[m], SOURCE))
    log(SOURCE, f"collected {len(rows)} recent weather readings")
    return rows


def forecast_weather(location_id, hours_ahead=FORECAST_HOURS):
    """Future weather frame for one location — drives the recursive AQI forecast."""
    loc = LOCATION_BY_ID[location_id]
    # Continue the deterministic world past 'now' so history and forecast align.
    full = build_world(loc, history_index(24).union(future_index(hours_ahead)))
    fut = full.loc[full.index > history_index(1)[-1]]
    return fut[WEATHER + ["fire_intensity"]].head(hours_ahead)


def current_weather(location_id):
    fw = build_world(LOCATION_BY_ID[location_id], history_index(6))
    last = fw.iloc[-1]
    return {"temp": round(float(last["temp"]), 1),
            "humidity": round(float(last["humidity"])),
            "wind_speed": round(float(last["wind_speed"]), 1),
            "wind_dir": round(float(last["wind_dir"]))}
