import { useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from '../components/Icon'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import { useLocations, useConstruction } from '../useLive'

// Real Delhi-NCR station coordinates. Colour derives from AQI band.
function aqiColors(aqi) {
  if (aqi <= 100) return { dot: 'bg-secondary', txt: 'text-secondary' }
  if (aqi <= 200) return { dot: 'bg-tertiary', txt: 'text-tertiary' }
  return { dot: 'bg-error', txt: 'text-error' }
}
const STATIONS = [
  { name: 'Anand Vihar', pos: [28.6469, 77.3152], aqi: 284, selected: true },
  { name: 'Jahangirpuri', pos: [28.7326, 77.0637], aqi: 318 },
  { name: 'Rohini', pos: [28.7361, 77.1206], aqi: 262 },
  { name: 'Wazirpur', pos: [28.6997, 77.1650], aqi: 305 },
  { name: 'Mundka', pos: [28.6840, 77.0770], aqi: 312 },
  { name: 'Bawana', pos: [28.7760, 77.0510], aqi: 322 },
  { name: 'Narela', pos: [28.8220, 77.1020], aqi: 300 },
  { name: 'Ashok Vihar', pos: [28.6900, 77.1810], aqi: 281 },
  { name: 'Punjabi Bagh', pos: [28.6740, 77.1310], aqi: 289 },
  { name: 'ITO', pos: [28.6289, 77.2410], aqi: 274 },
  { name: 'Mandir Marg', pos: [28.6360, 77.2010], aqi: 189 },
  { name: 'Lodhi Rd', pos: [28.5918, 77.2273], aqi: 142 },
  { name: 'R.K. Puram', pos: [28.5636, 77.1750], aqi: 231 },
  { name: 'Sirifort', pos: [28.5500, 77.2160], aqi: 214 },
  { name: 'Dwarka Sec-8', pos: [28.5710, 77.0710], aqi: 226 },
  { name: 'Najafgarh', pos: [28.6090, 76.9800], aqi: 198 },
  { name: 'IGI Airport', pos: [28.5562, 77.1000], aqi: 188 },
  { name: 'Aya Nagar', pos: [28.4700, 77.1090], aqi: 176 },
  { name: 'Nehru Nagar', pos: [28.5680, 77.2500], aqi: 276 },
  { name: 'Patparganj', pos: [28.6236, 77.2870], aqi: 268 },
  { name: 'Sonia Vihar', pos: [28.7100, 77.2490], aqi: 258 },
  { name: 'Vivek Vihar', pos: [28.6720, 77.3150], aqi: 297 },
  { name: 'Okhla Ph-II', pos: [28.5305, 77.2730], aqi: 241 },
  { name: 'Noida Sec-62', pos: [28.6270, 77.3640], aqi: 259 },
  { name: 'Faridabad', pos: [28.4089, 77.3178], aqi: 273 },
  { name: 'Gurugram', pos: [28.4500, 77.0260], aqi: 246 },
  { name: 'Greater Noida', pos: [28.4744, 77.4820], aqi: 238 },
  { name: 'Alipur', pos: [28.7975, 77.1533], aqi: 244 },
  { name: 'Burari', pos: [28.7580, 77.1990], aqi: 271 },
  { name: 'Chandni Chowk', pos: [28.6560, 77.2300], aqi: 279 },
  { name: 'Connaught Place', pos: [28.6330, 77.2190], aqi: 182 },
  { name: 'Karol Bagh', pos: [28.6510, 77.1900], aqi: 248 },
  { name: 'Lajpat Nagar', pos: [28.5670, 77.2430], aqi: 222 },
  { name: 'Saket', pos: [28.5220, 77.2100], aqi: 208 },
  { name: 'Vasant Kunj', pos: [28.5200, 77.1590], aqi: 184 },
  { name: 'Janakpuri', pos: [28.6210, 77.0870], aqi: 236 },
  { name: 'Pitampura', pos: [28.7030, 77.1310], aqi: 269 },
  { name: 'Mayur Vihar', pos: [28.6090, 77.2900], aqi: 264 },
  { name: 'Loni', pos: [28.7510, 77.2900], aqi: 328 },
  { name: 'Indirapuram', pos: [28.6420, 77.3710], aqi: 279 },
].map(s => ({ ...s, ...aqiColors(s.aqi) }))

// heatmap colour by AQI band
function heatHex(aqi) {
  if (aqi <= 100) return '#4edea3'
  if (aqi <= 200) return '#ffb95f'
  if (aqi <= 300) return '#e8862e'
  return '#ba1a1a'
}
function compass(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(((deg % 360) / 45)) % 8]
}
// dusty / construction zones (for the PM10 Surface Dust layer)
const DUST = [[28.6260, 77.2440], [28.5850, 77.2480], [28.7760, 77.0510], [28.6840, 77.0770], [28.6997, 77.1650]]

