// AtmosIQ REST API — the full surface the frontend consumes. ML-derived reads
// go through a short TTL cache; writes (health profile) and static feeds
// (construction) use the store. Every ML read degrades gracefully via mlClient.
import { Router } from 'express';
import * as ml from '../mlClient.js';
import { cached, get, put, list, dbMode } from '../db.js';
import { CACHE_TTL } from '../config.js';
import { CONSTRUCTION_SEED } from '../constants.js';
import { routeSuitability } from '../services/routeService.js';
import { answer as assistantAnswer } from '../services/assistantService.js';
import { currentAlerts } from '../services/alertService.js';

const r = Router();

// ---- Current AQI ----
r.get('/aqi/current', async (req, res) => {
  const loc = req.query.location || 'anand-vihar';
  res.json(await cached(`current:${loc}`, 120, () => ml.current(loc)));
});
r.get('/aqi/locations', async (_req, res) => {
  res.json({ locations: await cached('locations', 120, ml.locations) });
});

// ---- Forecast (bias-corrected / raw / explain) ----
r.get('/forecast/:location/raw', async (req, res) => {
  res.json(await cached(`fc-raw:${req.params.location}`, CACHE_TTL, () => ml.forecastRaw(req.params.location)));
});
r.get('/forecast/:location/explain', async (req, res) => {
  res.json(await cached(`fc-explain:${req.params.location}`, CACHE_TTL, () => ml.explain(req.params.location)));
});
r.get('/forecast/:location', async (req, res) => {
  res.json(await cached(`fc:${req.params.location}`, CACHE_TTL, () => ml.forecast(req.params.location)));
});

// ---- Weather / Fires ----
r.get('/weather/:location', async (req, res) => {
  res.json(await cached(`wx:${req.params.location}`, 300, () => ml.weather(req.params.location)));
});
r.get('/fires', async (_req, res) => {
  res.json({ fires: await cached('fires', 600, ml.fires) });
});

// ---- Construction sites (geocoded DPCC registry import; seed + user-added) ----
r.get('/construction', async (_req, res) => {
  const added = await list('construction');
  res.json({ sites: [...CONSTRUCTION_SEED, ...added] });
});
r.post('/construction', async (req, res) => {
  const { name, lat, lon, agency = 'Unknown', note = '', completion = '' } = req.body || {};
  if (!name || lat == null || lon == null) return res.status(400).json({ error: 'name, lat, lon required' });
  const id = `u${Date.now()}`;
  const site = { id, siteId: `USR-${id}`, name, lat: Number(lat), lon: Number(lon), agency, status: 'Active', note, completion };
  await put('construction', id, site);
  res.status(201).json(site);
});

// ---- Alerts (GRAP + forecast thresholds) ----
r.get('/alerts', async (_req, res) => {
  res.json(await cached('alerts', 120, currentAlerts));
});

// ---- Decision support ----
r.post('/route-suitability', async (req, res) => {
  res.json(await routeSuitability(req.body || {}));
});
r.post('/assistant/query', async (req, res) => {
  res.json(await assistantAnswer(req.body || {}));
});

// ---- Health profile ----
r.post('/health-profile', async (req, res) => {
  const p = req.body || {};
  const id = p.id || 'default';
  await put('health_profiles', id, { ...p, id, updatedAt: new Date().toISOString() });
  res.json({ ok: true, id });
});
r.get('/health-profile/:id', async (req, res) => {
  res.json((await get('health_profiles', req.params.id)) || {});
});

// ---- Pipeline control ----
r.post('/pipeline/run', async (_req, res) => {
  res.json(await ml.pipelineRun());
});
r.get('/pipeline/status', async (_req, res) => {
  res.json(await ml.pipelineStatus());
});

// ---- Backend health ----
r.get('/health', async (_req, res) => {
  const mlh = await ml.mlHealth();
  res.json({ ok: true, db: dbMode(), ml_engine: mlh.ok ? mlh.data : { reachable: false } });
});

export default r;
