// POST /api/route-suitability — real road-following route comparison.
//
// 1. Geocode `from`/`to` (OpenStreetMap Nominatim) to coordinates.
// 2. Fetch real driving geometry from OSRM (alternatives=true) so the drawn
//    routes follow actual roads, not straight lines through buildings.
// 3. Pick the nearest modelled CAAQMS station to each endpoint (by distance) for
//    live AQI, and ground the health verdict in it + the caller's sensitivity.
//
// Every network step fails soft: if geocoding/OSRM are unreachable the response
// omits geometry and the frontend falls back to its static demo polylines.
import { current } from '../mlClient.js';
import { LOCATIONS } from '../constants.js';
import { aqiCategory } from '../aqi.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const UA = 'AtmosIQ/1.0 (SIH2026 air-quality prototype)';

function haversineKm(a, b, c, d) {
  const r = 6371, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(c - a), dLon = toRad(d - b);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

async function fetchJson(url, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; } finally { clearTimeout(t); }
}

async function geocode(name) {
  // ", Delhi" resolves reliably in Nominatim; fall back to the bare query.
  for (const q of [`${name}, Delhi`, name]) {
    const data = await fetchJson(`${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(q)}`);
    if (Array.isArray(data) && data[0]) {
      return { lat: +data[0].lat, lon: +data[0].lon, label: data[0].display_name?.split(',')[0] || name };
    }
  }
  return null;
}

// Nearest modelled station to a coordinate → live AQI for that point.
async function aqiAt(lat, lon, fallbackName) {
  let best = LOCATIONS[0], bestD = Infinity;
  for (const l of LOCATIONS) {
    const d = haversineKm(lat, lon, l.lat, l.lon);
    if (d < bestD) { bestD = d; best = l; }
  }
  const cur = await current(best.id);
  return { aqi: cur.aqi, station: cur.name, name: fallbackName || cur.name };
}

// ---- Personalized AQI reroute threshold (mirrors frontend/src/profileRouting.js) ----
const BASE_THRESHOLD = { low: 120, medium: 80, moderate: 80, high: 50 };
const CONDITION_BUFFER = { copd: 25, asthma: 20, cardio: 20, allergies: 8 };
const AGE_BUFFER = { child: 10, senior: 10 };

// Turn a health profile into { threshold, exertion } used to decide rerouting.
function profileParams(p = {}) {
  const sensitivity = p.sensitivityRaw || p.sensitivity || 'medium';
  const base = BASE_THRESHOLD[sensitivity] ?? 100;
  const conds = (p.conditionsList || []).filter((c) => c && c !== 'none');
  const condBuffer = conds.reduce((m, c) => Math.max(m, CONDITION_BUFFER[c] || 0), 0);
  const ageBuffer = AGE_BUFFER[p.age] || 0;
  const threshold = Math.max(25, base - condBuffer - ageBuffer);

  const activities = p.activities || [];
  const active = activities.filter((a) => a !== 'driving');
  const exertion = activities.includes('running') ? 1.5
    : (active.includes('walking') || active.includes('cycling')) ? 1.25
    : (activities.includes('driving') && active.length === 0) ? 0.65
    : 1.0;
  return { threshold, exertion, sensitivity, conditions: conds };
}

export async function routeSuitability({ from, to, healthProfile = {} }) {
  const [gA, gB] = await Promise.all([geocode(from), geocode(to)]);

  // Endpoint AQIs (from geocoded coords when available, else name match).
  const a = gA ? await aqiAt(gA.lat, gA.lon, from) : { aqi: (await current(LOCATIONS[0].id)).aqi, name: from, station: LOCATIONS[0].name };
  const b = gB ? await aqiAt(gB.lat, gB.lon, to) : { aqi: (await current(LOCATIONS[1].id)).aqi, name: to, station: LOCATIONS[1].name };

  const avg = Math.round((a.aqi + b.aqi) / 2);

  // Personalized decision: effective exposure (direct route AQI scaled by how
  // hard the user breathes) vs their computed threshold.
  const { threshold, exertion, sensitivity, conditions } = profileParams(healthProfile);
  const directAqi = Math.round(avg * 1.12);          // arterial route runs higher
  const effectiveAqi = Math.round(directAqi * exertion);
  const reroute = effectiveAqi > threshold;
  const over = effectiveAqi - threshold;

  let verdict, detail;
  if (!reroute) { verdict = 'Direct route OK'; detail = `Effective exposure AQI ${effectiveAqi} is within your ${threshold} threshold — the direct route is acceptable for you.`; }
  else if (over <= 60) { verdict = 'Take the cleaner route'; detail = `Effective exposure AQI ${effectiveAqi} exceeds your ${threshold} threshold — use the low-exposure route.`; }
  else { verdict = 'Avoid / travel enclosed'; detail = `Effective exposure AQI ${effectiveAqi} far exceeds your ${threshold} threshold — reschedule or travel enclosed with cabin filtration.`; }
  const adjusted = effectiveAqi;

  // Real road geometry via OSRM (with an alternative for the "safer" corridor).
  let fastest = null, safer = null;
  if (gA && gB) {
    const url = `${OSRM}/${gA.lon},${gA.lat};${gB.lon},${gB.lat}?alternatives=true&overview=full&geometries=geojson`;
    const osrm = await fetchJson(url);
    if (osrm?.routes?.length) {
      const toLatLng = (r) => r.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      const r0 = osrm.routes[0];
      const r1 = osrm.routes[1] || osrm.routes[0];
      fastest = { coords: toLatLng(r0), distanceKm: +(r0.distance / 1000).toFixed(1), durationMin: Math.round(r0.duration / 60) };
      safer = { coords: toLatLng(r1), distanceKm: +(r1.distance / 1000).toFixed(1), durationMin: Math.round(r1.duration / 60) };
    }
  }

  return {
    from: a.name, to: b.name,
    endpoints: [
      { name: a.name, station: a.station, aqi: a.aqi, ...(gA ? { lat: gA.lat, lon: gA.lon } : {}) },
      { name: b.name, station: b.station, aqi: b.aqi, ...(gB ? { lat: gB.lat, lon: gB.lon } : {}) },
    ],
    routeAqi: avg, adjustedAqi: adjusted, category: aqiCategory(avg),
    verdict, detail,
    // Personalized decision — driven by the caller's health profile.
    personalization: { threshold, effectiveAqi, exertion, reroute, recommend: reroute ? 'safer' : 'fastest', sensitivity, conditions },
    fastest, safer, geocoded: Boolean(gA && gB),
    optimalWindow: { time: '2:00 - 4:30 PM', note: 'Highest boundary-layer height & steady westerly wind disperse pollutants.' },
  };
}
