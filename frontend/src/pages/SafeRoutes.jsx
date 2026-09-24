import { useState } from 'react'
import Icon from '../components/Icon'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import HealthProfileModal from '../components/HealthProfileModal'
import { api } from '../api'

function catOf(aqi) {
  if (aqi <= 50) return 'Good'; if (aqi <= 100) return 'Satisfactory'; if (aqi <= 200) return 'Moderate'
  if (aqi <= 300) return 'Poor'; if (aqi <= 400) return 'Very Poor'; return 'Severe'
}

export default function SafeRoutes() {
  const { profile, lang } = useApp()
  const T = (s) => t(s, lang)
  const [showModal, setShowModal] = useState(!profile)
  const [from, setFrom] = useState('Connaught Place')
  const [to, setTo] = useState('Noida Sec-62')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const s = suitabilityFor(profile)

  // Compare routes against the live endpoint AQIs from the backend.
  const compare = async () => {
    setLoading(true)
    const r = await api.routeSuitability({ from, to, healthProfile: profile || {} })
    setResult(r)
    setLoading(false)
  }
  // Derive the two route AQIs from the real average: direct passes the hotspot
  // (higher), greenway is buffered (lower). Falls back to the static demo values.
  const safeAqi = result ? Math.round(result.routeAqi * 0.78) : 214
  const fastAqi = result ? Math.round(result.routeAqi * 1.12) : 338
  const verdict = result ? result.verdict : s.short

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
              <svg viewBox="0 0 800 320" className="w-full h-full" preserveAspectRatio="none">
                <defs><pattern id="rgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="rgb(var(--c-outline-variant))" strokeWidth="0.5" opacity="0.4" /></pattern></defs>
                <rect width="800" height="320" fill="url(#rgrid)" />
                {/* Fastest arterial route (red) */}
                <path d="M 90,230 C 280,200 360,250 500,120 S 680,70 720,80" fill="none" stroke="#ba1a1a" strokeWidth="5" strokeDasharray="10 8" opacity="0.85" strokeLinecap="round" />
                {/* Safer greenway route (amber→green) */}
                <path d="M 90,230 C 240,300 460,300 600,200 S 700,110 720,80" fill="none" stroke="#00685f" strokeWidth="6" strokeLinecap="round" />
                {/* endpoints */}
                <circle cx="90" cy="230" r="9" fill="#00685f" stroke="#fff" strokeWidth="3" />
                <circle cx="720" cy="80" r="9" fill="#ba1a1a" stroke="#fff" strokeWidth="3" />
                {/* construction marker on fast route */}
                <g transform="translate(500,120)"><rect x="-9" y="-9" width="18" height="18" rx="3" transform="rotate(45)" fill="#ffb95f" stroke="#fff" strokeWidth="2" /></g>
              </svg>
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
                <Kv k="Est. Travel Time:" v="42 min (+8 min)" />
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
                <Kv k="Est. Travel Time:" v="34 min" />
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

function suitabilityFor(profile) {
  if (!profile) return { label: 'Use Caution', short: 'Use Caution', cls: 'bg-tertiary-fixed text-on-tertiary-fixed', dot: 'bg-tertiary', textCls: 'text-tertiary', reason: 'No health profile yet — set one for a personalised verdict. Current route exposure is Poor.' }
  const sensitive = profile.conditions !== 'none' || profile.age === 'senior' || profile.age === 'child' || profile.sensitivity === 'high'
  if (sensitive) return { label: 'Not Recommended', short: 'Not Recommended', cls: 'bg-error-container text-on-error-container', dot: 'bg-error', textCls: 'text-error', reason: `Given your profile (${profile.age}, ${profile.conditions}), today's PM2.5 exposure is too high. Prefer the low-exposure route and mask up.` }
  return { label: 'Use Caution', short: 'Acceptable w/ mask', cls: 'bg-tertiary-fixed text-on-tertiary-fixed', dot: 'bg-tertiary', textCls: 'text-secondary', reason: 'Route AQI is Poor. Healthy adults can proceed with the low-exposure route; consider a mask during peak segments.' }
}
