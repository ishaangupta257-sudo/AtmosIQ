# AtmosIQ — Delhi-NCR Air Pollution–Weather Coupled Forecasting System

Team **Outliers** · SIH 2026 · Problem Statement **SIH26082** · Ministry of Earth Sciences.

AtmosIQ pairs a React frontend with a Node/Express API and a Python ML engine
that runs a real **7-stage coupled forecasting pipeline** (meteorology +
chemistry) to produce an explainable 72-hour AQI forecast for Delhi-NCR.

```
 React frontend  ──▶  Node/Express API  ──▶  Python ML engine (FastAPI)  ──▶  external APIs
 (Vite, :5173)        (:5000, caching)        (:8000, XGBoost + SHAP)          OpenAQ / OpenWeather
                                                                               NASA FIRMS / ERA5 / CPCB
```

The frontend talks **only** to the Node backend; the backend orchestrates and
caches the ML engine; the ML engine owns the pipeline and the models.

---

## Runs with zero infrastructure

Every external dependency is optional and degrades gracefully, so the whole
stack runs on a laptop with no keys and no database:

| Dependency        | If present                    | If absent (demo default)                          |
|-------------------|-------------------------------|---------------------------------------------------|
| API keys          | live OpenAQ/OpenWeather/FIRMS | **coupled synthetic world** (physically realistic)|
| MongoDB           | used for storage + cache      | in-memory / JSON-file fallback                     |
| xgboost + OpenMP  | XGBoost models                | scikit-learn HistGradientBoosting fallback        |
| ML engine running | real model forecasts          | backend returns synthetic forecasts (UI unbroken) |

The synthetic fallback is **not random noise** — PM2.5 is driven by wind
stagnation, boundary-layer height, traffic diurnality, fire influence and AR(1)
persistence, so the model learns genuine relationships and SHAP explanations are
meaningful even without live keys. Add keys to switch each collector to live data.

---

## Quick start

```bash
# 1) ML engine
cd ml-engine
python3 -m pip install -r requirements.txt      # xgboost also needs: brew install libomp
python3 pipeline.py                              # run all 7 stages once (trains models)
python3 -m uvicorn serve:app --port 8000         # serve the model

# 2) Backend  (new terminal)
cd backend
npm install
npm start                                         # http://localhost:5000  (auto-trains if needed)

# 3) Frontend (new terminal)
cd frontend
npm install
npm run dev                                        # http://localhost:5173
```

Optional: `cp backend/.env.example backend/.env` to set keys, MongoDB, cache TTL
and the pipeline schedule. The frontend reads `VITE_API_BASE` (default
`http://localhost:5000/api`).

---

## The 7-stage ML pipeline (`ml-engine/`)

Each stage is a separate, inspectable module and can be run alone for judges:

```bash
python3 pipeline.py            # full run, writes per-stage status
python3 pipeline.py --list     # list stages
python3 pipeline.py --stage 3  # run only feature engineering, etc.
```

| # | Stage | Module | What it does |
|---|-------|--------|--------------|
| 1 | Data Collection | `collectors/` | one collector per source (OpenAQ, CPCB, ERA5, FIRMS, OpenWeather) → common normalized schema → `raw_readings` |
| 2 | Fusion & Cleaning | `processing/fusion.py` | join 5 sources by location+hour, interpolate short gaps (flag long ones), IQR-winsorize outliers, hourly resample → `processed_readings` |
| 3 | Feature Engineering | `features/build_features.py` | lag features, distance-weighted fire proximity, **PBL proxy**, ventilation, time features |
| 4 | XGBoost Train/Forecast | `model/train.py`, `model/predict.py` | time-based split, per-location models, logged MAE/RMSE, recursive 72h forecast |
| 5 | Bias Correction | `bias_correction/bias_correction.py` | rolling residual offset vs CPCB reference; raw vs corrected are separately demoable |
| 6 | Explainable AI | `explainability/shap_explain.py` | SHAP attribution → "why this forecast?" with GRAP framing |
| 7 | Dashboard & Alerts | `pipeline.py` | threshold alerts (AQI enters Very Poor/Severe in 24h) → `alerts`; feeds the frontend |

Validation metrics from a typical run: **mean MAE ≈ 9 µg/m³, RMSE ≈ 11.6 µg/m³**
(PM2.5), logged to `model/artifacts/metrics.json`.

### The PBL-proxy approximation (documented)

Direct planetary-boundary-layer (mixing-depth) height is **not** available in the
free APIs, and mixing depth is the single biggest driver of winter AQI spikes in
Delhi (a shallow nighttime layer traps pollutants). We therefore **approximate**
it in `features/build_features.py::pbl_proxy` from the signals that physically
drive it:

- **Insolation / hour-of-day** — the layer deepens through the day, peaks
  mid-afternoon, collapses at night.
- **Hourly temperature gradient (dT/dt)** — a positive gradient means surface
  heating and an unstable, deepening layer; a nighttime **temperature inversion**
  (dT/dt ≤ 0 with low wind) collapses the proxy toward its floor.
- **Wind speed** — mechanical mixing adds depth.

The result is clamped to a plausible **150–1800 m** range. This is a *proxy, not a
measurement*; with a real reanalysis/model feed it can be swapped for measured
PBL height without changing the rest of the pipeline. The same caveat applies to
AQI: CPCB defines AQI on a 24-hour average, and we apply the breakpoints per hour
as a documented short-horizon nowcast approximation.

### Scheduled vs on-demand runs

The pipeline can run two ways (set `PIPELINE_MODE` in `backend/.env`):

- **`ondemand`** (default) — the model is trained once at startup, and a run is
  triggered manually via `POST /api/pipeline/run`. Best for a laptop demo:
  predictable, cheap, no background load.
- **`cron`** — the backend re-runs the pipeline every `RUN_INTERVAL_MIN` minutes
  (default 30) to ingest fresh external data. Best for a deployed instance where
  live APIs update through the day. Forecasts are cached (`CACHE_TTL`) so the
  frontend is never blocked on a slow external API or an in-progress run.

---

## Backend REST API (`backend/`)

```
GET  /api/aqi/current?location=        current AQI + pollutant breakdown
GET  /api/aqi/locations                all monitored locations with current AQI
GET  /api/forecast/:location           bias-corrected 72-hour forecast
GET  /api/forecast/:location/raw       raw (pre-bias-correction) forecast
GET  /api/forecast/:location/explain   SHAP feature attribution
GET  /api/weather/:location            temp / humidity / wind
GET  /api/fires                        active fire / stubble hotspots
GET  /api/construction                 construction sites (seed + user-added)
POST /api/construction                 add a construction site
GET  /api/alerts                       GRAP stage + forecast-threshold alerts
POST /api/route-suitability            {from,to,healthProfile} → verdict
POST /api/assistant/query              {question,context} → grounded answer
POST /api/health-profile               save a health profile
POST /api/pipeline/run                 trigger a full pipeline run
GET  /api/pipeline/status              last run + per-stage status
GET  /api/health                       backend + ML-engine health
```

## Frontend integration (`frontend/`)

- `src/api.js` — fail-soft client for the backend (falls back to local
  generators so the UI never breaks).
- The Home forecast card is fed by `/api/forecast/:location` and shows a
  **"Why this forecast?"** SHAP panel from `/api/forecast/:location/explain` — a
  small expandable panel, no new page, design unchanged.

Deployed frontend: <https://clever-jalebi-23f6e8.netlify.app> (rebuild + redeploy
after `npm run build` to pick up the backend wiring; set `VITE_API_BASE` to your
deployed backend URL).
