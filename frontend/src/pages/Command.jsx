import { useRef, useState } from 'react'
import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from '../components/Icon'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import { useLocations, useAlerts, useFires } from '../useLive'

// Operational status styling from a live AQI value (for the CAAQMS table).
function statusFor(aqi) {
  if (aqi > 400) return { valCls: 'text-error', bar: 'bg-error', text: 'Critical Inversion', cls: 'bg-error-container text-error' }
  if (aqi > 300) return { valCls: 'text-error', bar: 'bg-error', text: 'Very Poor', cls: 'bg-error-container text-error' }
  if (aqi > 200) return { valCls: 'text-tertiary-container', bar: 'bg-tertiary', text: 'Dust Elevated', cls: 'bg-tertiary-fixed text-on-tertiary-fixed' }
  if (aqi > 100) return { valCls: 'text-tertiary', bar: 'bg-tertiary', text: 'Moderate Flow', cls: 'bg-tertiary-fixed text-on-tertiary-fixed' }
  return { valCls: 'text-secondary', bar: 'bg-secondary', text: 'Nominal Flow', cls: 'bg-secondary-container text-on-secondary-fixed-variant' }
}
const num = (v) => (v != null ? String(Math.round(v)) : '—')

const ROWS = [
  ['Anand Vihar', 'DPCC-01', '214.2', '389.0', '68.4', '22.1', '+14.6%', 'text-error', 'Critical Inversion', 'bg-error-container text-error', 'bg-error'],
  ['Punjabi Bagh', 'DPCC-04', '164.8', '278.5', '54.0', '31.2', '+6.2%', 'text-tertiary-container', 'Dust Elevated', 'bg-tertiary-fixed text-on-tertiary-fixed', 'bg-tertiary'],
  ['R.K. Puram', 'CPCB-02', '112.5', '194.2', '42.1', '45.0', '-2.1%', 'text-secondary', 'Nominal Flow', 'bg-secondary-container text-on-secondary-fixed-variant', 'bg-secondary'],
  ['Bawana Industrial', 'DPCC-08', '242.0', '412.3', '88.2', '19.4', '+18.9%', 'text-error', 'Fugitive Boiler Smoke', 'bg-error-container text-error', 'bg-error'],
]
const DISPATCH = [
  { icon: 'mode_heat', iconCls: 'text-error', tag: 'Smog Cannons Active', time: '14:15 IST', title: 'Pragati Maidan Corridor Dust Suppression', sub: 'Unit: North-Zone Mech Sprayer 04', status: 'In Route (ETA 8m)', statusCls: 'text-primary' },
  { icon: 'gavel', iconCls: 'text-tertiary', tag: 'GRAP Stage III Auto-Trigger', time: '14:02 IST', title: 'BS-III Petrol & BS-IV Diesel Travel Ban Warning', sub: 'Forecast threshold > 400', status: 'Review Ready', statusCls: 'text-tertiary' },
  { icon: 'construction', iconCls: 'text-on-surface-variant', tag: 'Construction Halt Notice', time: '13:40 IST', title: 'Hotspot Sector 62 C&D Waste Ground Halt', sub: 'Notice #DL-2024-899', status: 'Enforced (100%)', statusCls: 'text-secondary' },
]