function stationIcon(s) {
  const html = s.selected
    ? `<div style="transform:translate(-50%,-50%)"><div class="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-surface-container-lowest shadow-xl">
         <span class="w-3.5 h-3.5 rounded-full bg-error text-on-error flex items-center justify-center" style="font-size:9px;font-weight:700">!</span>
         <span style="line-height:1.1"><span class="block font-label-sm text-on-surface" style="font-weight:700;font-size:12px">${s.name}</span>
         <span class="block ${s.txt}" style="font-weight:800;font-size:13px">AQI ${s.aqi}</span></span>
         <span class="material-symbols-outlined text-primary" style="font-size:16px">check_circle</span></div></div>`
    : `<div style="transform:translate(-50%,-50%)"><div class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-container-lowest shadow-md" style="white-space:nowrap">
         <span class="w-2.5 h-2.5 rounded-full ${s.dot}"></span>
         <span class="text-on-surface" style="font-weight:600;font-size:12px">${s.name}</span>
         <span class="${s.txt}" style="font-weight:700;font-size:12px">${s.aqi}</span></div></div>`
  return L.divIcon({ html, className: '', iconSize: [0, 0] })
}
const CONSTRUCTION = [
  { name: 'Pragati Tunnel Flyover', pos: [28.6260, 77.2440], icon: 'construction' },
  { name: 'Barapullah Ph-3', pos: [28.5850, 77.2480], icon: 'warning' },
]
function constructionIcon(c) {
  const html = `<div style="transform:translate(-50%,-50%)"><div class="flex items-center gap-1 px-2 py-1 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed shadow-md" style="white-space:nowrap">
      <span class="material-symbols-outlined text-tertiary" style="font-size:15px">${c.icon}</span>
      <span style="font-weight:700;font-size:12px">${c.name}</span></div></div>`
  return L.divIcon({ html, className: '', iconSize: [0, 0] })
}

