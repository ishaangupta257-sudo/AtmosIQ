// Shared live-data hooks — one fetch per feed, cached module-wide and refreshed
// on an interval, so every dashboard surface (hero, maps, tables, banner) reads
// the same backend data without redundant requests. All hooks fail soft: until
// data arrives (or if the backend is down) they return null/empty and callers
// keep their existing static fallback, so the UI never breaks.
import { useState, useEffect } from 'react'
import { api, resolveSlug } from './api'

const REFRESH_MS = 120000 // re-pull feeds every 2 min

// generic module-level cache: key -> { data, ts, subs:Set, timer }
const store = new Map()

function channel(key, fetcher) {
  if (!store.has(key)) store.set(key, { data: null, ts: 0, subs: new Set(), timer: null })
  return store.get(key)
}

function useFeed(key, fetcher) {
  const ch = channel(key)
  const [, force] = useState(0)

  useEffect(() => {
    const rerender = () => force((n) => n + 1)
    ch.subs.add(rerender)

    const load = async () => {
      const data = await fetcher()
      if (data != null) { ch.data = data; ch.ts = Date.now(); ch.subs.forEach((f) => f()) }
    }
    // fetch if empty or stale
    if (ch.data == null || Date.now() - ch.ts > REFRESH_MS) load()
    if (!ch.timer) ch.timer = setInterval(load, REFRESH_MS)

    return () => {
      ch.subs.delete(rerender)
      if (ch.subs.size === 0 && ch.timer) { clearInterval(ch.timer); ch.timer = null }
    }
  }, [key])

  return ch.data
}

// ---- Feeds ----
export function useLocations() {
  const d = useFeed('locations', () => api.locations())
  const list = d?.locations || null
  const byName = list ? Object.fromEntries(list.map((l) => [l.name.toLowerCase(), l])) : {}
  // Feed items are keyed by `location` (the station slug), not `id`.
  const byId = list ? Object.fromEntries(list.map((l) => [l.location, l])) : {}
  return { list, byName, byId }
}

export function useAlerts() { return useFeed('alerts', () => api.alerts()) }
export function useFires() { const d = useFeed('fires', () => api.fires()); return d?.fires || null }
export function useConstruction() { const d = useFeed('construction', () => api.construction()); return d?.sites || null }

// Current conditions for a specific area name (resolved to nearest station).
export function useCurrent(name) {
  const slug = resolveSlug(name || '')
  const d = useFeed(`current:${slug}`, () => api.current(slug))
  return d
}

// Look up the real station nearest to any area name from the locations feed.
export function stationFor(byId, name) {
  return byId?.[resolveSlug(name || '')] || null
}
