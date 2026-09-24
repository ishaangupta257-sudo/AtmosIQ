// AtmosIQ frontend API client.
//
// Talks to the Node/Express backend (which fronts the Python ML engine). Every
// call fails soft: on any error it returns null so callers fall back to their
// existing local generators and the UI never breaks. Point VITE_API_BASE at a
// deployed backend for production; defaults to localhost for dev.
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api'

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
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}
async function post(path, body) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
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
  alerts: () => get('/alerts'),
  routeSuitability: (b) => post('/route-suitability', b),
  assistant: (b) => post('/assistant/query', b),
  saveHealthProfile: (b) => post('/health-profile', b),
  pipelineStatus: () => get('/pipeline/status'),
}
