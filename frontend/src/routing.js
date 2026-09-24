// Client-side road routing — geocoding + real road geometry, no API key needed.
//
// Uses two free, CORS-enabled public services directly from the browser:
//   • Nominatim (nominatim.openstreetmap.org)      — geocode place names → lat/lon
//   • OSRM demo server (router.project-osrm.org)   — road-snapped driving routes
//
// Returned geometry follows the actual street network (GeoJSON coordinates from
// OSRM), so the map draws real roads instead of straight lines between points.
// Doing this client-side means routes work regardless of backend state.
//
// Note: these are shared public demo servers (rate-limited, best-effort). For
// production traffic, self-host OSRM or use a keyed provider (Mapbox/GraphHopper)
// behind the same interface — see README.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OSRM = 'https://router.project-osrm.org/route/v1/driving'

async function fetchJson(url, ms = 9000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Geocode a place name to coordinates. ", Delhi" resolves reliably in Nominatim;
// falls back to the bare query.
async function geocode(name) {
  for (const q of [`${name}, Delhi`, name]) {
    const data = await fetchJson(`${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(q)}`)
    if (Array.isArray(data) && data[0]) {
      return { lat: +data[0].lat, lon: +data[0].lon }
    }
  }
  return null
}

const toLatLng = (route) => route.geometry.coordinates.map(([lon, lat]) => [lat, lon])

/**
 * Compute road-following routes between two place names.
 * Returns { start, end, fastest, safer } on success, or { error } with a code:
 *   'geocode' (a place couldn't be found) | 'osrm' (routing service failed).
 */
export async function routeBetween(from, to) {
  // Sequential geocoding (respect Nominatim's ~1 req/s policy).
  const a = await geocode(from)
  const b = a ? await geocode(to) : null
  if (!a || !b) return { error: 'geocode' }

  const url = `${OSRM}/${a.lon},${a.lat};${b.lon},${b.lat}?alternatives=true&overview=full&geometries=geojson`
  const data = await fetchJson(url)
  if (!data || data.code !== 'Ok' || !data.routes?.length) return { error: 'osrm' }

  const r0 = data.routes[0]
  const r1 = data.routes[1] || data.routes[0] // alternative "safer" corridor, or same
  return {
    start: [a.lat, a.lon],
    end: [b.lat, b.lon],
    fastest: { coords: toLatLng(r0), distanceKm: +(r0.distance / 1000).toFixed(1), durationMin: Math.round(r0.duration / 60) },
    safer: { coords: toLatLng(r1), distanceKm: +(r1.distance / 1000).toFixed(1), durationMin: Math.round(r1.duration / 60) },
  }
}
