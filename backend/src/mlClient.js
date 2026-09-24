// Thin client for the Python ML engine (FastAPI) with graceful JS fallbacks.
//
// The frontend calls only this backend; this module is the only thing that
// talks to the ML engine. If the engine is unreachable (not started, or mid
// pipeline run) we return a physically-plausible synthetic response so the UI
// never breaks — mirroring the ML engine's own keyless-fallback philosophy.
import { ML_ENGINE_URL } from './config.js';
import { LOCATIONS, LOCATION_BY_ID } from './constants.js';
import { pm25ToAqi, aqiCategory, grapStage } from './aqi.js';

async function call(path, opts = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${ML_ENGINE_URL}${path}`, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error(`ML ${path} -> ${res.status}`);
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: String(e) };
  } finally {
    clearTimeout(t);
  }
}

// ---- deterministic-ish fallback generators ----
const BASE_AQI = { 'anand-vihar': 320, 'rk-puram': 265, dwarka: 205, 'noida-62': 300,
  gurugram: 250, rohini: 285, faridabad: 270, ito: 290 };

function diurnal(baseAqi, hourOffset) {
  const hod = (new Date().getHours() + hourOffset) % 24;
  const wave = Math.cos(((hod - 7) / 24) * 2 * Math.PI) * 55; // worse at night
  return Math.max(40, Math.round(baseAqi + wave - hourOffset * 0.3));
}

function fbCurrent(loc) {
  const aqi = diurnal(BASE_AQI[loc] ?? 250, 0);
  const l = LOCATION_BY_ID[loc];
  return { location: loc, name: l.name, lat: l.lat, lon: l.lon, aqi,
    category: aqiCategory(aqi), grap_stage: grapStage(aqi),
    pollutants: { pm25: Math.round(aqi * 0.7), pm10: Math.round(aqi * 1.1), no2: 60, o3: 30 },
    weather: { temp: 25, humidity: 68, wind_speed: 8, wind_dir: 305 }, fallback: true };
}

function fbForecast(loc, corrected = true) {
  const out = [];
  for (let h = 1; h <= 72; h++) {
    const aqi = diurnal(BASE_AQI[loc] ?? 250, h);
    out.push({ hour: h, at: new Date(Date.now() + h * 3600e3).toISOString(),
      pm25: Math.round(aqi * 0.7), aqi, category: aqiCategory(aqi) });
  }
  return { location: loc, generated_at: new Date().toISOString(), horizon_hours: 72,
    bias_corrected: corrected, forecast: out, fallback: true };
}

export const mlHealth = () => call('/health', {}, 2000);

export async function current(loc) {
  const r = await call(`/current/${loc}`);
  return r.ok ? r.data : fbCurrent(loc);
}
export async function locations() {
  const r = await call('/locations');
  return r.ok ? r.data.locations : LOCATIONS.map((l) => fbCurrent(l.id));
}
export async function weather(loc) {
  const r = await call(`/weather/${loc}`);
  return r.ok ? r.data : fbCurrent(loc).weather;
}
export async function forecast(loc) {
  const r = await call(`/forecast/${loc}`);
  return r.ok ? r.data : fbForecast(loc, true);
}
export async function forecastRaw(loc) {
  const r = await call(`/forecast/${loc}/raw`);
  return r.ok ? r.data : fbForecast(loc, false);
}
export async function explain(loc) {
  const r = await call(`/forecast/${loc}/explain`);
  if (r.ok) return r.data;
  return { location: loc, method: 'fallback', drivers: [],
    narrative: 'Explanation unavailable — ML engine offline. Forecast shown is a climatological fallback.' };
}
export async function fires() {
  const r = await call('/fires');
  return r.ok ? r.data.fires : [];
}
export async function alerts() {
  const r = await call('/alerts');
  return r.ok ? r.data.alerts : [];
}
export async function pipelineRun() {
  const r = await call('/pipeline/run', { method: 'POST' }, 120000);
  return r.ok ? r.data : { status: 'error', error: r.error };
}
export async function pipelineStatus() {
  const r = await call('/pipeline/status');
  return r.ok ? r.data : { status: 'unreachable' };
}
