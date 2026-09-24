import { useState, useMemo, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { MapContainer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from '../components/Icon'
import MapTiles from '../components/MapTiles'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import { answer } from '../utils/assistant'
import { api } from '../api'
import { useCurrent, useLocations } from '../useLive'

// Delhi-NCR areas with live AQI (search source for the hero) — comprehensive coverage
const AREAS = [
  // Delhi
  { name: 'Anand Vihar', aqi: 284 }, { name: 'Jahangirpuri', aqi: 318 }, { name: 'Rohini', aqi: 262 },
  { name: 'Wazirpur', aqi: 305 }, { name: 'Mundka', aqi: 312 }, { name: 'Bawana', aqi: 322 },
  { name: 'Narela', aqi: 300 }, { name: 'Ashok Vihar', aqi: 281 }, { name: 'Punjabi Bagh', aqi: 289 },
  { name: 'ITO', aqi: 274 }, { name: 'Mandir Marg', aqi: 189 }, { name: 'Lodhi Road', aqi: 142 },
  { name: 'R.K. Puram', aqi: 231 }, { name: 'Sirifort', aqi: 214 }, { name: 'Dwarka Sec-8', aqi: 226 },
  { name: 'Najafgarh', aqi: 198 }, { name: 'IGI Airport', aqi: 188 }, { name: 'Aya Nagar', aqi: 176 },
  { name: 'Nehru Nagar', aqi: 276 }, { name: 'Patparganj', aqi: 268 }, { name: 'Sonia Vihar', aqi: 258 },
  { name: 'Vivek Vihar', aqi: 297 }, { name: 'Okhla Ph-II', aqi: 241 }, { name: 'Alipur', aqi: 244 },
  { name: 'Shadipur', aqi: 265 }, { name: 'Pusa', aqi: 205 }, { name: 'Sri Aurobindo Marg', aqi: 196 },
  { name: 'North Campus', aqi: 252 }, { name: 'CRRI Mathura Road', aqi: 233 }, { name: 'Burari', aqi: 271 },
  { name: 'Chandni Chowk', aqi: 279 }, { name: 'Karol Bagh', aqi: 248 }, { name: 'Connaught Place', aqi: 182 },
  { name: 'Lajpat Nagar', aqi: 222 }, { name: 'Saket', aqi: 208 }, { name: 'Vasant Kunj', aqi: 184 },
  { name: 'Janakpuri', aqi: 236 }, { name: 'Rajouri Garden', aqi: 243 }, { name: 'Pitampura', aqi: 269 },
  { name: 'Model Town', aqi: 257 }, { name: 'Civil Lines', aqi: 254 }, { name: 'Kashmere Gate', aqi: 288 },
  { name: 'Preet Vihar', aqi: 273 }, { name: 'Mayur Vihar', aqi: 264 }, { name: 'Dilshad Garden', aqi: 291 },
  { name: 'Seelampur', aqi: 296 }, { name: 'Nangloi', aqi: 302 }, { name: 'Uttam Nagar', aqi: 247 },
  { name: 'Palam', aqi: 191 }, { name: 'Mahipalpur', aqi: 187 }, { name: 'Chhatarpur', aqi: 199 },
  { name: 'Mehrauli', aqi: 203 }, { name: 'Tughlakabad', aqi: 229 }, { name: 'Kalkaji', aqi: 217 },
  { name: 'Greater Kailash', aqi: 211 }, { name: 'Defence Colony', aqi: 219 }, { name: 'Hauz Khas', aqi: 206 },
  { name: 'Green Park', aqi: 209 }, { name: 'Malviya Nagar', aqi: 213 }, { name: 'Sarita Vihar', aqi: 238 },
  { name: 'Jasola', aqi: 234 },
  // NCR
  { name: 'Gurugram', aqi: 246 }, { name: 'Manesar', aqi: 232 }, { name: 'Faridabad', aqi: 273 },
  { name: 'Ballabhgarh', aqi: 262 }, { name: 'Noida Sec-62', aqi: 259 }, { name: 'Noida Sec-125', aqi: 251 },
  { name: 'Greater Noida', aqi: 238 }, { name: 'Ghaziabad', aqi: 305 }, { name: 'Vasundhara', aqi: 287 },
  { name: 'Indirapuram', aqi: 279 }, { name: 'Loni', aqi: 328 }, { name: 'Hapur', aqi: 253 },
  { name: 'Sonipat', aqi: 266 }, { name: 'Panipat', aqi: 258 }, { name: 'Rohtak', aqi: 241 },
  { name: 'Bahadurgarh', aqi: 289 }, { name: 'Jhajjar', aqi: 245 }, { name: 'Rewari', aqi: 224 },
  { name: 'Bhiwadi', aqi: 271 }, { name: 'Palwal', aqi: 236 }, { name: 'Meerut', aqi: 263 },
  { name: 'Baghpat', aqi: 256 }, { name: 'Bulandshahr', aqi: 249 }, { name: 'Karnal', aqi: 247 },
  { name: 'Alwar', aqi: 218 },
]
function band(aqi) {
  if (aqi <= 50) return { label: 'GOOD', pill: 'bg-secondary-container text-on-secondary-container', dot: 'bg-secondary' }
  if (aqi <= 100) return { label: 'SATISFACTORY', pill: 'bg-secondary-container text-on-secondary-container', dot: 'bg-secondary' }
  if (aqi <= 200) return { label: 'MODERATE', pill: 'bg-tertiary-fixed text-on-tertiary-fixed', dot: 'bg-tertiary' }
  if (aqi <= 300) return { label: 'POOR', pill: 'bg-error-container text-on-error-container', dot: 'bg-error' }
  if (aqi <= 400) return { label: 'VERY POOR', pill: 'bg-error-container text-on-error-container', dot: 'bg-error' }
  return { label: 'SEVERE', pill: 'bg-error-container text-on-error-container', dot: 'bg-error' }
}
// Short category tag + pill classes for AreaCards, derived from a live AQI value.
function tagFor(aqi) {
  if (aqi <= 100) return { tag: 'Sat.', tagCls: 'bg-secondary-container text-on-secondary-fixed-variant' }
  if (aqi <= 200) return { tag: 'Mod', tagCls: 'bg-tertiary-fixed text-on-tertiary-fixed' }
  if (aqi <= 300) return { tag: 'Poor', tagCls: 'bg-tertiary-container text-on-tertiary-container' }
  return { tag: 'V.Poor', tagCls: 'bg-error-container text-on-error-container' }
}
// Badge/chip/dot classes for map markers, derived from a live AQI value.
function markerStyleFor(aqi) {
  if (aqi <= 100) return { badge: 'bg-secondary-container text-on-secondary-container', chip: 'bg-surface-container-lowest text-secondary', dot: 'bg-secondary' }
  if (aqi <= 200) return { badge: 'bg-tertiary-fixed text-on-tertiary-fixed', chip: 'bg-surface-container-lowest text-on-surface', dot: 'bg-tertiary' }
  return { badge: 'bg-error text-on-error', chip: 'bg-surface-container-lowest text-error', dot: 'bg-surface-container-lowest' }
}
// Home map-preview markers: fixed positions, real AQI overlaid where the station
// exists in the live feed (by slug), otherwise the static seed value.
const PREVIEW_MARKERS = [
  { cls: 'top-[28%] right-[22%]', slug: 'anand-vihar', name: 'Anand Vihar', tipName: 'Anand Vihar ISBT', ping: true, fallback: 284 },
  { cls: 'top-[16%] left-[26%]', slug: 'rohini', name: 'Rohini', tipName: 'Rohini Sector 16', fallback: 210 },
  { cls: 'top-[48%] left-[44%]', slug: 'ito', name: 'ITO', tipName: 'ITO Central', fallback: 182 },
  { cls: 'top-[62%] left-[46%]', slug: 'rk-puram', name: 'R.K. Puram', tipName: 'R.K. Puram', fallback: 145 },
  { cls: 'bottom-[22%] right-[32%]', slug: 'faridabad', name: 'Faridabad', tipName: 'Faridabad Sec 30', fallback: 295 },
  { cls: 'bottom-[16%] left-[16%]', slug: 'gurugram', name: 'Gurugram', tipName: 'Gurugram', fallback: 164 },
]

export default function Home() {
  const { location, lang, setLocation } = useApp()
  const [reply, setReply] = useState(null)
  const [q, setQ] = useState('')
  const [area, setArea] = useState('Anand Vihar')
  const [areaQ, setAreaQ] = useState('')
  const [mapView, setMapView] = useState('aqi')
  const T = (s) => t(s, lang)
  const ask = (text) => { const t = (text ?? q).trim(); if (t) setReply(answer(t, { location })) }

  const sel = AREAS.find(a => a.name.toLowerCase() === area.toLowerCase()) || AREAS[0]
  // Live current conditions for the selected area (nearest modelled station);
  // falls back to the static seed value until the backend responds.
  const cur = useCurrent(sel.name)
  const { byId, list } = useLocations()
  const aqiVal = cur?.aqi ?? sel.aqi
  const b = band(aqiVal)
  const pm25 = cur?.pollutants?.pm25 != null ? Math.round(cur.pollutants.pm25) : Math.round(sel.aqi * 0.63)
  const pm10 = cur?.pollutants?.pm10 != null ? Math.round(cur.pollutants.pm10) : Math.round(sel.aqi * 1.08)
  const wx = cur?.weather
  const ringOffset = (515.2 * (1 - Math.min(aqiVal, 500) / 500)).toFixed(1)
  const micro = [
    ['PM2.5', String(pm25), 'µg/m³', '24h avg', 'text-error'],
    ['PM10', String(pm10), 'µg/m³', 'Elevated', 'text-tertiary'],
    ['Temp', wx ? `${wx.temp}°C` : '24.6°C', '', 'Ambient', 'text-outline'],
    ['Humidity', wx ? `${wx.humidity}%` : '62%', '', 'Stable', 'text-secondary'],
    ['Wind', wx ? String(wx.wind_speed) : '4.8', 'km/h', 'NW', 'text-outline'],
    ['Barometer', '1014', 'hPa', 'Normal', 'text-secondary'],
  ]
  const chooseArea = (name) => {
    const hit = AREAS.find(a => a.name.toLowerCase() === (name || '').trim().toLowerCase())
    if (hit) { setArea(hit.name); setLocation(hit.name); setAreaQ('') }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-space-md lg:px-margin-desktop py-space-lg flex flex-col gap-space-xl">
      {/* Area search */}
      <div className="w-full">
        <div className="relative flex items-center bg-surface-container-lowest rounded-full shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] p-1.5 max-w-3xl">
          <Icon name="search" className="text-outline ml-space-md text-[22px] shrink-0" />
          <input list="delhi-areas" value={areaQ}
            onChange={e => { const v = e.target.value; setAreaQ(v); if (AREAS.some(a => a.name === v)) chooseArea(v) }}
            onKeyDown={e => { if (e.key === 'Enter') chooseArea(areaQ) }}
            className="w-full bg-transparent px-space-sm py-space-xs text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none"
            placeholder={T('Search your area in Delhi-NCR (e.g. Rohini, Dwarka, Noida)…')} />
          <datalist id="delhi-areas">{[...AREAS].sort((a, b) => a.name.localeCompare(b.name)).map(a => <option key={a.name} value={a.name} />)}</datalist>
        </div>
        <div className="flex items-center flex-wrap gap-space-xs mt-space-sm text-on-surface-variant font-label-sm text-label-sm">
          <span className="text-outline">{T('Suggested:')}</span>
          {['Rohini', 'Dwarka Sec-8', 'Noida Sec-62', 'Gurugram', 'Lodhi Road'].map(a => (
            <button key={a} onClick={() => chooseArea(a)} className="px-space-sm py-1 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface">{a}</button>
          ))}
        </div>
      </div>

      {/* Hero Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
        {/* Left: Live Sensor Meter Card */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">{T('Primary Ambient Station')}</span>
                <div className="flex items-center gap-space-xs mt-1">
                  <Icon name="location_on" className="text-primary text-[1.25rem]" fill />
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{sel.name}, Delhi-NCR</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                Live • 12m ago
              </span>
            </div>

            {/* Radial AQI */}
            <div className="relative flex items-center justify-center my-space-lg">
              <svg className="w-56 h-56 -rotate-90" viewBox="0 0 200 200">
                <circle className="text-surface-container" cx="100" cy="100" fill="transparent" r="82" stroke="currentColor" strokeWidth="15" />
                <circle className="transition-all duration-1000 ease-out" cx="100" cy="100" fill="transparent" r="82" stroke="url(#aqiGradient)" strokeDasharray="515.2" strokeDashoffset={ringOffset} strokeLinecap="round" strokeWidth="15" />
                <defs>
                  <linearGradient id="aqiGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#ba1a1a" /><stop offset="30%" stopColor="#a36700" />
                    <stop offset="65%" stopColor="#ffb95f" /><stop offset="100%" stopColor="#4edea3" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-label-sm text-label-sm text-outline uppercase font-semibold">{T('National AQI')}</span>
                <span className="font-metric-stat text-metric-stat font-extrabold text-on-surface leading-none mt-1">{aqiVal}</span>
                <div className={`mt-2 inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full font-label-sm text-label-sm font-bold ${b.pill}`}>
                  <span className={`w-2 h-2 rounded-full ${b.dot}`}></span>{T(b.label)}
                </div>
              </div>
            </div>

            {/* Weather forecast (below AQI) */}
            <AqiTempForecast aqi={aqiVal} lang={lang} areaName={sel.name} />
          </div>

          {/* Micro-stats */}
          <div className="grid grid-cols-3 gap-space-xs mt-space-md">
            {micro.map(([k,val,unit,sub,cls]) => (
              <div key={k} className="p-space-xs rounded-lg bg-surface-container-low text-center flex flex-col items-center">
                <span className="font-label-sm text-label-sm text-outline">{k}</span>
                <span className="font-title text-title font-bold text-on-surface">{val}{unit && <span className="text-[0.65rem] text-outline font-normal"> {unit}</span>}</span>
                <span className={`font-label-sm text-[0.7rem] font-semibold ${cls}`}>{sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Map */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-md shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between pb-space-sm z-10">
            <div className="flex items-center gap-space-xs">
              <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center"><Icon name="map" className="text-[1.25rem]" /></div>
              <div>
                <h2 className="font-title text-title font-bold text-on-surface">{T('Hyper-Local Delhi-NCR Atmospheric Map')}</h2>
                <p className="font-body-sm text-body-sm text-outline">{T('Real-time DPCC stations & municipal dust mitigation zones')}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-space-2xs bg-surface-container-low p-1 rounded-full">
              {[['aqi', 'AQI Heat'], ['dust', 'Dust / PM10'], ['wind', 'Wind Vector']].map(([v, label]) => (
                <button key={v} onClick={() => setMapView(v)} className={`px-space-xs py-1 rounded-full font-label-sm text-label-sm transition-colors ${mapView === v ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface font-semibold'}`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="relative w-full h-[400px] lg:h-full min-h-[380px] bg-surface-container rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
            <MapContainer center={[28.63, 77.22]} zoom={11} zoomControl={false} attributionControl={false}
              dragging={false} touchZoom={false} scrollWheelZoom={false} doubleClickZoom={false} keyboard={false}
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 0 }}>
              <MapTiles />
            </MapContainer>
            <div className="absolute inset-0 pointer-events-none z-10">
              {mapView === 'aqi' && (<>
                <div className="absolute top-1/4 right-1/4 w-48 h-48 rounded-full bg-error/15 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/3 left-1/3 w-64 h-64 rounded-full bg-secondary/15 blur-3xl"></div>
              </>)}
              {mapView === 'dust' && (<>
                <div className="absolute top-[44%] left-[54%] w-40 h-40 rounded-full bg-tertiary/30 blur-3xl"></div>
                <div className="absolute top-[58%] right-[38%] w-36 h-36 rounded-full bg-tertiary/30 blur-3xl"></div>
                <div className="absolute bottom-[28%] left-[22%] w-44 h-44 rounded-full bg-tertiary/30 blur-3xl"></div>
                <div className="absolute top-[16%] left-[30%] w-40 h-40 rounded-full bg-tertiary-container/25 blur-3xl"></div>
              </>)}
              {mapView === 'wind' && (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                  <defs>
                    <marker id="homewv" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto"><path d="M0,0 L5,3 L0,6 Z" fill="#00685f" opacity="0.75" /></marker>
                  </defs>
                  {[40, 100, 160, 220, 270].map((y, i) => (
                    <path key={i} d={`M -20,${y} C 120,${y - 25} 240,${y + 25} 420,${y - 15}`} fill="none" stroke="#00685f" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="8 10" markerEnd="url(#homewv)">
                      <animate attributeName="stroke-dashoffset" from="0" to="-36" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                    </path>
                  ))}
                </svg>
              )}
            </div>

            {/* Markers — real AQI overlaid from the live feed where available */}
            {PREVIEW_MARKERS.map(m => {
              const st = byId?.[m.slug]
              const v = st?.aqi ?? m.fallback
              const s = markerStyleFor(v)
              const cat = band(v).label.charAt(0) + band(v).label.slice(1).toLowerCase()
              return (
                <Marker key={m.slug} cls={m.cls} ping={m.ping} badge={s.badge} chip={s.chip} dot={s.dot}
                  name={m.name} val={String(v)} tipName={m.tipName}
                  tip={`AQI ${v} • ${cat}${st?.pollutants?.pm25 != null ? ` • PM2.5 ${Math.round(st.pollutants.pm25)} µg/m³` : ''}`} />
              )
            })}

            {/* Construction hazards */}
            <Hazard cls="top-[44%] left-[54%]" bounce title="Pragati Tunnel Refurb" note="PM10 elevated (+68 µg/m³). Water misting operational." />
            <Hazard cls="top-[58%] right-[40%]" title="Barapullah Elevated Ph-3" note="Active girder placement; unpaved slip road dust alert." />
            <Hazard cls="bottom-[28%] left-[24%]" title="Dwarka Expwy Sec 21" note="Underpass drainage excavation; avoid cycling track." />

            {/* Legend */}
            <div className="absolute bottom-space-xs right-space-xs bg-surface-container-lowest/90 backdrop-blur-md p-space-xs rounded-lg shadow-md flex flex-col gap-1 text-[0.7rem] z-20">
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[0.65rem]">AQI Scale</span>
              <div className="flex items-center gap-1 text-[0.65rem] font-medium text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span> 0-50
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-container"></span> 51-100
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim"></span> 101-200
                <span className="w-2.5 h-2.5 rounded-full bg-error"></span> 201-300
                <span className="w-2.5 h-2.5 rounded-full bg-inverse-surface"></span> 300+
              </div>
              <div className="flex items-center gap-1 text-outline font-semibold pt-1 border-t border-surface-container text-[0.65rem]">
                <Icon name="construction" className="text-tertiary text-[0.875rem]" /> Active Dust Zone
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-space-xs pt-space-sm">
            <div className="flex items-center gap-space-xs text-outline font-body-sm text-body-sm">
              <Icon name="satellite_alt" className="text-[1.125rem]" /><span>INSAT-3DR &amp; 38 Ground Stations calibrated hourly</span>
            </div>
            <NavLink to="/map" className="font-label-sm text-label-sm text-primary font-bold hover:underline inline-flex items-center gap-1">
              {T('Expand Full GIS Screen')}<Icon name="open_in_full" className="text-[1rem]" />
            </NavLink>
          </div>
        </div>
      </div>

      {/* 4 Intelligence Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline font-semibold uppercase">{T("Today's Curve")}</span><Icon name="trending_up" className="text-tertiary text-[1.25rem]" /></div>
          <div className="my-space-xs">
            <div className="flex items-baseline gap-2"><span className="font-headline-md text-headline-md font-bold text-on-surface">265</span><span className="font-label-sm text-label-sm text-error font-semibold">Peak at 9:00 PM</span></div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Temperature inversion after sunset will trap surface particulates.</p>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1"><div className="bg-gradient-to-r from-secondary via-tertiary-fixed-dim to-error h-full rounded-full" style={{ width: '78%' }}></div></div>
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline font-semibold uppercase">{T('Tomorrow')}</span><Icon name="cloud_sync" className="text-primary text-[1.25rem]" /></div>
          <div className="my-space-xs">
            <div className="flex items-baseline gap-2"><span className="font-headline-md text-headline-md font-bold text-on-surface">220 - 245</span><span className="font-label-sm text-label-sm text-secondary font-semibold">Marginal Relief</span></div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Light westerly winds (8 km/h) expected to disperse dense smog layer.</p>
          </div>
          <div className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-primary"><Icon name="air" className="text-[1rem]" /> 8-12 km/h ventilation index</div>
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border-l-4 border-secondary hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm text-secondary font-bold uppercase">{T('Optimal Window')}</span><Icon name="schedule" className="text-secondary text-[1.25rem]" /></div>
          <div className="my-space-xs"><span className="font-headline-md text-headline-md font-bold text-on-surface">1:00 PM – 4:00 PM</span><p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Solar radiation expands boundary layer. Best interval for essential errands.</p></div>
          <div className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md bg-surface-container text-on-secondary-fixed-variant text-[0.75rem] font-semibold w-fit"><span className="w-2 h-2 rounded-full bg-secondary"></span> AQI dips to 180-195</div>
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border-l-4 border-error hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm text-error font-bold uppercase">{T('Outdoor Cardio')}</span><Icon name="directions_run" className="text-error text-[1.25rem]" /></div>
          <div className="my-space-xs"><span className="font-headline-md text-headline-md font-bold text-error">{T('Not Recommended')}</span><p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Deep breathing during morning jogging will multiply PM2.5 lung deposition by 4.2x.</p></div>
          <span className="text-outline font-label-sm text-label-sm font-semibold">Switch to indoor workouts</span>
        </div>
      </div>

      {/* Regional Ambient Breakdown */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
          <div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{T('Regional Ambient Breakdown')}</h2>
            <p className="font-body-sm text-body-sm text-outline">{T('Hourly telemetry across Delhi, Noida, and Gurugram air monitoring stations')}</p>
          </div>
          <button className="inline-flex items-center gap-1 px-space-md py-space-xs rounded-full bg-surface-container-high text-primary font-label-md text-label-md font-bold hover:bg-surface-container transition-colors self-start sm:self-auto"><Icon name="add_circle" className="text-[1.125rem]" /> {T('Add More Areas')}</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-space-sm">
          {list && list.length
            ? [...list].sort((a, b) => b.aqi - a.aqi).slice(0, 6).map((l) => {
                const tg = tagFor(l.aqi)
                return <AreaCard key={l.location} name={l.name} val={String(l.aqi)} tag={tg.tag} tagCls={tg.tagCls} delta="—" flat highlight={l.aqi > 300} />
              })
            : (<>
                <AreaCard name="Lodhi Road" val="145" tag="Mod" tagCls="bg-secondary-container text-on-secondary-fixed-variant" delta="-12" down />
                <AreaCard name="Pusa / Central" val="168" tag="Sens." tagCls="bg-tertiary-fixed text-on-tertiary-fixed" delta="+8" />
                <AreaCard name="IGI Airport (T3)" val="192" tag="Sens." tagCls="bg-tertiary-fixed text-on-tertiary-fixed" delta="0" flat />
                <AreaCard name="Anand Vihar" val="284" tag="Poor" tagCls="bg-error-container text-on-error-container" delta="+24" highlight />
                <AreaCard name="Jahangirpuri" val="272" tag="Poor" tagCls="bg-error-container text-on-error-container" delta="+15" />
                <AreaCard name="Noida Sec 62" val="235" tag="Poor" tagCls="bg-tertiary-container text-on-tertiary-container" delta="-6" down />
              </>)}
        </div>
      </div>

      {/* Live national city AQI ticker (CPCB CCR style) */}
      <div className="w-full bg-surface-container-lowest rounded-2xl shadow-md overflow-hidden">
        <div className="flex items-center justify-between gap-space-sm px-space-md py-space-sm border-b border-surface-container">
          <div className="flex items-center gap-space-xs">
            <span className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0"><Icon name="public" className="text-[1.25rem]" /></span>
            <div>
              <h3 className="font-title text-title font-bold text-on-surface">{T('Live City Air Quality Index')}</h3>
              <p className="font-body-sm text-body-sm text-outline">{T('Real-time AQI across Indian cities · hover to pause')}</p>
            </div>
          </div>
          <a href="https://airquality.cpcb.gov.in/ccr/#/" target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-1 font-label-sm text-label-sm text-primary font-bold hover:underline shrink-0">CPCB CCR<Icon name="open_in_new" className="text-[1rem]" /></a>
        </div>
        <CityTicker />
      </div>

      {/* Quick Entry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-md flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold w-fit mb-space-2xs"><Icon name="eco" className="text-[1rem]" /> Clean-Air Navigation</div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{T('Health-Safe Commute Planner')}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-md">Compare routes by cumulative toxic particulate intake rather than just travel minutes. Avoid arterial construction bottlenecks and diesel plumes.</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center shrink-0"><Icon name="alt_route" className="text-[1.5rem]" /></div>
          </div>
          <div className="mt-space-lg pt-space-md border-t border-surface-container flex flex-wrap items-center justify-between gap-space-xs">
            <div className="flex items-center gap-space-xs text-body-sm text-outline"><Icon name="health_metrics" className="text-secondary text-[1.25rem]" /><span>Average PM2.5 lung reduction: <strong>-34%</strong></span></div>
            <NavLink to="/routes" className="inline-flex items-center gap-2 px-space-md py-space-xs rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold hover:bg-primary-container shadow-sm transition-all group-hover:translate-x-1">{T('Plan Clean-Air Route')}<Icon name="arrow_forward" className="text-[1.125rem]" /></NavLink>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-md flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold w-fit mb-space-2xs"><Icon name="shield" className="text-[1rem]" /> Personalized Shield</div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{T('Asthma, Child & Elderly Shield')}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-md">Configure sensitivity profiles to receive automated SMS/WhatsApp alerts before local spikes breach safe pulmonary thresholds.</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center shrink-0"><Icon name="vital_signs" className="text-[1.5rem]" /></div>
          </div>
          <div className="mt-space-lg pt-space-md border-t border-surface-container flex flex-wrap items-center justify-between gap-space-xs">
            <div className="flex items-center gap-space-xs text-body-sm text-outline"><Icon name="verified_user" className="text-primary text-[1.25rem]" /><span>31,400+ protected citizens in NCR</span></div>
            <NavLink to="/assistant" className="inline-flex items-center gap-2 px-space-md py-space-xs rounded-full bg-surface-container-high text-primary font-label-md text-label-md font-bold hover:bg-surface-container transition-all">{T('Setup Protection Profile')}<Icon name="arrow_forward" className="text-[1.125rem]" /></NavLink>
          </div>
        </div>
      </div>

    </div>
  )
}

// Delhi-NCR AQI for the live ticker (representative CPCB-style values)
const CITIES = [
  ['Delhi', 284], ['Noida', 259], ['Gurugram', 246], ['Faridabad', 273], ['Ghaziabad', 305],
  ['Greater Noida', 238], ['Sonipat', 266], ['Rohini', 262], ['Dwarka', 226], ['Anand Vihar', 284],
  ['Jahangirpuri', 318], ['Wazirpur', 305], ['Bawana', 322], ['Narela', 300], ['ITO', 274],
  ['Lodhi Road', 142], ['R.K. Puram', 231], ['Loni', 328], ['Indirapuram', 279], ['Vasundhara', 287],
  ['Bahadurgarh', 289], ['Manesar', 232], ['Ballabhgarh', 262],
]

function CityTicker() {
  const items = CITIES.map(([city, aqi]) => {
    const b = band(aqi)
    const tone = b.dot.replace('bg-', 'text-')
    return (
      <div key={city} className="flex items-center gap-2 px-space-md py-space-xs shrink-0">
        <span className={`w-2.5 h-2.5 rounded-full ${b.dot}`}></span>
        <span className="font-semibold text-on-surface text-body-sm whitespace-nowrap">{city}</span>
        <span className={`font-extrabold text-body-sm ${tone}`}>{aqi}</span>
        <span className="text-outline font-label-sm text-label-sm capitalize whitespace-nowrap">{b.label.toLowerCase()}</span>
        <span className="text-outline-variant px-1">•</span>
      </div>
    )
  })
  return (
    <div className="ticker-mask overflow-hidden py-space-2xs">
      <div className="ticker-track flex w-max">{items}{items}</div>
    </div>
  )
}

function AqiTempForecast({ aqi, lang, areaName }) {
  const T = (s) => t(s, lang)
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const [live, setLive] = useState(null)     // model AQI values, indexed by hour
  const [explain, setExplain] = useState(null)
  const [showWhy, setShowWhy] = useState(false)

  // Fetch the bias-corrected 72h forecast + SHAP explanation from the backend.
  // Fails soft: if the API is down, `live` stays null and the local model shows.
  useEffect(() => {
    let alive = true
    setShowWhy(false)
    api.forecast(areaName).then((d) => { if (alive && d?.forecast) setLive(d) })
    api.explain(areaName).then((d) => { if (alive && d?.drivers?.length) setExplain(d) })
    return () => { alive = false }
  }, [areaName])

  const localHourly = useMemo(() => {
    const now = new Date(); const curH = now.getHours()
    const base = aqi - Math.cos(((curH - 4) / 24) * 2 * Math.PI) * 38
    const dayType = [0, 0, 1, 3] // 0 clear, 1 partly cloudy, 3 rain — per day
    const out = []
    for (let h = 0; h < 72; h++) {
      const dt = new Date(now.getTime() + h * 3600e3)
      const hod = dt.getHours()
      const dayIdx = Math.floor((curH + h) / 24) % dayType.length
      const a = Math.max(50, Math.min(400, Math.round(base + Math.cos(((hod - 4) / 24) * 2 * Math.PI) * 38 - h * 0.15 + Math.sin(h / 7) * 8)))
      const tp = Math.round(24 + Math.cos(((hod - 15) / 24) * 2 * Math.PI) * 6)
      const night = hod < 6 || hod >= 19
      const dtType = dayType[dayIdx]
      const ic = night ? (dtType === 3 ? 'rainy' : 'clear_night') : dtType === 0 ? 'sunny' : dtType === 1 ? 'partly_cloudy_day' : 'rainy'
      out.push({ dt, hod, a, tp, ic })
    }
    return out
  }, [aqi])

  // Overlay real model AQI onto the tiles (temperature keeps the diurnal proxy).
  const hourly = useMemo(() => {
    if (!live?.forecast) return localHourly
    return localHourly.map((p, i) => {
      const f = live.forecast[i]
      return f ? { ...p, a: f.aqi } : p
    })
  }, [localHourly, live])
  const days = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const grouped = []
    hourly.forEach((p) => {
      const dayStart = new Date(p.dt.getFullYear(), p.dt.getMonth(), p.dt.getDate()).getTime()
      const diff = Math.round((dayStart - start) / 86400000)
      const prefix = diff === 0 ? 'Today' : diff === 1 ? T('Tomorrow') : wd[p.dt.getDay()]
      const label = `${prefix}, ${p.dt.getDate()} ${months[p.dt.getMonth()]}`
      const last = grouped[grouped.length - 1]
      if (!last || last.key !== dayStart) grouped.push({ key: dayStart, label, hours: [p] })
      else last.hours.push(p)
    })
    return grouped
  }, [hourly])

  return (
    <div className="bg-surface-container-low rounded-lg p-space-md">
      <div className="flex items-center justify-between mb-space-xs gap-space-xs">
        <div className="flex items-center gap-space-xs text-tertiary min-w-0">
          <Icon name="timeline" className="text-[1.25rem] shrink-0" />
          <span className="font-title text-title font-semibold text-on-surface truncate">{T('AQI & Temperature Forecast')}</span>
        </div>
        <span className="font-label-sm text-label-sm text-outline shrink-0">{T('Next 72 hours')}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollSnapType: 'x proximity' }}>
        {days.map((day, dayIdx) => (
          <div key={day.key} className="flex flex-col gap-1.5 shrink-0">
            <div className="sticky left-1 z-10 w-fit px-2 py-0.5 rounded-full bg-surface-container-lowest/95 backdrop-blur text-[0.62rem] font-bold text-primary shadow-sm">
              {day.label}
            </div>
            <div className="flex gap-1.5">
              {day.hours.map((p, idx) => {
                const i = hourly.indexOf(p)
                const b = band(p.a); const tone = b.dot.replace('bg-', 'text-')
                const hr = (p.hod % 12) || 12; const ap = p.hod < 12 ? 'AM' : 'PM'
                const label = i === 0 ? T('Now') : `${hr} ${ap}`
                return (
                  <div key={`${day.key}-${idx}`} className={`flex flex-col items-center gap-1 shrink-0 w-[52px] py-2 rounded-xl ${i === 0 ? 'bg-primary/10 ring-1 ring-primary/30' : p.hod === 0 || (dayIdx > 0 && idx === 0) ? 'bg-surface-container-high' : ''}`} style={{ scrollSnapAlign: 'start' }}>
                    <span className={`text-[0.6rem] font-semibold ${p.hod === 0 && i !== 0 ? 'text-primary' : 'text-on-surface-variant'}`}>{label}</span>
                    <span className={`text-[0.85rem] font-extrabold leading-none mt-0.5 ${tone}`}>{p.a}</span>
                    <span className="text-[0.5rem] text-outline uppercase tracking-wide">AQI</span>
                    <span className="text-[0.68rem] font-bold text-on-surface mt-0.5">{p.tp}°</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Stage 6 — "Why this forecast?" SHAP panel (only shown when the model is live) */}
      {explain && (
        <div className="mt-space-xs">
          <button onClick={() => setShowWhy((v) => !v)}
            className="flex items-center gap-1.5 text-label-sm font-label-sm font-semibold text-primary hover:opacity-80">
            <Icon name="lightbulb" className="text-[1.05rem]" />
            {T('Why this forecast?')}
            <Icon name={showWhy ? 'expand_less' : 'expand_more'} className="text-[1.05rem]" />
          </button>
          {showWhy && (
            <div className="mt-space-2xs rounded-lg bg-surface-container-high p-space-sm fade-up">
              <p className="text-body-sm font-body-sm text-on-surface-variant mb-space-2xs">{explain.narrative}</p>
              <div className="flex flex-col gap-1">
                {explain.drivers.slice(0, 4).map((d) => (
                  <div key={d.feature} className="flex items-center gap-space-2xs text-label-sm font-label-sm">
                    <Icon name={d.direction === 'raises' ? 'arrow_upward' : 'arrow_downward'}
                      className={`text-[0.95rem] ${d.direction === 'raises' ? 'text-error' : 'text-secondary'}`} />
                    <span className="text-on-surface flex-1 truncate">{d.label}</span>
                    <span className="text-outline tabular-nums">{d.contribution > 0 ? '+' : ''}{d.contribution}</span>
                  </div>
                ))}
              </div>
              <p className="mt-space-2xs text-[0.6rem] text-outline uppercase tracking-wide">
                {T('SHAP feature attribution · XGBoost')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Forecast72({ aqi, lang }) {
  const T = (s) => t(s, lang)
  const data = useMemo(() => {
    const now = new Date(); const curH = now.getHours()
    const d0 = Math.cos(((curH - 4) / 24) * 2 * Math.PI) * 40
    const base = aqi - d0
    const arr = []
    for (let h = 0; h <= 72; h += 3) {
      const hod = (curH + h) % 24
      const diurnal = Math.cos(((hod - 4) / 24) * 2 * Math.PI) * 40
      const trend = -h * 0.18 + Math.sin(h / 9) * 12
      const a = Math.max(45, Math.min(420, Math.round(base + diurnal + trend)))
      const temp = Math.round((24 + Math.cos(((hod - 15) / 24) * 2 * Math.PI) * 6) * 10) / 10
      arr.push({ h, aqi: a, temp, at: new Date(now.getTime() + h * 3600e3) })
    }
    return arr
  }, [aqi])

  const W = 820, H = 240, mL = 34, mR = 34, mT = 14, mB = 26
  const x0 = mL, x1 = W - mR, yT = mT, yB = H - mB
  const cw = x1 - x0, ch = yB - yT, N = data.length
  const X = (i) => x0 + (i / (N - 1)) * cw
  const AY = (v) => yB - (Math.min(v, 420) / 420) * ch
  const TY = (v) => yB - ((Math.min(Math.max(v, 8), 40) - 8) / 32) * ch
  const aqiPts = data.map((d, i) => `${X(i)},${AY(d.aqi).toFixed(1)}`).join(' ')
  const aqiArea = `${x0},${yB} ${aqiPts} ${x1},${yB}`
  const tempPts = data.map((d, i) => `${X(i)},${TY(d.temp).toFixed(1)}`).join(' ')

  const peak = data.reduce((m, d) => (d.aqi > m.aqi ? d : m), data[0])
  const low = data.reduce((m, d) => (d.aqi < m.aqi ? d : m), data[0])
  const tmin = Math.min(...data.map(d => d.temp)), tmax = Math.max(...data.map(d => d.temp))
  const bp = band(peak.aqi), bl = band(low.aqi)
  const xLabels = [[0, T('Now')], [4, '+12h'], [8, '+24h'], [12, '+36h'], [16, '+48h'], [20, '+60h'], [24, '+72h']]

  return (
    <section>
      <div className="bg-surface-container-lowest rounded-xl p-space-md lg:p-space-lg shadow-md">
        <div className="flex items-start justify-between flex-wrap gap-space-sm">
          <div className="flex items-center gap-space-xs">
            <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0"><Icon name="timeline" className="text-[1.25rem]" /></div>
            <div>
              <h2 className="font-title text-title font-bold text-on-surface">{T('72-Hour AQI & Temperature Forecast')}</h2>
              <p className="font-body-sm text-body-sm text-outline">{T('Coupled weather–chemistry model · 3-hourly steps')}</p>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant"><span className="w-4 h-1 rounded-full" style={{ background: '#e8862e' }}></span>{T('National AQI')}</span>
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant"><span className="w-4 h-0.5 rounded-full" style={{ background: '#00685f', borderTop: '2px dashed #00685f' }}></span>{T('Temperature')}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-space-sm my-space-md">
          <div className="p-space-sm rounded-lg bg-surface-container-low"><div className="font-label-sm text-label-sm text-outline">{T('Peak AQI')}</div><div className="flex items-baseline gap-1.5"><span className="font-headline-sm text-headline-sm font-extrabold" style={{ color: bp.dot === 'bg-error' ? '#ba1a1a' : bp.dot === 'bg-tertiary' ? '#a36700' : '#006c49' }}>{peak.aqi}</span><span className="font-label-sm text-label-sm text-on-surface-variant">+{peak.h}h</span></div></div>
          <div className="p-space-sm rounded-lg bg-surface-container-low"><div className="font-label-sm text-label-sm text-outline">{T('Cleanest window')}</div><div className="flex items-baseline gap-1.5"><span className="font-headline-sm text-headline-sm font-extrabold text-secondary">{low.aqi}</span><span className="font-label-sm text-label-sm text-on-surface-variant">+{low.h}h</span></div></div>
          <div className="p-space-sm rounded-lg bg-surface-container-low"><div className="font-label-sm text-label-sm text-outline">{T('Temp range')}</div><div className="font-headline-sm text-headline-sm font-extrabold text-on-surface">{tmin}° – {tmax}°<span className="font-label-sm text-label-sm text-on-surface-variant">C</span></div></div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ba1a1a" stopOpacity="0.35" />
              <stop offset="45%" stopColor="#e8862e" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#4edea3" stopOpacity="0.10" />
            </linearGradient>
          </defs>
          {/* gridlines + left AQI axis */}
          {[100, 200, 300, 400].map(v => (
            <g key={v}>
              <line x1={x0} y1={AY(v)} x2={x1} y2={AY(v)} stroke="var(--c-outline-variant)" strokeOpacity="0.5" strokeWidth="0.6" strokeDasharray="3 4" style={{ stroke: 'rgb(var(--c-outline-variant))' }} />
              <text x={x0 - 6} y={AY(v) + 3} textAnchor="end" fontSize="10" fill="rgb(var(--c-outline))">{v}</text>
            </g>
          ))}
          {/* right temp axis */}
          {[15, 25, 35].map(v => (
            <text key={v} x={x1 + 6} y={TY(v) + 3} textAnchor="start" fontSize="10" fill="#00685f">{v}°</text>
          ))}
          {/* AQI area + line */}
          <polygon points={aqiArea} fill="url(#aqiFill)" />
          <polyline points={aqiPts} fill="none" stroke="#e8862e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {/* Temp line */}
          <polyline points={tempPts} fill="none" stroke="#00685f" strokeWidth="2" strokeDasharray="6 5" strokeLinejoin="round" strokeLinecap="round" />
          {/* peak marker */}
          <circle cx={X(data.indexOf(peak))} cy={AY(peak.aqi)} r="4" fill="#ba1a1a" stroke="#fff" strokeWidth="1.5" />
          {/* x labels */}
          {xLabels.map(([i, lab]) => (
            <text key={i} x={X(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === 24 ? 'end' : 'middle'} fontSize="10" fontWeight="600" fill="rgb(var(--c-on-surface-variant))">{lab}</text>
          ))}
        </svg>
      </div>
    </section>
  )
}

function Marker({ cls, ping, badge, chip, dot, name, val, tip, tipName }) {
  return (
    <div className={`absolute ${cls} z-20 group cursor-pointer`}>
      <div className="relative flex items-center justify-center">
        {ping && <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-error opacity-40"></span>}
        <div className={`px-space-xs py-1 rounded-full ${badge} font-label-sm text-label-sm font-bold shadow-lg flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
          <span>{name}</span>
          <span className={`${chip} px-1.5 rounded-full text-[0.7rem]`}>{val}</span>
        </div>
      </div>
      {tip && (
        <div className="hidden group-hover:block absolute bottom-full mb-2 -left-12 w-48 bg-inverse-surface text-inverse-on-surface text-body-sm p-space-xs rounded-lg shadow-xl z-30 pointer-events-none">
          <span className="font-bold block">{tipName}</span><span>{tip}</span>
        </div>
      )}
    </div>
  )
}

function Hazard({ cls, bounce, title, note }) {
  return (
    <div className={`absolute ${cls} z-20 group cursor-pointer`}>
      <div className={`p-1.5 rounded-full bg-tertiary text-on-tertiary shadow-lg flex items-center justify-center ${bounce ? 'animate-bounce' : ''}`}><Icon name="construction" className="text-[1.125rem]" /></div>
      <div className="hidden group-hover:block absolute -top-16 -left-20 w-52 bg-surface-container-lowest text-on-surface text-[0.75rem] p-space-xs rounded-lg shadow-xl z-30">
        <div className="flex items-center gap-1 text-tertiary font-bold"><Icon name="warning" className="text-[0.875rem]" /> {title}</div>
        <p className="text-outline mt-0.5">{note}</p>
      </div>
    </div>
  )
}

function AreaCard({ name, val, tag, tagCls, delta, down, flat, highlight }) {
  const deltaCls = flat ? 'text-outline' : down ? 'text-secondary' : 'text-error'
  return (
    <div className={`bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-primary/25 cursor-pointer ${highlight ? 'ring-2 ring-error/20' : ''}`}>
      <div>
        <span className={`font-label-sm text-label-sm truncate block ${highlight ? 'text-error font-bold' : 'text-outline'}`}>{name}</span>
        <div className="flex items-baseline justify-between mt-1">
          <span className={`font-headline-sm text-headline-sm font-extrabold ${highlight ? 'text-error' : 'text-on-surface'}`}>{val}</span>
          <span className={`text-[0.7rem] px-1.5 py-0.5 rounded-full font-bold ${tagCls}`}>{tag}</span>
        </div>
      </div>
      <div className="mt-space-sm pt-space-xs border-t border-surface-container flex items-center justify-between text-[0.7rem]">
        <span className="text-outline">24h Delta</span>
        <span className={`${deltaCls} font-bold inline-flex items-center`}>{!flat && <Icon name={down ? 'south' : 'north'} className="text-[0.875rem]" />}{delta}</span>
      </div>
    </div>
  )
}

function Trust({ icon, cls, title, sub }) {
  return (
    <div className="flex flex-col items-center">
      <Icon name={icon} className={`${cls} text-[1.5rem] mb-1`} fill />
      <span className="font-label-md text-label-md text-on-surface font-bold">{title}</span>
      <span className="font-body-sm text-body-sm text-outline">{sub}</span>
    </div>
  )
}
