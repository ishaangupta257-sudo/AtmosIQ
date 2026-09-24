"""
Collector base + shared time index helper.

Each collector exposes collect(hours_back) -> list[normalized_reading]. It tries
the live API when its key is configured and otherwise slices the coupled
synthetic world (collectors/_synthetic.py). The forecast-capable collectors
(OpenWeather) additionally expose collect_forecast(hours_ahead).
"""
from __future__ import annotations
import pandas as pd

from config import TRAIN_HISTORY_DAYS
from common import utcnow


def history_index(hours_back: int | None = None) -> pd.DatetimeIndex:
    hours = hours_back or TRAIN_HISTORY_DAYS * 24
    end = pd.Timestamp(utcnow())
    return pd.date_range(end=end, periods=hours, freq="h")


def future_index(hours_ahead: int) -> pd.DatetimeIndex:
    start = pd.Timestamp(utcnow()) + pd.Timedelta(hours=1)
    return pd.date_range(start=start, periods=hours_ahead, freq="h")
