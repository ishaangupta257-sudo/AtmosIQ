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

// Loudly warn if a production build is still pointing at localhost/private hosts.
if (import.meta.env.PROD && /localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.\d/.test(BASE)) {
  console.error(
    `[AtmosIQ] VITE_API_BASE is not set for production — API base is "${BASE}". ` +
    `Set VITE_API_BASE to your deployed backend URL and rebuild, or the app will show fallback data.`
  )
}
console.info(`[AtmosIQ] API base: ${BASE}`)
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

export const api = {
  current: (name) => get(`/aqi/current?location=${resolveSlug(name)}`),
  locations: () => get('/aqi/locations'),
  forecast: (name) => get(`/forecast/${resolveSlug(name)}`),
  forecastRaw: (name) => get(`/forecast/${resolveSlug(name)}/raw`),
  explain: (name) => get(`/forecast/${resolveSlug(name)}/explain`),
  weather: (name) => get(`/weather/${resolveSlug(name)}`),
  fires: () => get('/fires'),
  construction: () => get('/construction'),
  addConstruction: (b) => post('/construction', b),
  alerts: () => get('/alerts'),
  routeSuitability: (b) => post('/route-suitability', b),
  assistant: (b) => post('/assistant/query', b),
  saveHealthProfile: (b) => post('/health-profile', b),
  getHealthProfile: (id = 'default') => get(`/health-profile/${id}`),
  pipelineStatus: () => get('/pipeline/status'),
  pipelineRun: () => post('/pipeline/run', {}),
}