export default function LiveMap() {
  const { lang } = useApp()
  const { byName } = useLocations()
  const construction = useConstruction()
  const [open, setOpen] = useState(true)
  const [stationName, setStationName] = useState('Anand Vihar')
  const [alertOn, setAlertOn] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const mapRef = useRef(null)
  const T = (s) => t(s, lang)

  // Overlay live AQI (+ pollutants/weather) onto the modelled stations by name;
  // the remaining stations keep their static seed values until modelled.
  const liveStations = useMemo(() => STATIONS.map(s => {
    const live = byName[s.name.toLowerCase()]
    const aqi = live?.aqi ?? s.aqi
    return { ...s, aqi, live, ...aqiColors(aqi) }
  }), [byName])
  const sel = liveStations.find(s => s.name === stationName) || liveStations[0]
  const selCat = sel.aqi <= 50 ? 'Good' : sel.aqi <= 100 ? 'Satisfactory' : sel.aqi <= 200 ? 'Moderate' : sel.aqi <= 300 ? 'Poor' : sel.aqi <= 400 ? 'Very Poor' : 'Severe'
  const selPill = sel.aqi <= 100 ? 'bg-secondary-container text-on-secondary-container' : sel.aqi <= 200 ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-error-container text-on-error-container'
  const selPol = sel.live?.pollutants
  const selWx = sel.live?.weather

  // Construction markers: live feed (lat/lon) if present, else static seed.
  const constructionMarkers = (construction && construction.length)
    ? construction.map(c => ({ name: c.name, pos: [c.lat, c.lon], icon: 'construction' }))
    : CONSTRUCTION

  const selectStation = (name) => {
    const hit = liveStations.find(s => s.name.toLowerCase() === (name || '').trim().toLowerCase())
    if (hit) { setStationName(hit.name); setOpen(true); setSearchQ(''); mapRef.current?.flyTo(hit.pos, 13, { duration: 0.8 }) }
  }

  const [layers, setLayers] = useState({ heatmap: true, dust: false, wind: false })
  const toggle = (k) => setLayers(l => ({ ...l, [k]: !l[k] }))

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex overflow-hidden bg-surface">
      {/* Real interactive Delhi map */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer ref={mapRef} center={[28.63, 77.22]} zoom={11} zoomControl={false} attributionControl
          style={{ width: '100%', height: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          {/* PM2.5 heatmap layer */}
          {layers.heatmap && liveStations.map(s => (
            <Circle key={'h' + s.name} center={s.pos} radius={3400} interactive={false}
              pathOptions={{ stroke: false, fillColor: heatHex(s.aqi), fillOpacity: 0.4, className: 'heat-blob' }} />
          ))}
          {/* PM10 surface dust layer */}
          {layers.dust && DUST.map((p, i) => (
            <Circle key={'d' + i} center={p} radius={3200} interactive={false}
              pathOptions={{ stroke: false, fillColor: '#a36700', fillOpacity: 0.34, className: 'heat-blob' }} />
          ))}
          {liveStations.map(s => (
            <Marker key={s.name} position={s.pos} icon={stationIcon({ ...s, selected: s.name === stationName })}
              eventHandlers={{ click: () => { setStationName(s.name); setOpen(true) } }} />
          ))}
          {constructionMarkers.map(c => (<Marker key={c.name} position={c.pos} icon={constructionIcon(c)} />))}
        </MapContainer>
        {/* Wind Vector 3D overlay */}
        {layers.wind && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-[450]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="wv-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#00685f" opacity="0.7" />
              </marker>
              <linearGradient id="wvGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00685f" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#ba1a1a" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {[80, 200, 320, 440, 560].map((y, i) => (
              <path key={i} d={`M -40,${y} C 250,${y - 40} 520,${y + 40} 900,${y - 30}`} fill="none"
                stroke="url(#wvGrad)" strokeWidth="2.5" strokeDasharray="10 14" markerEnd="url(#wv-arrow)">
                <animate attributeName="stroke-dashoffset" from="0" to="-48" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
              </path>
            ))}
          </svg>
        )}
      </div>

      {/* Floating top controls (sit to the right of the telemetry drawer) */}
      <div className="absolute top-space-md left-space-md right-space-md lg:left-[510px] lg:w-[560px] z-30 flex flex-col gap-space-xs pointer-events-none">
        <div className="flex flex-wrap items-center gap-space-xs bg-surface-container-lowest/90 backdrop-blur-xl p-space-xs rounded-2xl shadow-xl pointer-events-auto">
          <div className="flex-1 min-w-[220px] flex items-center gap-space-xs bg-surface-container-low px-space-sm py-space-xs rounded-xl text-on-surface">
            <Icon name="search" className="text-outline text-[1.25rem]" />
            <input list="map-stations" value={searchQ}
              onChange={e => { const v = e.target.value; setSearchQ(v); if (liveStations.some(s => s.name === v)) selectStation(v) }}
              onKeyDown={e => { if (e.key === 'Enter') selectStation(searchQ) }}
              className="bg-transparent text-on-surface font-body-sm text-body-sm w-full outline-none placeholder:text-outline"
              placeholder={T('Search ward, sector, or CAAQMS station...')} />
            <datalist id="map-stations">{[...liveStations].sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.name} value={s.name} />)}</datalist>
            <span className="flex items-center gap-1 bg-surface-container-highest px-space-xs py-space-2xs rounded-full font-label-sm text-label-sm text-on-surface-variant"><span className={`w-2 h-2 rounded-full ${sel.dot}`}></span>{sel.aqi}</span>
          </div>
          <div className="flex items-center gap-space-2xs">
            <button className="flex items-center gap-space-2xs bg-surface-container-low hover:bg-surface-container px-space-sm py-space-xs rounded-xl font-label-sm text-label-sm text-on-surface transition-colors"><Icon name="filter_list" className="text-[1.1rem] text-primary" /><span>{T('All CAAQMS (40)')}</span></button>
            <button className="flex items-center gap-space-2xs bg-surface-container-low hover:bg-surface-container p-space-xs rounded-xl text-on-surface transition-colors" title={T('My Location')} onClick={() => mapRef.current?.setView([28.6469, 77.3152], 12)}><Icon name="my_location" className="text-[1.2rem] text-primary" /></button>
          </div>
        </div>
        <div className="flex items-center gap-space-xs overflow-x-auto py-1 pointer-events-auto">
          {[['heatmap', 'blur_on', 'PM2.5 Heatmap', ''], ['dust', 'grain', 'PM10 Surface Dust', 'text-tertiary'], ['wind', 'air', 'Wind Vector 3D', 'text-outline']].map(([k, ic, label, iconCls]) => (
            <button key={k} onClick={() => toggle(k)} className={`flex items-center gap-1.5 px-space-sm py-space-xs rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors ${layers[k] ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-lowest/90 backdrop-blur-md text-on-surface hover:bg-surface-container-low shadow-sm'}`}>
              <Icon name={ic} className={`text-[1rem] ${layers[k] ? '' : iconCls}`} /><span>{T(label)}</span>
              {layers[k] && <span className="w-2 h-2 rounded-full bg-secondary-container"></span>}
            </button>
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-space-lg left-space-md z-30 hidden md:flex flex-col gap-space-xs">
        <div className="flex flex-col bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden p-1">
          <button onClick={() => mapRef.current?.zoomIn()} className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container-low rounded-xl transition-colors"><Icon name="add" className="text-[1.25rem]" /></button>
          <div className="w-6 h-[1px] bg-surface-container-high mx-auto"></div>
          <button onClick={() => mapRef.current?.zoomOut()} className="w-10 h-10 flex items-center justify-center text-on-surface hover:bg-surface-container-low rounded-xl transition-colors"><Icon name="remove" className="text-[1.25rem]" /></button>
        </div>
        <button onClick={() => mapRef.current?.setView([28.63, 77.22], 11)} className="w-10 h-10 bg-surface-container-lowest/90 backdrop-blur-md text-primary flex items-center justify-center rounded-2xl shadow-lg hover:bg-surface-container-low transition-colors"><Icon name="explore" className="text-[1.25rem]" /></button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-space-lg left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-[34rem] z-30 bg-surface-container-lowest/90 backdrop-blur-xl px-space-md py-space-xs rounded-full shadow-lg flex items-center gap-space-sm">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">{T('AQI Level')}</span>
        <div className="flex items-center gap-1">
          <span className="w-7 h-2 rounded-full bg-secondary"></span><span className="w-7 h-2 rounded-full bg-secondary-container"></span>
          <span className="w-7 h-2 rounded-full bg-tertiary-fixed-dim"></span><span className="w-7 h-2 rounded-full bg-tertiary"></span>
          <span className="w-7 h-2 rounded-full bg-error"></span>
        </div>
        <span className="font-label-sm text-label-sm text-on-surface font-extrabold ml-1">{sel.aqi} · {sel.name}</span>
      </div>

      {/* Re-open button */}
      {!open && (
        <button onClick={() => setOpen(true)} className="absolute top-space-md right-space-md z-30 bg-primary text-on-primary px-space-md py-space-xs rounded-full shadow-xl flex items-center gap-space-xs hover:bg-primary-container transition-all">
          <Icon name="bar_chart" className="text-[1.1rem]" /><span className="font-label-md text-label-md font-semibold">{T('Station Telemetry')}</span>
        </button>
      )}

      {/* Telemetry drawer */}
      <aside className={`relative h-full w-full sm:w-[460px] lg:w-[490px] bg-surface-container-lowest/95 backdrop-blur-2xl shadow-2xl z-[500] flex flex-col transition-transform duration-300 ${open ? '' : 'hidden'}`}>
        <div className="p-space-md bg-surface-container-low/70 flex items-start justify-between gap-space-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs mb-1">
              <span className="px-space-xs py-space-2xs bg-primary/10 text-primary rounded-md font-label-sm text-label-sm font-bold">DPCC-04</span>
              <span className="flex items-center gap-1 font-label-sm text-label-sm text-secondary font-semibold"><span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>{T('Live Telemetry (12s ago)')}</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-extrabold tracking-tight">{sel.name} {T('Station')}</h2>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{T('East Delhi Industrial-Transit Interface')}</span>
          </div>
          <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors"><Icon name="close" className="text-[1.25rem]" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-lg">
          <div className="grid grid-cols-12 gap-space-sm items-center bg-surface-container-low p-space-md rounded-2xl">
            <div className="col-span-6 flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">{T('Composite AQI')}</span>
              <div className="flex items-baseline gap-1 mt-1"><span className={`font-metric-stat text-metric-stat ${sel.txt} font-extrabold tracking-tight`}>{sel.aqi}</span><span className="font-label-sm text-label-sm text-outline">/ 500</span></div>
              <div className={`inline-flex items-center gap-1.5 px-space-xs py-space-2xs ${selPill} rounded-full font-label-sm text-label-sm font-bold mt-1 w-fit`}><span className={`w-2 h-2 rounded-full ${sel.dot}`}></span><span>{T(selCat)}</span></div>
            </div>
            <div className="col-span-6 flex flex-col pl-space-sm">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">{T('Dispersion Dynamics')}</span>
              <div className="flex items-center gap-2 mt-2"><Icon name="air" className="text-primary text-[1.5rem]" /><div><p className="font-label-md text-label-md text-on-surface font-bold">{selWx ? `${selWx.wind_speed} km/h ${compass(selWx.wind_dir)}` : '4.2 km/h NW'}</p><p className="font-label-sm text-label-sm text-on-surface-variant">{selWx && selWx.wind_speed > 10 ? T('Good dispersion') : T('Calm Stagnant Air')}</p></div></div>
              <div className="mt-2 flex items-center gap-2"><Icon name="waves" className="text-tertiary text-[1.5rem]" /><div><p className="font-label-md text-label-md text-on-surface font-bold">{T('Stagnation Index: High')}</p><p className="font-label-sm text-label-sm text-outline">{T('Thermal trapping active')}</p></div></div>
            </div>
          </div>

          <div className="flex flex-col gap-space-xs bg-surface-container-lowest p-space-md rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary"><Icon name="vertical_align_bottom" className="text-[1.25rem]" /></div>
                <div><h3 className="font-title text-title text-on-surface font-bold">{T('Inversion & PBL Tracker')}</h3><p className="font-label-sm text-label-sm text-on-surface-variant">{T('Lidar & Ceilometer sounding')}</p></div>
              </div>
              <span className="px-space-xs py-space-2xs rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>{T('Strong Ground Trap')}</span>
            </div>
            <div className="grid grid-cols-2 gap-space-xs mt-space-xs">
              <div className="p-space-sm bg-surface-container-low rounded-xl"><span className="font-label-sm text-label-sm text-on-surface-variant block">{T('Boundary Layer (PBL)')}</span><span className="font-headline-sm text-headline-sm text-on-surface font-extrabold">380 m</span><span className="font-label-sm text-label-sm text-error font-semibold block mt-0.5">{T('Critical Compression')}</span></div>
              <div className="p-space-sm bg-surface-container-low rounded-xl"><span className="font-label-sm text-label-sm text-on-surface-variant block">{T('Est. Breakout Window')}</span><span className="font-headline-sm text-headline-sm text-primary font-extrabold">11:30 AM</span><span className="font-label-sm text-label-sm text-on-surface-variant block mt-0.5">{T('Solar heating lift')}</span></div>
            </div>
            <div className="flex flex-col mt-space-sm">
              <div className="flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant mb-2">
                <span>{T('24h Profile: PBL Height vs Surface PM2.5')}</span>
                <span className="flex items-center gap-2"><span className="flex items-center gap-1 text-[11px]"><span className="w-2.5 h-1 bg-primary rounded-full"></span> PBL</span><span className="flex items-center gap-1 text-[11px]"><span className="w-2.5 h-1 bg-error rounded-full"></span> PM2.5</span></span>
              </div>
              <div className="w-full h-32 bg-surface-container-low/50 rounded-xl p-2 relative flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 110">
                  <line stroke="#bcc9c6" strokeDasharray="4,4" strokeWidth="0.5" x1="0" x2="400" y1="20" y2="20" />
                  <line stroke="#bcc9c6" strokeDasharray="4,4" strokeWidth="0.5" x1="0" x2="400" y1="55" y2="55" />
                  <line stroke="#bcc9c6" strokeDasharray="4,4" strokeWidth="0.5" x1="0" x2="400" y1="90" y2="90" />
                  <path d="M 0,85 C 40,88 90,95 140,90 C 190,82 230,25 280,30 C 330,35 370,80 400,88" fill="none" stroke="#00685f" strokeWidth="2.5" />
                  <path d="M 0,35 C 50,40 100,20 150,25 C 200,32 250,85 300,75 C 340,68 370,30 400,24" fill="none" stroke="#ba1a1a" strokeDasharray="3,3" strokeWidth="2" />
                  <circle cx="150" cy="90" fill="#ba1a1a" r="4" /><circle cx="280" cy="30" fill="#00685f" r="4" />
                </svg>
                <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[10px] text-outline font-medium"><span>{T('00:00 (Night)')}</span><span>{T('06:00 (Dawn Lock)')}</span><span>{T('13:00 (Venting Peak)')}</span><span>{T('20:00 (Trapping)')}</span></div>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2"><span className="font-bold text-on-surface">{T('Physical Inversion Note:')}</span> {T('Dense cold surface layer prevents vertical dilution until noon tomorrow. Ground pollution remains trapped within bottom 380m.')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between"><h3 className="font-title text-title text-on-surface font-bold">{T('Local Speciation Breakdown')}</h3><span className="font-label-sm text-label-sm text-outline">µg/m³ ambient</span></div>
            <div className="grid grid-cols-2 gap-space-xs">
              <Spec name="PM2.5" tag="WHO ref" tagCls="bg-error/15 text-error" val={selPol ? String(Math.round(selPol.pm25)) : '142'} unit="µg/m³" valCls="text-error" bar="bg-error" pct={`${Math.min(100, Math.round((selPol ? selPol.pm25 : 142) / 3))}%`} />
              <Spec name="PM10 (Dust)" tag={T('High')} tagCls="bg-tertiary-container/15 text-tertiary-container" val={selPol ? String(Math.round(selPol.pm10)) : '268'} unit="µg/m³" valCls="text-tertiary-container" bar="bg-tertiary-container" pct={`${Math.min(100, Math.round((selPol ? selPol.pm10 : 268) / 5))}%`} />
              <Spec name="NO₂ (Traffic)" tag={T('Elevated')} tagCls="bg-tertiary/15 text-tertiary" val={selPol ? String(Math.round(selPol.no2)) : '64'} unit="µg/m³" valCls="text-on-surface" bar="bg-tertiary" pct={`${Math.min(100, Math.round((selPol ? selPol.no2 : 64)))}%`} />
              <Spec name="O₃ (Ozone)" tag={T('Normal')} tagCls="bg-secondary/15 text-secondary" val={selPol ? String(Math.round(selPol.o3)) : '31'} unit="µg/m³" valCls="text-on-surface" bar="bg-secondary" pct={`${Math.min(100, Math.round((selPol ? selPol.o3 : 31)))}%`} />
            </div>
          </div>

          <div className="bg-error-container/40 p-space-md rounded-2xl flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-on-error-container"><Icon name="medical_services" className="text-[1.4rem] text-error" /><h4 className="font-title text-title font-bold">{T('Sensitive Health Advisory')}</h4></div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{T('Asthma, respiratory ailments, and pediatric outdoor play should be strictly moved indoors or deferred until post-noon when boundary inversion disperses.')}</p>
            <div className="grid grid-cols-2 gap-space-xs mt-space-xs">
              <div className="flex items-center gap-2 bg-surface-container-lowest/80 p-space-xs rounded-xl"><Icon name="masks" className="text-primary text-[1.2rem]" /><span className="font-label-sm text-label-sm text-on-surface font-medium">{T('N95 Mask advised')}</span></div>
              <div className="flex items-center gap-2 bg-surface-container-lowest/80 p-space-xs rounded-xl"><Icon name="air_purifier_gen" className="text-primary text-[1.2rem]" /><span className="font-label-sm text-label-sm text-on-surface font-medium">{T('HEPA Seal Recommended')}</span></div>
            </div>
          </div>
        </div>

        <div className="p-space-md bg-surface-container-lowest shadow-lg flex flex-col gap-space-xs">
          <button onClick={() => setAlertOn(a => !a)} className={`w-full py-space-sm px-space-md rounded-full font-label-md text-label-md font-bold flex items-center justify-center gap-space-xs shadow-md transition-all ${alertOn ? 'bg-secondary text-on-secondary hover:bg-secondary-fixed-dim' : 'bg-primary text-on-primary hover:bg-primary-container'}`}>
            <Icon name="notifications_active" className="text-[1.2rem]" /><span>{alertOn ? T('Station Alert Subscribed (Push Active)') : T('Set Custom Alert for this Station')}</span>
          </button>
          <button onClick={() => setOpen(false)} className="w-full py-space-xs text-center font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">{T('Collapse Telemetry Drawer')}</button>
        </div>
      </aside>
    </div>
  )
}

function Spec({ name, tag, tagCls, val, unit, valCls, bar, pct }) {
  return (
    <div className="p-space-sm bg-surface-container-low rounded-xl flex flex-col justify-between">
      <div className="flex justify-between items-center mb-1"><span className="font-label-sm text-label-sm text-on-surface font-bold">{name}</span><span className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm font-bold ${tagCls}`}>{tag}</span></div>
      <div className="flex items-baseline gap-1"><span className={`font-headline-sm text-headline-sm font-extrabold ${valCls}`}>{val}</span><span className="font-label-sm text-label-sm text-on-surface-variant">{unit}</span></div>
      <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden"><div className={`${bar} h-full rounded-full`} style={{ width: pct }}></div></div>
    </div>
  )
}