// heat blobs (IQAir-style) + station labels for the telemetry map
const HEAT = [
  { c: [28.646, 77.305], r: 8500, color: '#ba1a1a', op: 0.30 },
  { c: [28.648, 77.318], r: 3800, color: '#ba1a1a', op: 0.40 },
  { c: [28.636, 77.10], r: 10500, color: '#a36700', op: 0.22 },
  { c: [28.70, 77.16], r: 6000, color: '#a36700', op: 0.20 },
  { c: [28.61, 77.225], r: 5200, color: '#00685f', op: 0.14 },
]
function opsMarker(kind, name, sub) {
  const dot = kind === 'red'
    ? `<span style="position:relative;display:flex"><span style="position:absolute;display:inline-flex;height:20px;width:20px;border-radius:9999px;background:#ba1a1a;opacity:.55;animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite"></span><span style="position:relative;display:inline-flex;height:16px;width:16px;border-radius:9999px;background:#ba1a1a;color:#fff;align-items:center;justify-content:center;font-size:9px;font-weight:700">!</span></span>`
    : `<span style="width:14px;height:14px;border-radius:9999px;background:${kind === 'amber' ? '#a36700' : '#006c49'};display:inline-block;box-shadow:0 1px 4px rgba(0,0,0,.3)"></span>`
  const titleColor = kind === 'red' ? '#ba1a1a' : kind === 'amber' ? '#a36700' : '#006c49'
  const html = `<div style="transform:translate(-50%,-140%);display:flex;flex-direction:column;align-items:center;gap:3px">
      <div class="bg-surface-container-lowest" style="padding:4px 8px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.18);white-space:nowrap;text-align:left">
        <div style="font-weight:700;font-size:12px;color:${titleColor}">${name}</div>
        <div class="text-on-surface-variant" style="font-size:11px">${sub}</div>
      </div>${dot}</div>`
  return L.divIcon({ html, className: '', iconSize: [0, 0] })
}

