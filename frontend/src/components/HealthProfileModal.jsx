import { useState } from 'react'
import { useApp } from '../context/AppContext'
import Icon from './Icon'

const HERO_BG = "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAopDUS8yUDLr5Eo2zqmZPIZMo7ZkZon3IRrn4hkGsTiJ-p9iHpi5snG4tJHEmCYT8W838G7aciRHR-noztDoSv5hqQatplxieQzTwDRyrSqAvnDZtuVBW0Gi5faciRYxKhkx75a9b-BAE85vfai2DyUa-TkQlE5YuEtEF6ReboxH3VWaoU7UIxiLKBMaq1V6VxCqlrMhiYB1-Jf40EopIqojRoBKIjqEyIZjoLdVL6dIzx9FpktkRU')"

const AGES = [['young_adult', '18–35', 'Young Adult'], ['adult', '36–60', 'Adult'], ['senior', '60+', 'Senior'], ['youth', '< 18', 'Child / Youth']]
const CONDITIONS = [
  ['asthma', 'pulmonology', 'Asthma'],
  ['allergies', 'grain', 'Seasonal Allergies / Hay Fever'],
  ['copd', 'air', 'COPD'],
  ['cardio', 'cardiology', 'Cardiovascular Sensitivity'],
  ['none', 'nature_people', 'None / General Wellness'],
]
const ACTIVITIES = [
  ['walking', 'directions_walk', 'Walking & Jogging', 'Parks, sidewalks & neighborhood paths'],
  ['cycling', 'pedal_bike', 'Cycling / Micro-mobility', 'Bike corridors & urban bike lanes'],
  ['running', 'sprint', 'Running / Outdoor Cardio', 'High-ventilation training routes'],
  ['driving', 'directions_car', 'Driving / In-Vehicle', 'Cabin filter & highway air optimization'],
]
const SENS = [
  ['low', 'Standard Citizen', 'Low Sensitivity', 'Reroutes only during severe air spikes (AQI > 120). Maximizes direct speed and direct distance.', 'speed', 'Fast travel emphasis', 'bg-secondary', null],
  ['moderate', 'Preventative Care', 'Moderate Level', 'Avoids prolonged arterial street exposure (AQI > 80). Adds 3-5 minutes for cleaner corridors.', 'balance', 'Balanced wellness', 'bg-tertiary-container', null],
  ['high', null, 'High Sensitivity', 'Aggressive canopy-first routing (AQI > 50 threshold). Early alerts for particulate surges and ozone.', 'shield', 'Maximum lung shield', 'bg-primary-fixed', 'Recommended for Asthma'],
]

