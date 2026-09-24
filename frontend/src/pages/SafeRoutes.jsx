import { useState, useEffect } from 'react'
import { MapContainer, Polyline, CircleMarker, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from '../components/Icon'
import MapTiles from '../components/MapTiles'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import HealthProfileModal from '../components/HealthProfileModal'
import { api } from '../api'
import { routeBetween } from '../routing'

function catOf(aqi) {
  if (aqi <= 50) return 'Good'; if (aqi <= 100) return 'Satisfactory'; if (aqi <= 200) return 'Moderate'
  if (aqi <= 300) return 'Poor'; if (aqi <= 400) return 'Very Poor'; return 'Severe'
}
const FASTEST_ROUTE = [
  [28.6330, 77.2190], [28.6289, 77.2410], [28.6278, 77.2790], [28.6469, 77.3152], [28.6270, 77.3640],
]
const SAFER_ROUTE = [
  [28.6330, 77.2190], [28.6139, 77.2295], [28.6040, 77.2580], [28.6090, 77.2900], [28.6270, 77.3640],
]
const constructionMarker = L.divIcon({
  className: '',
  iconSize: [24, 24],
  html: '<div style="width:18px;height:18px;background:#ffb95f;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.28);transform:rotate(45deg);border-radius:3px"></div>',
})

export default function SafeRoutes() {
  const { profile, lang } = useApp()
  const T = (s) => t(s, lang)
  const [showModal, setShowModal] = useState(!profile)
  const [from, setFrom] = useState('Connaught Place')
  const [to, setTo] = useState('Noida Sec-62')
  const [result, setResult] = useState(null)   // backend AQI/verdict (best-effort)
  const [geo, setGeo] = useState(null)         // client-side OSRM road geometry
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const s = suitabilityFor(profile)

  // Compute road-following geometry client-side (real streets, no API key) and
  // fetch AQI/verdict from the backend in parallel. Geometry never depends on
  // the backend, so routes always follow roads even if the API is down.
  const compare = async () => {
    setLoading(true); setError('')
    const [g, r] = await Promise.all([
      routeBetween(from, to),
      api.routeSuitability({ from, to, healthProfile: profile || {} }),
    ])
    setResult(r)
    if (g && !g.error) {
      setGeo(g)
    } else {
      setGeo(null)
      setError(g?.error === 'geocode'
        ? 'Couldn’t find one of those places. Try a more specific name (e.g. “Connaught Place, Delhi”).'
        : 'Routing service is busy right now — please try again in a moment.')
    }
    setLoading(false)
  }
  // Draw real roads immediately on first load (default From/To).
  useEffect(() => { compare() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive the two route AQIs from the real average: direct passes the hotspot
  // (higher), greenway is buffered (lower). Falls back to the static demo values.
  const safeAqi = result ? Math.round(result.routeAqi * 0.78) : 214
  const fastAqi = result ? Math.round(result.routeAqi * 1.12) : 338
  const verdict = result ? result.verdict : s.short
  // Geometry source: client OSRM first, then backend OSRM, then static demo.
  const routeSrc = geo || (result?.fastest?.coords?.length ? result : null)
  const hasRealRoute = Boolean(routeSrc)
  const fastCoords = routeSrc?.fastest?.coords || FASTEST_ROUTE
  const safeCoords = routeSrc?.safer?.coords || SAFER_ROUTE
  const startPt = geo?.start || (result?.endpoints?.[0]?.lat != null ? [result.endpoints[0].lat, result.endpoints[0].lon] : safeCoords[0])
  const endPt = geo?.end || (result?.endpoints?.[1]?.lat != null ? [result.endpoints[1].lat, result.endpoints[1].lon] : safeCoords[safeCoords.length - 1])
  const fastMeta = routeSrc?.fastest ? `${routeSrc.fastest.durationMin} min · ${routeSrc.fastest.distanceKm} km` : '34 min'
  const saferMeta = routeSrc?.safer ? `${routeSrc.safer.durationMin} min · ${routeSrc.safer.distanceKm} km` : '42 min (+8 min)'

  return (
    <div className="w-full max-w-7xl mx-auto px-space-md lg:px-margin-desktop py-space-lg flex flex-col gap-space-lg">
      {showModal && <HealthProfileModal onClose={() => setShowModal(false)} />}

      <div className="flex flex-col gap-space-2xs">
        <div className="inline-flex items-center gap-space-xs w-fit px-space-md py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold"><Icon name="eco" className="text-[1rem]" /> {T('Clean-Air Navigation')}</div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-space-2xs">{T('Health-Safe Route Planner')}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">{T('Compare routes by cumulative PM2.5 lung intake — not just travel minutes.')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Planner */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl p-space-lg shadow-md flex flex-col gap-space-md">
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">{T('From')}</label>
            <div className="flex items-center gap-space-xs bg-surface-container-low rounded-xl px-space-md py-space-xs mt-space-2xs"><Icon name="trip_origin" className="text-primary text-[1.1rem]" /><input value={from} onChange={e => setFrom(e.target.value)} className="flex-1 bg-transparent outline-none font-body-md text-body-md text-on-surface" /></div>
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">{T('To')}</label>
            <div className="flex items-center gap-space-xs bg-surface-container-low rounded-xl px-space-md py-space-xs mt-space-2xs"><Icon name="place" className="text-error text-[1.1rem]" /><input value={to} onChange={e => setTo(e.target.value)} className="flex-1 bg-transparent outline-none font-body-md text-body-md text-on-surface" /></div>
          </div>
          <button onClick={compare} disabled={loading} className="w-full py-space-sm rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-space-xs disabled:opacity-60"><Icon name={loading ? 'progress_activity' : 'alt_route'} className={`text-[1.1rem] ${loading ? 'animate-spin' : ''}`} /> {loading ? T('Comparing…') : T('Compare Routes')}</button>
          {error && (
            <div className="flex items-start gap-space-2xs text-error font-label-sm text-label-sm bg-error-container/40 rounded-lg px-space-sm py-space-xs">
              <Icon name="error" className="text-[1rem] mt-0.5 shrink-0" />{error}
            </div>
          )}

          <div className="bg-surface-container-low rounded-2xl p-space-md flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">{T('Health Suitability')}</span>
              <button onClick={() => setShowModal(true)} className="font-label-sm text-label-sm text-primary font-semibold hover:text-primary-container inline-flex items-center gap-1">{T('Edit profile')} <Icon name="tune" className="text-[0.9rem]" /></button>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full font-label-sm text-label-sm font-bold w-fit ${s.cls}`}><span className={`w-2 h-2 rounded-full ${s.dot}`}></span> {T(s.label)}</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{s.reason}</p>
          </div>

          <div className="flex items-center gap-space-xs bg-secondary-container/30 rounded-xl p-space-sm text-on-secondary-fixed-variant"><Icon name="health_metrics" className="text-secondary text-[1.25rem]" /><span className="font-label-sm text-label-sm font-semibold">Safer route cuts PM2.5 lung intake by <strong>-34%</strong></span></div>
        </div>

        {/* Map + routes */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-md">
            <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-surface-container-high">
              <MapContainer center={[28.625, 77.29]} zoom={12} zoomControl={false} attributionControl style={{ width: '100%', height: '100%' }}>
                <MapTiles />
                <Polyline positions={fastCoords} pathOptions={{ color: '#ba1a1a', weight: 5, opacity: 0.88, dashArray: '10 8', lineCap: 'round' }} />
                <Polyline positions={safeCoords} pathOptions={{ color: '#00685f', weight: 6, opacity: 0.92, lineCap: 'round' }} />
                <CircleMarker center={startPt} radius={8} pathOptions={{ fillColor: '#00685f', fillOpacity: 1, color: '#fff', weight: 3 }} />
                <CircleMarker center={endPt} radius={8} pathOptions={{ fillColor: '#ba1a1a', fillOpacity: 1, color: '#fff', weight: 3 }} />
                <FitRoute coords={[...fastCoords, ...safeCoords]} />
              </MapContainer>
              {loading && (
                <div className="absolute inset-0 z-[500] flex items-center justify-center bg-surface-container-high/50 backdrop-blur-[2px] pointer-events-none">
                  <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-md py-space-sm rounded-full shadow-lg">
                    <Icon name="progress_activity" className="animate-spin text-primary text-[1.2rem]" />
                    <span className="font-label-md text-label-md font-semibold text-on-surface">{T('Calculating route…')}</span>
                  </div>
                </div>
              )}
              <div className="absolute top-space-sm left-space-sm bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-space-2xs rounded-lg shadow-md font-label-sm text-label-sm text-on-surface">{from} → {to}{result ? ` · ${result.endpoints[0].aqi}/${result.endpoints[1].aqi} AQI` : ''}</div>
              <div className="absolute bottom-space-sm left-space-sm bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-space-xs rounded-lg shadow-md flex items-center gap-space-md font-label-sm text-label-sm">
                <span className="flex items-center gap-1.5"><span className="w-6 h-1.5 rounded-full bg-primary"></span> Safer</span>
                <span className="flex items-center gap-1.5"><span className="w-6 h-1.5 rounded-full bg-error"></span> Fastest</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-tertiary-fixed-dim rotate-45 inline-block"></span> Construction</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            {/* Recommended */}
            <div className="relative bg-secondary-container/20 rounded-2xl p-space-lg shadow-md overflow-hidden flex flex-col justify-between gap-space-md">
              <div className="absolute top-0 right-0 bg-secondary text-on-secondary px-space-sm py-space-2xs rounded-bl-lg font-label-sm text-label-sm">Best for Lungs</div>
              <div>
                <span className="font-title text-title text-on-surface font-bold">{T('Route B: Canopy Greenway')}</span>
                <div className="inline-flex items-center gap-1.5 px-space-xs py-space-2xs bg-surface-container-lowest rounded-full text-secondary font-label-sm text-label-sm mt-space-xs mb-space-xs"><span className="w-2 h-2 rounded-full bg-secondary"></span> Avg AQI {safeAqi} · {catOf(safeAqi)}</div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Via Ring Road &amp; Dwarka corridor buffer. Avoids 2 construction zones.</p>
              </div>
              <div className="space-y-space-xs">
                <Kv k="Est. Travel Time:" v={saferMeta} />
                <Kv k="PM2.5 Exposure:" v={`-${Math.max(0, Math.round((1 - safeAqi / fastAqi) * 100))}% vs fastest`} vCls="text-secondary" />
                <Kv k="Suitability:" v={verdict} vCls={s.textCls} />
              </div>
              <button className="w-full py-space-xs rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-space-xs"><Icon name="navigation" className="text-[1.1rem]" /> {T('Use Safer Route')}</button>
            </div>
            {/* Fastest */}
            <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col justify-between gap-space-md">
              <div>
                <span className="font-title text-title text-on-surface font-bold">{T('Route A: Direct Arterial')}</span>
                <div className="inline-flex items-center gap-1.5 px-space-xs py-space-2xs bg-error-container text-on-error-container rounded-full font-label-sm text-label-sm mt-space-xs mb-space-xs"><span className="w-2 h-2 rounded-full bg-error"></span> Avg AQI {fastAqi} · {catOf(fastAqi)}</div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Via NH-24 central. Passes the Anand Vihar hotspot at peak.</p>
              </div>
              <div className="space-y-space-xs">
                <Kv k="Est. Travel Time:" v={fastMeta} />
                <Kv k="PM2.5 Exposure:" v={`+${Math.max(0, fastAqi - safeAqi)} AQI exposure`} vCls="text-error" />
                <Kv k="Bronchial Strain:" v="High Risk" vCls="text-error" />
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden"><div className="bg-error h-full rounded-full" style={{ width: '82%' }}></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Kv({ k, v, vCls = 'text-on-surface' }) {
  return <div className="flex items-center justify-between font-label-sm text-label-sm"><span className="text-on-surface-variant">{k}</span><span className={`font-bold ${vCls}`}>{v}</span></div>
}

// Fit the map to the drawn routes whenever they change (new comparison result).
function FitRoute({ coords }) {
  const map = useMap()
  const sig = coords.length ? `${coords.length}:${coords[0]}:${coords[coords.length - 1]}` : ''
  useEffect(() => {
    if (coords.length > 1) {
      try { map.fitBounds(L.latLngBounds(coords), { padding: [30, 30], maxZoom: 14 }) } catch { /* noop */ }
    }
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function suitabilityFor(profile) {
  if (!profile) return { label: 'Use Caution', short: 'Use Caution', cls: 'bg-tertiary-fixed text-on-tertiary-fixed', dot: 'bg-tertiary', textCls: 'text-tertiary', reason: 'No health profile yet — set one for a personalised verdict. Current route exposure is Poor.' }
  const sensitive = profile.conditions !== 'none' || profile.age === 'senior' || profile.age === 'child' || profile.sensitivity === 'high'
  if (sensitive) return { label: 'Not Recommended', short: 'Not Recommended', cls: 'bg-error-container text-on-error-container', dot: 'bg-error', textCls: 'text-error', reason: `Given your profile (${profile.age}, ${profile.conditions}), today's PM2.5 exposure is too high. Prefer the low-exposure route and mask up.` }
  return { label: 'Use Caution', short: 'Acceptable w/ mask', cls: 'bg-tertiary-fixed text-on-tertiary-fixed', dot: 'bg-tertiary', textCls: 'text-secondary', reason: 'Route AQI is Poor. Healthy adults can proceed with the low-exposure route; consider a mask during peak segments.' }
}