function CommandMap({ byId }) {
  const mapRef = useRef(null)
  // Live ops marker: real PM2.5/AQI where the station is modelled, else static.
  const mk = (id, fbKind, name, fbSub) => {
    const s = byId?.[id]
    if (!s) return opsMarker(fbKind, name, fbSub)
    const kind = s.aqi > 300 ? 'red' : s.aqi > 200 ? 'amber' : 'green'
    return opsMarker(kind, name, `PM2.5: ${Math.round(s.pollutants?.pm25 ?? 0)} • AQI ${s.aqi}`)
  }
  return (
    <div className="relative w-full h-[420px] rounded-xl overflow-hidden shadow-inner bg-surface-container-high">
      <MapContainer ref={mapRef} center={[28.625, 77.23]} zoom={11} zoomControl={false} attributionControl style={{ width: '100%', height: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        {HEAT.map((h, i) => (
          <Circle key={i} center={h.c} radius={h.r} interactive={false}
            pathOptions={{ stroke: false, fillColor: h.color, fillOpacity: h.op, className: 'heat-blob' }} />
        ))}
        <Marker position={[28.6469, 77.3152]} icon={mk('anand-vihar', 'red', 'Anand Vihar (ISBT)', 'PM2.5: 398 • Severe+')} />
        <Marker position={[28.674, 77.131]} icon={mk('punjabi-bagh', 'amber', 'Punjabi Bagh', 'PM2.5: 284 • Heavy Road Dust')} />
        <Marker position={[28.6289, 77.241]} icon={mk('ito', 'green', 'ITO Intersection', 'PM2.5: 218 • NOx High')} />
      </MapContainer>
      <div className="absolute top-space-sm right-space-sm z-[500] flex flex-col gap-1.5">
        <button onClick={() => mapRef.current?.zoomIn()} className="w-8 h-8 rounded-lg bg-surface-container-lowest/90 backdrop-blur text-on-surface shadow flex items-center justify-center font-bold">+</button>
        <button onClick={() => mapRef.current?.zoomOut()} className="w-8 h-8 rounded-lg bg-surface-container-lowest/90 backdrop-blur text-on-surface shadow flex items-center justify-center font-bold">-</button>
        <button onClick={() => mapRef.current?.setView([28.625, 77.23], 11)} className="w-8 h-8 rounded-lg bg-surface-container-lowest/90 backdrop-blur text-on-surface shadow flex items-center justify-center"><Icon name="my_location" className="text-[1.1rem]" /></button>
      </div>
    </div>
  )
}

export default function Command() {
  const { lang } = useApp()
  const T = (s) => t(s, lang)
  const [tab, setTab] = useState('overview')
  const { list, byId } = useLocations()
  const alerts = useAlerts()
  const fires = useFires()

  // Live CAAQMS rows from the model feed (fallback to static ROWS until loaded).
  const rows = (list && list.length)
    ? [...list].sort((a, b) => b.aqi - a.aqi).map((l) => ({
        name: l.name, id: (l.location || l.name).toUpperCase(), aqi: l.aqi, p: l.pollutants || {}, ...statusFor(l.aqi),
      }))
    : null
  const cityMax = list && list.length ? Math.max(...list.map((l) => l.aqi)) : null
  const cityMaxCat = cityMax == null ? null : cityMax <= 200 ? 'Moderate' : cityMax <= 300 ? 'Poor' : cityMax <= 400 ? 'Very Poor' : 'Severe'
  const grapStage = alerts?.grap?.stage
  const fireCount = fires ? fires.length : null

  return (
    <>
      {/* Sub-header (toggles live in the global nav, not duplicated here) */}
      <header className="fixed left-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-30 flex items-center justify-between px-space-md lg:px-space-xl top-16">
        <div className="flex items-center gap-space-md min-w-0"><span className="text-base sm:font-headline-sm sm:text-headline-sm text-on-surface font-bold truncate">{T('Regional Atmospheric Command')}</span><span className="px-space-xs py-space-2xs rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm hidden md:inline shrink-0">{T('Delhi NCR Grid')}</span></div>
        <button className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors shrink-0 ml-space-sm" aria-label="Notifications"><Icon name="notifications" className="text-[1.25rem]" /></button>
      </header>

      {/* Content */}
      <div>
        <div className="px-space-md lg:px-space-xl py-space-lg pt-20 flex flex-col gap-space-lg">
          {/* Ops console top */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-md shadow-primary/20"><Icon name="terminal" className="text-[1.5rem]" fill /></div>
                <div>
                  <div className="flex items-center gap-space-xs"><span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">AtmosIQ Ops Command</span><span className="px-space-xs py-space-2xs rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold uppercase">v4.2.8</span></div>
                  <div className="flex items-center gap-space-sm text-on-surface-variant font-body-sm text-body-sm"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary animate-ping inline-block"></span><span className="font-semibold text-secondary">{T('Live Airshed Sync')}</span></span><span>•</span><span>{T('CPCB / DPCC Primary Feeds active (39/40 online)')}</span></div>
                </div>
              </div>
              <div className="flex items-center bg-surface-container-low p-space-2xs rounded-xl shadow-inner">
                {[['overview', 'grid_view', 'Overview'], ['alerts', 'warning', 'Alerts & Protocols']].map(([id, ic, label]) => (
                  <button key={id} onClick={() => setTab(id)} className={`px-space-md py-space-xs rounded-lg font-label-md text-label-md flex items-center gap-space-xs transition-all ${tab === id ? 'font-bold bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    <Icon name={ic} className="text-[1.1rem]" /> {T(label)}
                    {id === 'alerts' && <span className="px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">3</span>}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-space-sm flex-wrap w-full sm:w-auto">
                <div className="relative w-full sm:w-auto min-w-0">
                  <select className="appearance-none w-full sm:w-auto max-w-full truncate bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold px-space-md py-space-xs pr-8 rounded-lg cursor-pointer transition-colors shadow-sm outline-none">
                    <option>{T('All NCT Sectors')}</option><option>Delhi-NCR West (Punjabi Bagh / Dwarka)</option><option>Central Airshed (ITO / Mandir Marg)</option><option>Trans-Yamuna East (Anand Vihar)</option><option>Gurugram Corridor (CyberHub)</option>
                  </select>
                  <Icon name="expand_more" className="absolute right-2 top-2.5 pointer-events-none text-on-surface-variant text-[1.1rem]" />
                </div>
                <div className="flex items-center bg-surface-container-low rounded-lg p-space-2xs text-on-surface-variant font-label-sm text-label-sm font-semibold">
                  <button className="px-space-xs py-1 rounded bg-surface-container-lowest text-primary shadow-sm font-bold">{T('Live 1H')}</button>
                  <button className="px-space-xs py-1 hover:text-on-surface transition-colors">{T('24H Avg')}</button>
                  <button className="px-space-xs py-1 hover:text-on-surface transition-colors">{T('72H Sim')}</button>
                </div>
              </div>
            </div>
          </div>

          {tab === 'overview' && (<>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
            <Kpi label={T('Airshed Index (Composite)')} val={cityMax != null ? String(cityMax) : '294'} unit={cityMaxCat ? T(`AQI (${cityMaxCat})`) : T('AQI (Severe)')} valCls="text-error" icon="air" iconBg="bg-error-container text-on-error-container" footIcon="insights" footCls="text-error" foot={alerts?.grap?.hotspot ? `Peak: ${alerts.grap.hotspot}` : T('City maximum')} note={`Live across ${list ? list.length : 8} stations`} />
            <Kpi label={T('Boundary Layer Inversion')} val="380" unit={T('meters AGL')} valCls="text-tertiary" icon="layers" iconBg="bg-tertiary-fixed text-on-tertiary-fixed" footIcon="compress" footCls="text-tertiary" foot={T('Trap Warning (18:00 - 06:00)')} note="Vent. coeff: 2,140 m²/s" />
            <Kpi label={T('Active Upwind Fire Power')} val={fireCount != null ? String(fireCount) : '4,820'} unit={fireCount != null ? T('hotspots (FIRMS)') : 'MW (VIIRS)'} valCls="text-on-surface" icon="local_fire_department" iconBg="bg-surface-container-high text-on-surface" footIcon="insights" footCls="text-tertiary-container" foot={T('Punjab / Haryana belt')} note="NW Vector @ 14 km/h" />
            <Kpi label={T('Enforcement Status')} val="88.4%" unit={grapStage ? `GRAP ${grapStage} Active` : T('GRAP-II Active')} valCls="text-secondary" icon="shield_with_heart" iconBg="bg-secondary-container text-on-secondary-container" footIcon="verified" footCls="text-secondary" foot={T('142 patrols active')} note={T('GRAP-III threshold at 350')} />
          </div>

          {/* Map + Plume */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-space-sm mb-space-xs flex-wrap gap-space-xs">
                <div className="flex items-center gap-space-sm"><span className="font-title text-title text-on-surface font-bold">{T('Airshed Telemetry Canvas & Dynamic Vector Dispersion')}</span><span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">{T('39 Nodes Operational')}</span></div>
                <div className="flex items-center gap-space-xs">
                  <button className="px-space-xs py-1 rounded bg-surface-container-low text-on-surface font-label-sm text-label-sm font-semibold hover:bg-surface-container transition-colors flex items-center gap-1"><Icon name="air" className="text-[1rem]" /> {T('Wind Vectors')}</button>
                  <button className="px-space-xs py-1 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold shadow-sm flex items-center gap-1"><Icon name="blur_on" className="text-[1rem]" /> {T('Heatmap PM2.5')}</button>
                  <button className="px-space-xs py-1 rounded bg-surface-container-low text-on-surface font-label-sm text-label-sm font-semibold hover:bg-surface-container transition-colors flex items-center gap-1"><Icon name="construction" className="text-[1rem]" /> {T('Hotspots')}</button>
                </div>
              </div>
              <CommandMap byId={byId} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm mt-space-sm">
                <div className="p-space-xs rounded-lg bg-surface-container-low flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline">{T('Wind Influx Rate')}</span><span className="font-label-sm text-label-sm font-bold text-on-surface">14.2 km/h</span></div>
                <div className="p-space-xs rounded-lg bg-surface-container-low flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline">{T('Surface Humidity')}</span><span className="font-label-sm text-label-sm font-bold text-on-surface">76%</span></div>
                <div className="p-space-xs rounded-lg bg-surface-container-low flex items-center justify-between"><span className="font-label-sm text-label-sm text-outline">{T('CAAQMS Calib. Drift')}</span><span className="font-label-sm text-label-sm font-bold text-secondary">0.42%</span></div>
              </div>
            </div>

            {/* Plume model */}
            <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-space-xs"><div className="flex items-center gap-space-xs"><span className="w-3 h-3 rounded-full bg-tertiary-container"></span><span className="font-title text-title text-on-surface font-bold">{T('Stubble Plume Drift Model')}</span></div><span className="font-label-sm text-label-sm px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-semibold">HYSPLIT V5</span></div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{T('Trajectory projection calculated from Sangrur/Karnal farm clusters based on GFS meteo forecasts.')}</p>
                <div className="my-space-md p-space-sm rounded-xl bg-surface-container-low relative overflow-hidden">
                  <div className="flex items-center justify-between mb-space-xs"><span className="font-label-sm text-label-sm font-bold text-on-surface">{T('Calculated Inflow Fraction')}</span><span className="font-label-md text-label-md font-extrabold text-error">{T('34% of Delhi NCT PM2.5')}</span></div>
                  <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden mb-space-sm"><div className="bg-gradient-to-r from-secondary via-tertiary to-error h-full rounded-full" style={{ width: '34%' }}></div></div>
                  <div className="bg-surface-container-lowest p-space-xs rounded-lg shadow-sm">
                    <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm mb-1 font-semibold"><span className="text-primary font-bold">T+0h</span><span>T+6h</span><span>T+12h</span><span>T+24h</span></div>
                    <input className="w-full accent-primary cursor-pointer" max="24" min="0" type="range" defaultValue="8" />
                    <div className="flex justify-between font-label-sm text-label-sm text-outline mt-1"><span>15:00 IST</span><span className="text-error font-semibold">{T('23:00 IST Inversion Impact')}</span><span>15:00 +1d</span></div>
                  </div>
                </div>
                <div className="space-y-space-xs mb-space-md">
                  <div className="flex items-center justify-between p-space-xs rounded-lg bg-surface-container-low"><div className="flex items-center gap-space-xs"><Icon name="flare" className="text-[1.1rem] text-tertiary" /><span className="font-body-sm text-body-sm font-semibold text-on-surface">{T('Estimated Smoke Flux')}</span></div><span className="font-label-md text-label-md font-bold text-on-surface">1,890 µg/m³-km</span></div>
                  <div className="flex items-center justify-between p-space-xs rounded-lg bg-surface-container-low"><div className="flex items-center gap-space-xs"><Icon name="schedule" className="text-[1.1rem] text-primary" /><span className="font-body-sm text-body-sm font-semibold text-on-surface">{T('Arrival at NCR Border')}</span></div><span className="font-label-md text-label-md font-bold text-error">~ 5h 20m</span></div>
                </div>
              </div>
              <button className="w-full py-space-xs px-space-md bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-space-xs"><Icon name="tune" className="text-[1.1rem]" /> {T('Open Full Aerodynamic Workbench')}</button>
            </div>
          </div>

          {/* Table + Dispatch */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
              <div className="flex items-center justify-between mb-space-sm flex-wrap gap-space-xs">
                <div><span className="font-title text-title text-on-surface font-bold">{T('Continuous Ambient Air Quality Monitoring (CAAQMS)')}</span><p className="font-body-sm text-body-sm text-outline">{T('Real-time uncalibrated & reference-grade microgram telemetries')}</p></div>
                <div className="flex items-center gap-space-xs">
                  <button className="px-space-xs py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm font-semibold hover:text-on-surface flex items-center gap-1"><Icon name="file_download" className="text-[1rem]" /> {T('CSV Export')}</button>
                  <button className="px-space-xs py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm font-semibold hover:text-on-surface flex items-center gap-1"><Icon name="refresh" className="text-[1rem]" /> {T('Refresh')}</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="text-outline font-label-sm text-label-sm uppercase"><th className="py-space-xs pr-space-sm">{T('Station / ID')}</th><th className="py-space-xs px-space-sm">PM2.5</th><th className="py-space-xs px-space-sm">PM10</th><th className="py-space-xs px-space-sm">NO₂</th><th className="py-space-xs px-space-sm">O₃</th><th className="py-space-xs px-space-sm">Δ 1H</th><th className="py-space-xs pl-space-sm">{T('Operational Status')}</th></tr></thead>
                  <tbody className="font-body-sm text-body-sm">
                    {rows
                      ? rows.map(r => (
                        <tr key={r.id} className="border-t border-surface-container">
                          <td className="py-space-sm pr-space-sm"><div className="flex items-center gap-space-xs"><span className={`w-1.5 h-6 rounded-full ${r.bar}`}></span><div><div className="font-semibold text-on-surface">{r.name}</div><div className="text-outline font-label-sm text-label-sm">(AQI {r.aqi})</div></div></div></td>
                          <td className={`py-space-sm px-space-sm font-bold ${r.valCls}`}>{num(r.p.pm25)}</td>
                          <td className="py-space-sm px-space-sm text-on-surface-variant">{num(r.p.pm10)}</td>
                          <td className="py-space-sm px-space-sm text-on-surface-variant">{num(r.p.no2)}</td>
                          <td className="py-space-sm px-space-sm text-on-surface-variant">{num(r.p.o3)}</td>
                          <td className="py-space-sm px-space-sm font-bold text-outline">—</td>
                          <td className="py-space-sm pl-space-sm"><span className={`inline-block px-space-xs py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${r.cls}`}>{T(r.text)}</span></td>
                        </tr>
                      ))
                      : ROWS.map(r => (
                        <tr key={r[1]} className="border-t border-surface-container">
                          <td className="py-space-sm pr-space-sm"><div className="flex items-center gap-space-xs"><span className={`w-1.5 h-6 rounded-full ${r[10]}`}></span><div><div className="font-semibold text-on-surface">{r[0]}</div><div className="text-outline font-label-sm text-label-sm">({r[1]})</div></div></div></td>
                          <td className={`py-space-sm px-space-sm font-bold ${r[7]}`}>{r[2]}</td>
                          <td className="py-space-sm px-space-sm text-on-surface-variant">{r[3]}</td>
                          <td className="py-space-sm px-space-sm text-on-surface-variant">{r[4]}</td>
                          <td className="py-space-sm px-space-sm text-on-surface-variant">{r[5]}</td>
                          <td className={`py-space-sm px-space-sm font-bold ${r[7]}`}>{r[6]}</td>
                          <td className="py-space-sm pl-space-sm"><span className={`inline-block px-space-xs py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${r[9]}`}>{T(r[8])}</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dispatch queue */}
            <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-space-xs"><span className="font-title text-title text-on-surface font-bold">{T('Actionable Dispatch Queue')}</span><span className="px-space-xs py-space-2xs rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">4 {T('Pending')}</span></div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">{T('Automated municipal enforcement orders triggered by sensor excursion.')}</p>
              <div className="flex flex-col gap-space-sm flex-1">
                {DISPATCH.map((d, i) => (
                  <div key={i} className="p-space-sm rounded-xl bg-surface-container-low">
                    <div className="flex items-center justify-between mb-space-2xs"><div className="flex items-center gap-space-2xs"><Icon name={d.icon} className={`text-[1.1rem] ${d.iconCls}`} /><span className="font-label-sm text-label-sm font-bold text-on-surface">{d.tag}</span></div><span className="font-label-sm text-label-sm text-outline">{d.time}</span></div>
                    <p className="font-body-sm text-body-sm text-on-surface font-semibold leading-snug">{d.title}</p>
                    <div className="flex items-center justify-between mt-space-2xs"><span className="font-label-sm text-label-sm text-outline">{d.sub}</span><span className={`font-label-sm text-label-sm font-bold ${d.statusCls}`}>{d.status}</span></div>
                  </div>
                ))}
              </div>
              <button className="mt-space-sm w-full py-space-xs px-space-md rounded-lg bg-surface-container-low text-primary font-label-md text-label-md font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-space-xs"><Icon name="notifications_active" className="text-[1.1rem]" /> {T('Review All Active Directives & Triggers')}</button>
            </div>
          </div>
          </>)}

          {tab === 'alerts' && <AlertsPanel T={T} activeStage={grapStage} />}
        </div>
      </div>
    </>
  )
}

function PlumePanel({ T }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
      <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col">
        <div className="flex items-center justify-between pb-space-sm flex-wrap gap-space-xs">
          <div className="flex items-center gap-space-sm"><Icon name="cyclone" className="text-tertiary text-[1.4rem]" /><span className="font-title text-title text-on-surface font-bold">{T('Stubble Plume Drift Model')}</span><span className="px-space-xs py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">HYSPLIT V5 · Live</span></div>
          <span className="font-label-sm text-label-sm text-outline">GFS 0.25° meteo · updated 09 min ago</span>
        </div>
        <CommandMap />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm mt-space-sm">
          {[['Upwind FRP', '4,820 MW'], ['Active Fire Spots', '1,248'], ['Transport Wind', 'NW @ 14 km/h'], ['Inflow Fraction', '34% NCT PM2.5']].map(([k, v]) => (
            <div key={k} className="p-space-sm rounded-lg bg-surface-container-low"><div className="font-label-sm text-label-sm text-outline">{k}</div><div className="font-title text-title font-bold text-on-surface">{v}</div></div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
        <div>
          <span className="font-title text-title text-on-surface font-bold">Trajectory Timeline</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{T('Trajectory projection calculated from Sangrur/Karnal farm clusters based on GFS meteo forecasts.')}</p>
        </div>
        <div className="p-space-sm rounded-xl bg-surface-container-low">
          <div className="flex items-center justify-between mb-space-xs"><span className="font-label-sm text-label-sm font-bold text-on-surface">{T('Calculated Inflow Fraction')}</span><span className="font-label-md text-label-md font-extrabold text-error">34%</span></div>
          <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden mb-space-sm"><div className="bg-gradient-to-r from-secondary via-tertiary to-error h-full rounded-full" style={{ width: '34%' }}></div></div>
          <input className="w-full accent-primary cursor-pointer" max="24" min="0" type="range" defaultValue="8" />
          <div className="flex justify-between font-label-sm text-label-sm text-outline mt-1"><span>T+0h</span><span className="text-error font-semibold">{T('23:00 IST Inversion Impact')}</span><span>T+24h</span></div>
        </div>
        {[['flare', T('Estimated Smoke Flux'), '1,890 µg/m³-km', 'text-tertiary'], ['schedule', T('Arrival at NCR Border'), '~ 5h 20m', 'text-primary']].map(([ic, k, v, c]) => (
          <div key={k} className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low"><div className="flex items-center gap-space-xs"><Icon name={ic} className={`text-[1.1rem] ${c}`} /><span className="font-body-sm text-body-sm font-semibold text-on-surface">{k}</span></div><span className="font-label-md text-label-md font-bold text-on-surface">{v}</span></div>
        ))}
        <button className="mt-auto w-full py-space-xs px-space-md bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-space-xs"><Icon name="tune" className="text-[1.1rem]" /> {T('Open Full Aerodynamic Workbench')}</button>
      </div>
    </div>
  )
}

const GRAP_STAGES = [
  ['Stage I', 'Poor (201-300)', 'Dust control at C&D sites, mechanised road sweeping, water sprinkling.', 'bg-tertiary-fixed text-on-tertiary-fixed', false],
  ['Stage II', 'Very Poor (301-400)', 'Diesel generator curbs, parking-fee hikes, enhanced public transport.', 'bg-tertiary-container/20 text-tertiary-container', true],
  ['Stage III', 'Severe (401-450)', 'Ban on non-essential construction & BS-III/IV diesel; hybrid schooling.', 'bg-error-container text-error', false],
  ['Stage IV', 'Severe+ (>450)', 'Truck entry ban, office WFH, closure of polluting industry.', 'bg-error/15 text-error', false],
]
function AlertsPanel({ T, activeStage }) {
  const activeLabel = activeStage || 'Stage II'
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
      <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
        <div className="flex items-center gap-space-xs mb-space-sm"><Icon name="warning" className="text-error text-[1.4rem]" fill /><span className="font-title text-title text-on-surface font-bold">GRAP Protocol Ladder</span><span className="px-space-xs py-space-2xs rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">{activeLabel} Active</span></div>
        <div className="flex flex-col gap-space-sm">
          {GRAP_STAGES.map(([stage, band, desc, cls]) => {
            const active = stage === activeLabel
            return (
            <div key={stage} className={`p-space-md rounded-xl border ${active ? 'border-error bg-error-container/20' : 'border-surface-container bg-surface-container-low'}`}>
              <div className="flex items-center justify-between mb-space-2xs"><div className="flex items-center gap-space-xs"><span className="font-title text-title text-on-surface font-bold">{stage}</span><span className={`px-space-xs py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${cls}`}>{band}</span></div>{active && <span className="flex items-center gap-1 font-label-sm text-label-sm text-error font-bold"><span className="w-2 h-2 rounded-full bg-error animate-ping"></span>Enforced</span>}</div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{desc}</p>
            </div>
            )
          })}
        </div>
      </div>
      <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-space-xs"><span className="font-title text-title text-on-surface font-bold">{T('Actionable Dispatch Queue')}</span><span className="px-space-xs py-space-2xs rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">4 {T('Pending')}</span></div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">{T('Automated municipal enforcement orders triggered by sensor excursion.')}</p>
        <div className="flex flex-col gap-space-sm flex-1">
          {DISPATCH.map((d, i) => (
            <div key={i} className="p-space-sm rounded-xl bg-surface-container-low">
              <div className="flex items-center justify-between mb-space-2xs"><div className="flex items-center gap-space-2xs"><Icon name={d.icon} className={`text-[1.1rem] ${d.iconCls}`} /><span className="font-label-sm text-label-sm font-bold text-on-surface">{d.tag}</span></div><span className="font-label-sm text-label-sm text-outline">{d.time}</span></div>
              <p className="font-body-sm text-body-sm text-on-surface font-semibold leading-snug">{d.title}</p>
              <div className="flex items-center justify-between mt-space-2xs"><span className="font-label-sm text-label-sm text-outline">{d.sub}</span><span className={`font-label-sm text-label-sm font-bold ${d.statusCls}`}>{d.status}</span></div>
            </div>
          ))}
        </div>
        <button className="mt-space-sm w-full py-space-xs px-space-md rounded-lg bg-surface-container-low text-primary font-label-md text-label-md font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-space-xs"><Icon name="notifications_active" className="text-[1.1rem]" /> {T('Review All Active Directives & Triggers')}</button>
      </div>
    </div>
  )
}

function Kpi({ label, val, unit, valCls, icon, iconBg, footIcon, footCls, foot, note }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div><span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">{label}</span><div className="flex items-baseline gap-space-xs mt-1"><span className={`font-metric-stat text-metric-stat font-extrabold ${valCls}`}>{val}</span><span className="font-label-md text-label-md text-on-surface-variant font-semibold">{unit}</span></div></div>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}><Icon name={icon} className="text-[1.25rem]" /></span>
      </div>
      <div className="mt-space-sm pt-space-xs flex items-center justify-between font-label-sm text-label-sm gap-space-xs flex-wrap"><span className={`font-semibold flex items-center gap-1 ${footCls}`}><Icon name={footIcon} className="text-[1rem]" /> {foot}</span><span className="text-outline">{note}</span></div>
    </div>
  )
}
