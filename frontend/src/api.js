// AtmosIQ frontend API client.
//
// SINGLE SOURCE OF TRUTH for the API base URL: the VITE_API_BASE build-time env
// var (set in .env.production / Netlify → Site settings → Environment variables).
// It falls back to localhost ONLY for local dev; a production build that reaches
// the localhost fallback is a misconfiguration and is loudly flagged below.
//
// Calls fail soft (return null) so the UI still renders, but failures are now
// logged with console.error/console.warn instead of being swallowed silently —
// so "why is it showing mock data?" is visible in DevTools, not hidden.
const RAW_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api'
const BASE = RAW_BASE.replace(/\/+$/, '') // trim trailing slash

// Backend flavor is auto-detected from the URL so ONE env var configures either:
//   * ends with "/api"  -> Node/Express backend (e.g. https://<svc>.onrender.com/api)
//   * otherwise         -> FastAPI ML engine direct (e.g. https://atmosiq-1-y8f8.onrender.com)
// The two expose different paths for current/locations/alerts; everything else
// (forecast, weather, fires, pipeline) is identical on both.
const IS_EXPRESS = /\/api$/.test(BASE)

// Loudly flag a production build still pointing at localhost/a LAN IP — that is
// exactly the "works on my device, no data for anyone else + Local Network
// Access prompt" bug: the deployed site is calling the visitor's own machine.
if (import.meta.env.PROD && /localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.\d|172\.(1[6-9]|2\d|3[01])\./.test(BASE)) {
  console.error(
    `[AtmosIQ] MISCONFIG: production API base is a LOCAL address ("${BASE}"). ` +
    `Only your device can reach it. Set VITE_API_BASE (Netlify → Production context) ` +
    `to your public backend URL and trigger a fresh deploy.`
  )
}
console.info(`[AtmosIQ] API base: ${BASE} (${IS_EXPRESS ? 'express' : 'ml-engine'} flavor)`)
export { BASE }

// The ML engine models these 8 CAAQMS locations. Map any searched area name to
// the nearest modelled slug (exact -> contains -> default).
const SLUGS = {
  'anand vihar': 'anand-vihar', 'r.k. puram': 'rk-puram', 'rk puram': 'rk-puram',
  dwarka: 'dwarka', 'noida sec-62': 'noida-62', noida: 'noida-62',
  gurugram: 'gurugram', rohini: 'rohini', faridabad: 'faridabad', ito: 'ito',
}
export function resolveSlug(name = '') {
  const q = name.trim().toLowerCase()
  if (SLUGS[q]) return SLUGS[q]
  const hit = Object.keys(SLUGS).find((k) => q.includes(k) || k.includes(q))
  return hit ? SLUGS[hit] : 'anand-vihar'
}

async function get(path) {
  try {
    const r = await fetch(`${BASE}${path}`)
    if (!r.ok) {
      console.error(`[AtmosIQ] GET ${path} -> HTTP ${r.status} (falling back to local/mock data)`)
      return null
    }
    return await r.json()
  } catch (e) {
    console.error(`[AtmosIQ] GET ${path} failed: ${e} (falling back to local/mock data)`)
    return null
  }
}
async function post(path, body) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      console.error(`[AtmosIQ] POST ${path} -> HTTP ${r.status}`)
      return null
    }
    return await r.json()
  } catch (e) {
    console.error(`[AtmosIQ] POST ${path} failed: ${e}`)
    return null
  }
}

// GRAP derivation for the ML-engine flavor (Express computes this server-side).
function grapStage(aqi) {
  if (aqi <= 200) return 'None'
  if (aqi <= 300) return 'Stage I'
  if (aqi <= 400) return 'Stage II'
  if (aqi <= 450) return 'Stage III'
  return 'Stage IV'
}
const GRAP_DESC = {
  'Stage I': 'Poor air quality. Dust control at construction sites; mechanised road sweeping.',
  'Stage II': 'Very Poor. Diesel-generator curbs; parking-fee hikes; intensified public transport.',
  'Stage III': 'Severe. Ban on non-essential construction & BS-III/IV diesel vehicles; schools may go hybrid.',
  'Stage IV': 'Severe+. Truck-entry ban, construction halt, possible school closures & odd-even.',
}
// The ML engine's /alerts returns a raw list; synthesize the {grap} shape the
// frontend expects from the live locations feed (worst AQI → city GRAP stage).
async function alertsFromMlEngine() {
  const [locs, raw] = await Promise.all([get('/locations'), get('/alerts')])
  const list = locs?.locations || []
  if (!list.length) return { grap: null, forecastAlerts: raw?.alerts || [], updatedAt: new Date().toISOString() }
  const worst = list.reduce((m, l) => (l.aqi > m.aqi ? l : m), list[0])
  const stage = grapStage(worst.aqi)
  return {
    grap: { stage: stage === 'None' ? 'Stage I' : stage, cityMaxAqi: worst.aqi, hotspot: worst.name, category: worst.category, desc: GRAP_DESC[stage] || GRAP_DESC['Stage I'] },
    forecastAlerts: raw?.alerts || [], updatedAt: new Date().toISOString(),
  }
}

export const api = {
  // These three differ between backends; the rest of the paths are identical.
  current: (name) => IS_EXPRESS ? get(`/aqi/current?location=${resolveSlug(name)}`) : get(`/current/${resolveSlug(name)}`),
  locations: () => IS_EXPRESS ? get('/aqi/locations') : get('/locations'),
  alerts: () => IS_EXPRESS ? get('/alerts') : alertsFromMlEngine(),
  forecast: (name) => get(`/forecast/${resolveSlug(name)}`),
  forecastRaw: (name) => get(`/forecast/${resolveSlug(name)}/raw`),
  explain: (name) => get(`/forecast/${resolveSlug(name)}/explain`),
  weather: (name) => get(`/weather/${resolveSlug(name)}`),
  fires: () => get('/fires'),
  construction: () => get('/construction'),
  addConstruction: (b) => post('/construction', b),
  routeSuitability: (b) => post('/route-suitability', b),
  assistant: (b) => post('/assistant/query', b),
  saveHealthProfile: (b) => post('/health-profile', b),
  getHealthProfile: (id = 'default') => get(`/health-profile/${id}`),
  pipelineStatus: () => get('/pipeline/status'),
  pipelineRun: () => post('/pipeline/run', {}),
}