export default function HealthProfileModal({ onClose }) {
  const { profile, saveProfile } = useApp()
  const [age, setAge] = useState(profile?.ageRaw || 'young_adult')
  const [conditions, setConditions] = useState(profile?.conditionsList || ['asthma', 'allergies'])
  const [activities, setActivities] = useState(profile?.activities || ['walking', 'cycling'])
  const [sensitivity, setSensitivity] = useState(profile?.sensitivityRaw || 'high')

  const toggleCond = (v) => setConditions(prev => v === 'none'
    ? (prev.includes('none') ? [] : ['none'])
    : prev.includes(v) ? prev.filter(x => x !== v) : [...prev.filter(x => x !== 'none'), v])
  const toggleAct = (v) => setActivities(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  const save = () => {
    const ageMap = { young_adult: 'adult', adult: 'adult', senior: 'senior', youth: 'child' }
    const sensMap = { low: 'low', moderate: 'medium', high: 'high' }
    const realConds = conditions.filter(c => c !== 'none')
    saveProfile({
      age: ageMap[age],
      conditions: realConds.length ? realConds.join(', ') : 'none',
      activity: activities.includes('running') ? 'high' : activities.includes('walking') || activities.includes('cycling') ? 'moderate' : 'low',
      sensitivity: sensMap[sensitivity],
      // raw values so re-opening restores the exact selection
      ageRaw: age, conditionsList: conditions, activities, sensitivityRaw: sensitivity,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-inverse-surface/45 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-space-md sm:p-space-lg" onClick={onClose}>
      <div className="w-full max-w-3xl my-space-md bg-surface-container-lowest rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(0,104,95,0.18),0_4px_16px_rgba(11,28,48,0.06)] overflow-hidden relative flex flex-col fade-up" onClick={e => e.stopPropagation()}>
        {/* Hero */}
        <div className="relative w-full h-56 md:h-64 bg-gradient-to-br from-primary-container via-primary to-surface-tint flex flex-col justify-end p-space-lg md:p-space-xl overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-35" style={{ backgroundImage: HERO_BG }}></div>
          <button onClick={onClose} className="absolute top-5 left-5 z-20 w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-on-surface flex items-center justify-center shadow-sm hover:bg-surface-container-lowest transition-colors"><Icon name="close" className="text-[1.1rem]" /></button>
          <div className="absolute top-6 right-6 flex items-center gap-space-xs bg-surface-container-lowest/90 backdrop-blur-md px-space-md py-space-2xs rounded-full shadow-sm">
            <Icon name="verified_user" className="text-primary text-[18px]" /><span className="font-label-sm text-label-sm text-primary font-semibold">1-Time Atmospheric Calibrator</span>
          </div>
          <div className="relative z-10 text-on-primary max-w-xl">
            <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-primary-fixed/25 text-on-primary font-label-sm text-label-sm mb-space-xs backdrop-blur-sm"><Icon name="spa" className="text-[15px]" /><span>Step 1 of 1 • Tailored Protection</span></div>
            <h1 className="font-headline-lg text-headline-lg text-on-primary tracking-tight leading-tight">Personalize Your AtmosIQ Guard</h1>
            <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-primary-fixed mt-space-xs opacity-95">Set your health profile once to get personalized clean-air routing and automated pollution exposure warnings.</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-space-lg md:p-space-xl flex flex-col gap-space-xl">
          {/* 1 Age */}
          <Section n="1" title="Age Demographic" hint="Influences respiratory tidal volume">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
              {AGES.map(([v, big, sub]) => (
                <button key={v} onClick={() => setAge(v)} className={`h-full flex flex-col items-center justify-center text-center p-space-sm rounded-xl shadow-sm transition-all duration-200 ${age === v ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
                  <span className="font-label-md text-label-md">{big}</span>
                  <span className="font-body-sm text-[12px] opacity-80 mt-0.5">{sub}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* 2 Conditions */}
          <Section n="2" title="Respiratory & Health Conditions" hint="Select all that apply" hintCls="text-primary font-semibold">
            <div className="flex flex-wrap gap-space-xs">
              {CONDITIONS.map(([v, ic, label]) => {
                const on = conditions.includes(v)
                return (
                  <button key={v} onClick={() => toggleCond(v)} className={`flex items-center gap-space-xs px-space-md py-space-xs rounded-full shadow-sm transition-all duration-200 ${on ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
                    <Icon name={ic} className="text-[18px]" /><span className="font-label-md text-label-md">{label}</span>
                    {on && <Icon name="check" className="text-[16px] ml-1" />}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* 3 Activities */}
          <Section n="3" title="Primary Commute & Activity Types" hint="Multi-select daily transit modes">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
              {ACTIVITIES.map(([v, ic, title, sub]) => {
                const on = activities.includes(v)
                return (
                  <button key={v} onClick={() => toggleAct(v)} className={`text-left p-space-md rounded-xl shadow-sm transition-all duration-200 flex items-center justify-between ${on ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0"><Icon name={ic} className="text-[22px]" /></div>
                      <div><div className="font-label-md text-label-md font-semibold">{title}</div><div className="font-body-sm text-[12px] opacity-80">{sub}</div></div>
                    </div>
                    <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} className={`text-[20px] ${on ? 'text-on-primary-container' : 'text-outline-variant'}`} />
                  </button>
                )
              })}
            </div>
          </Section>

          {/* 4 Sensitivity */}
          <Section n="4" title="Environmental Sensitivity Level" hint="Sets dynamic rerouting threshold">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
              {SENS.map(([v, eyebrow, title, desc, ic, foot, dot, badge]) => {
                const on = sensitivity === v
                return (
                  <button key={v} onClick={() => setSensitivity(v)} className={`text-left w-full flex flex-col justify-between p-space-md rounded-2xl transition-all duration-200 ${on ? 'bg-primary-container text-on-primary-container shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between gap-2">
                        {badge
                          ? <span className="px-space-xs py-0.5 rounded-full bg-surface-container-lowest text-primary font-label-sm text-[11px] font-bold">{badge}</span>
                          : <span className={`font-label-md text-label-md ${on ? 'text-on-primary-container' : 'text-on-surface'}`}>{eyebrow}</span>}
                        <span className={`w-2.5 h-2.5 rounded-full ${dot}`}></span>
                      </div>
                      <div className={`font-headline-sm text-headline-sm font-bold ${on ? 'text-on-primary-container' : 'text-on-surface'}`}>{title}</div>
                      <p className={`font-body-sm text-[12px] leading-relaxed ${on ? 'text-primary-fixed' : 'text-on-surface-variant'}`}>{desc}</p>
                    </div>
                    <div className={`mt-space-md pt-space-xs font-label-sm text-label-sm flex items-center gap-1 ${on ? 'text-on-primary-container' : 'text-on-surface-variant'}`}><Icon name={ic} className="text-[16px]" /> {foot}</div>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Privacy */}
          <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-surface-container-low text-on-surface-variant">
            <Icon name="lock" className="text-primary text-[20px] shrink-0 mt-0.5" />
            <p className="font-body-sm text-[12.5px] leading-relaxed">Your health data is stored privately on-device and coupled directly to our local atmospheric aerosol forecast model. No personal biometrics are transmitted to ad networks or third parties.</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-sm">
            <button onClick={onClose} className="order-2 sm:order-1 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-space-xs px-space-sm rounded-full">Skip for now (Standard AQI Mode)</button>
            <button onClick={save} className="order-1 sm:order-2 w-full sm:w-auto px-space-xl py-space-md rounded-xl bg-primary text-on-primary font-headline-sm text-headline-sm shadow-md hover:shadow-lg hover:bg-surface-tint transition-all duration-200 flex items-center justify-center gap-space-xs">
              <span>Save Profile &amp; Calculate Safe Routes</span><Icon name="arrow_forward" className="text-[20px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ n, title, hint, hintCls = 'text-on-surface-variant', children }) {
  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="font-title text-title text-on-surface flex items-center gap-space-xs">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container text-primary font-label-sm text-label-sm shrink-0">{n}</span>{title}
        </div>
        <span className={`font-label-sm text-label-sm ${hintCls} text-right`}>{hint}</span>
      </div>
      {children}
    </div>
  )
}
