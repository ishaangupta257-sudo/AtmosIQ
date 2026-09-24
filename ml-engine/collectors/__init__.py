"""Stage 1 — Data Collection. One collector per source, common schema out."""
from collectors import openaq, cpcb, era5, firms, openweather


def collect_all(hours_back=None):
    """Run every collector and return the merged list of normalized readings."""
    rows = []
    rows += openaq.collect(hours_back)
    rows += cpcb.collect(hours_back)
    rows += era5.collect(hours_back)
    rows += firms.collect(hours_back)
    rows += openweather.collect(hours_back)
    return rows
