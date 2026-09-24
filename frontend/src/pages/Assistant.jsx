import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import { answer } from '../utils/assistant'
import { api, resolveSlug } from '../api'

const CHIPS = [
  ['directions_run', 'text-primary', 'Is it safe to jog in Anand Vihar right now?'],
  ['insights', 'text-tertiary', "Explain today's evening inversion spike"],
  ['alt_route', 'text-secondary', 'Suggest lowest-exposure walking route to Tech Hub'],
  ['school', 'text-primary', 'Should school children take morning recess outdoors?'],
]

export default function Assistant() {
  const { location, lang, setLang } = useApp()
  const T = (s) => t(s, lang)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState([])
  const endRef = useRef(null)
  useEffect(() => { if (msgs.length) endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  // Ask the backend (grounded on the real forecast/AQI pipeline); if it's
  // unreachable, fall back to the local rules-based responder so chat still works.
  const send = async (text) => {
    const q = (text ?? input).trim(); if (!q) return
    setMsgs(m => [...m, { from: 'user', text: q }]); setInput('')
    const res = await api.assistant({ question: q, context: { location: resolveSlug(location) } })
    const reply = res?.answer || answer(q, { location })
    setMsgs(m => [...m, { from: 'bot', text: reply }])
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-gutter-mobile lg:px-margin-desktop py-space-md">
      {/* Header */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md lg:p-space-lg mb-space-md max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex items-start sm:items-center gap-space-md">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-md shadow-primary/20"><Icon name="eco" className="text-[1.75rem]" fill /></div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-fixed opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-secondary"></span></span>
            </div>
            <div>
              <div className="flex items-center gap-space-xs flex-wrap">
                <h1 className="font-headline-sm text-headline-sm text-on-surface">{T('AtmosIQ Health Assistant')}</h1>
                <span className="px-space-xs py-space-2xs rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm tracking-wide">Airshed Neural v4.2</span>
                <span className="px-space-xs py-space-2xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">Asthma-Tuned</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-2xs mt-space-2xs"><span className="w-2 h-2 rounded-full bg-secondary inline-block"></span><span>Online • Atmospheric Inversion &amp; Dispersion Models Synced (DPCC, SAFAR &amp; CPCB telemetry)</span></p>
            </div>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="bg-surface-container-low px-space-md py-space-xs rounded-lg flex items-center gap-space-xs"><Icon name="air" className="text-primary text-[1.25rem]" /><div className="flex flex-col"><span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{T('Boundary Layer')}</span><span className="font-title text-title text-on-surface">1,120m <span className="text-tertiary font-normal text-body-sm">↘ 380m (6 PM)</span></span></div></div>
            <div className="bg-surface-container-low px-space-md py-space-xs rounded-lg flex items-center gap-space-xs"><Icon name="thermostat" className="text-secondary text-[1.25rem]" /><div className="flex flex-col"><span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{T('Thermal Inversion')}</span><span className="font-title text-title text-error">{T('Critical Nocturnal')}</span></div></div>
            <button onClick={() => setMsgs([])} className="p-space-xs rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant transition-colors" title="Clear thread session"><Icon name="restart_alt" className="text-[1.25rem]" /></button>
          </div>
        </div>
        <div className="mt-space-md pt-space-sm">
          <div className="flex items-center gap-space-2xs text-on-surface-variant font-label-sm text-label-sm mb-space-xs"><Icon name="auto_awesome" className="text-[1rem]" /><span>{T('CURATED REAL-TIME ADVISORIES FOR YOU:')}</span></div>
          <div className="flex items-center gap-space-xs overflow-x-auto pb-space-2xs">
            {CHIPS.map(([ic, cls, text]) => (
              <button key={text} onClick={() => setInput(text)} className="whitespace-nowrap px-space-md py-space-xs rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all shadow-sm flex items-center gap-space-xs"><Icon name={ic} className={`${cls} text-[1.1rem]`} /><span>{text}</span></button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat workspace */}
      <div className="max-w-5xl mx-auto mb-space-md">
        <div className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden min-h-[640px] w-full">
          <div className="flex-1 p-space-md lg:p-space-lg overflow-y-auto space-y-space-lg max-h-[720px]">
            {/* Welcome */}
            <div className="bg-surface-container-low rounded-xl p-space-md flex items-start gap-space-md">
              <Icon name="verified_user" className="text-primary text-[1.5rem] mt-0.5" />
              <div className="space-y-space-2xs">
                <div className="flex items-center gap-space-xs"><span className="font-title text-title text-on-surface">{T('Atmospheric Guard Active')}</span><span className="px-space-xs py-space-2xs bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm rounded-full">{T('Continuous Sync')}</span></div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Analyzing hyper-local dispersion micro-climates, wind shear vectors, and sensor calibrations across 187 nodal monitors in Delhi NCR. Your profile has marked <strong>Mild Asthma / Sensitive Respiratory</strong>.</p>
              </div>
            </div>

            {/* User Q1 */}
            <div className="flex justify-end">
              <div className="max-w-2xl bg-surface-container-high text-on-surface rounded-2xl rounded-tr-none px-space-md py-space-sm shadow-sm space-y-space-xs">
                <div className="flex items-center justify-between gap-space-md"><span className="font-label-sm text-label-sm text-on-surface-variant">You • 5:12 PM</span><Icon name="check_circle" className="text-on-surface-variant text-[1rem]" /></div>
                <p className="font-body-md text-body-md leading-relaxed">I have mild asthma and want to walk from Central Park West to Downtown Tech Hub this evening around 6:30 PM. Is it safe, or should I change route?</p>
              </div>
            </div>

            {/* Rich guidance */}
            <div className="flex items-start gap-space-sm sm:gap-space-md">
              <div className="w-9 h-9 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-on-primary shadow-sm mt-1"><Icon name="neurology" className="text-[1.2rem]" /></div>
              <div className="flex-1 space-y-space-md max-w-3xl">
                <div className="bg-surface-container-low rounded-2xl rounded-tl-none p-space-md shadow-sm space-y-space-sm">
                  <div className="flex items-center justify-between gap-space-xs flex-wrap">
                    <div className="flex items-center gap-space-xs"><span className="font-title text-title text-primary">{T('AtmosIQ Guidance')}</span><span className="font-label-sm text-label-sm text-on-surface-variant">• Confidence 94%</span></div>
                    <span className="px-space-xs py-space-2xs bg-error-container text-on-error-container font-label-sm text-label-sm rounded-full flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error"></span> Direct Route High Inhalation Hazard</span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface leading-relaxed">The standard direct path via Vikas Marg/ITO is <strong>NOT recommended</strong> between 6:00 PM and 9:00 PM. A sharp nocturnal thermal inversion will trap concentrated vehicular tailpipe NOx and diesel ultrafines near ground level.</p>
                  <div className="bg-surface-container rounded-lg p-space-sm flex items-start gap-space-sm">
                    <Icon name="cloud_sync" className="text-tertiary text-[1.25rem] mt-0.5" />
                    <div className="space-y-space-2xs font-body-sm text-body-sm"><span className="font-title text-title text-on-surface block">Atmospheric Boundary Layer Shrinkage</span><p className="text-on-surface-variant">The planetary boundary layer is plummeting from <strong>1,100 meters</strong> at 4:30 PM to only <strong>380 meters</strong> by 6:45 PM. Particulate densities near multi-lane road junctions will surge by +180% within 40 minutes.</p></div>
                  </div>
                </div>

                {/* Trade-off matrix */}
                <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-md space-y-space-md">
                  <div className="flex items-center justify-between"><span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">{T('Spatial Health Trade-Off Matrix')}</span><span className="font-label-sm text-label-sm text-secondary flex items-center gap-1"><Icon name="health_and_safety" className="text-[1rem]" /> {T('Recommended Choice Highlighted')}</span></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between space-y-space-sm hover:bg-surface-container transition-colors">
                      <div>
                        <div className="flex items-center justify-between mb-space-xs"><span className="font-title text-title text-on-surface">Route A: Direct Arterial</span><span className="px-space-xs py-space-2xs bg-error-container text-on-error-container font-label-sm text-label-sm rounded-full">AQI 168 Unhealthy</span></div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Direct path along ITO junction &amp; Outer Ring Corridor.</p>
                      </div>
                      <div className="space-y-space-xs py-space-xs">
                        <Kv k="Est. Travel Time:" v="22 minutes" />
                        <Kv k="PM2.5 Exposure:" v="42 µg/m³ (Severe)" vCls="text-error" />
                        <Kv k="Bronchial Strain Index:" v="High Risk for Asthma" vCls="text-error" />
                      </div>
                      <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden"><div className="bg-error h-full rounded-full" style={{ width: '82%' }}></div></div>
                    </div>
                    <div className="bg-secondary-container/20 rounded-xl p-space-md flex flex-col justify-between space-y-space-sm relative overflow-hidden shadow-sm">
                      <div className="absolute top-0 right-0 bg-secondary text-on-secondary px-space-sm py-space-2xs rounded-bl-lg font-label-sm text-label-sm">{T('Best for Lungs')}</div>
                      <div>
                        <div className="flex items-center justify-between mb-space-xs"><span className="font-title text-title text-on-surface">Route B: Canopy Greenway</span></div>
                        <div className="inline-flex items-center gap-1.5 px-space-xs py-space-2xs bg-surface-container-lowest rounded-full text-secondary font-label-sm text-label-sm mb-space-xs"><span className="w-2 h-2 rounded-full bg-secondary"></span> AQI 48 Good</div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Via Shanti Vana vegetative bio-filter buffer &amp; inner pedestrian lane.</p>
                      </div>
                      <div className="space-y-space-xs py-space-xs">
                        <Kv k="Est. Travel Time:" v="30 mins (+8 mins)" />
                        <Kv k="PM2.5 Exposure:" v="18 µg/m³ (-57% PM2.5)" vCls="text-secondary" />
                        <Kv k="Bronchial Strain Index:" v="Negligible Trigger Risk" vCls="text-secondary" />
                      </div>
                      <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden"><div className="bg-secondary h-full rounded-full" style={{ width: '24%' }}></div></div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs">
                    <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant"><Icon name="check_circle" className="text-secondary text-[1.1rem]" /><span>Route B avoids 3 identified hot-metal construction plumes.</span></div>
                    <button className="w-full sm:w-auto px-space-md py-space-xs rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md transition-all shadow-md flex items-center justify-center gap-space-xs"><Icon name="navigation" className="text-[1.1rem]" /><span>Push Route B to Phone GPS</span></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic appended messages */}
            {msgs.map((m, i) => (
              m.from === 'user' ? (
                <div key={i} className="flex justify-end fade-up">
                  <div className="max-w-2xl bg-surface-container-high text-on-surface rounded-2xl rounded-tr-none px-space-md py-space-sm shadow-sm">
                    <p className="font-body-md text-body-md leading-relaxed">{m.text}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-space-sm sm:gap-space-md fade-up">
                  <div className="w-9 h-9 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-on-primary shadow-sm mt-1"><Icon name="neurology" className="text-[1.2rem]" /></div>
                  <div className="flex-1 max-w-3xl bg-surface-container-low rounded-2xl rounded-tl-none p-space-md shadow-sm">
                    <span className="font-title text-title text-primary">{T('AtmosIQ Guidance')}</span>
                    <p className="font-body-md text-body-md text-on-surface leading-relaxed mt-space-2xs">{m.text}</p>
                  </div>
                </div>
              )
            ))}
            <div ref={endRef} />
          </div>

          {/* Input bar */}
          <div className="p-space-md bg-surface-container-lowest shadow-lg">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between gap-space-xs flex-wrap pb-space-2xs text-on-surface-variant font-label-sm text-label-sm">
                <div className="flex items-center gap-space-xs"><Icon name="my_location" className="text-primary text-[1rem]" /><span>Active Anchor: Central Park West, Delhi NCR</span><span className="text-outline-variant">•</span><span>Micro-sensor #DPCC-09</span></div>
                <div className="flex items-center bg-surface-container-low rounded-full p-0.5">
                  <button onClick={() => setLang('en')} className={`px-space-xs py-space-2xs rounded-full text-label-sm ${lang === 'en' ? 'bg-surface-container-lowest text-on-surface font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>EN</button>
                  <button onClick={() => setLang('hi')} className={`px-space-xs py-space-2xs rounded-full text-label-sm ${lang === 'hi' ? 'bg-surface-container-lowest text-on-surface font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}>हिन्दी</button>
                </div>
              </div>
              <div className="flex items-center gap-space-xs bg-surface-container-low focus-within:bg-surface-container-lowest rounded-2xl p-space-xs transition-all shadow-inner focus-within:shadow-md">
                <button className="w-10 h-10 rounded-xl hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors" title="Upload photo"><Icon name="add_photo_alternate" className="text-[1.25rem]" /></button>
                <button className="w-10 h-10 rounded-xl hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors" title="Voice"><Icon name="mic" className="text-[1.25rem]" /></button>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} autoComplete="off" className="flex-1 bg-transparent px-space-xs py-space-xs font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none" placeholder={lang === 'hi' ? 'हवा की गुणवत्ता, सुरक्षित रास्ते या स्वास्थ्य परामर्श के बारे में पूछें...' : 'Ask about route safety, air forecasts, mask needs, or asthma guidance...'} />
                <button onClick={() => send()} className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-container text-on-primary flex items-center justify-center transition-transform hover:scale-105 shadow-sm"><Icon name="send" className="text-[1.25rem]" /></button>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm px-space-xs"><span>AtmosIQ combines dispersion equations with clinical cardiopulmonary data.</span><span className="text-secondary flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> {T('End-to-end Encrypted Session')}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Kv({ k, v, vCls = 'text-on-surface' }) {
  return (
    <div className="flex items-center justify-between font-label-sm text-label-sm"><span className="text-on-surface-variant">{k}</span><span className={`${vCls} font-bold`}>{v}</span></div>
  )
}
