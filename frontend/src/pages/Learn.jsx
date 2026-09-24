import { useState } from 'react'
import Icon from '../components/Icon'

const TOPICS = [
  { icon: 'speed', tag: 'Fundamentals', title: 'What is AQI?', read: '3 min read', desc: 'How the Indian National Air Quality Index aggregates six criteria pollutants into a single number you can act upon.', body: 'The AQI converts concentrations of PM2.5, PM10, O₃, NO₂, SO₂ and CO into one 0–500 number. The highest sub-index across pollutants sets the overall AQI, so a single dominant pollutant drives the reading.' },
  { icon: 'grain', tag: 'Particulate Science', title: 'Understanding PM2.5 & PM10', read: '4 min read', desc: 'The physical differences between inhalable dust particles and deep-lung aerosols, and why micron size matters.', body: 'PM10 are coarse particles (≤10 µm) from dust and construction; PM2.5 are fine particles (≤2.5 µm) from combustion and stubble burning. PM2.5 penetrates deep into the lungs and bloodstream, making it the most dangerous.' },
  { icon: 'layers', tag: 'Meteorology', title: 'What is Atmospheric Inversion?', read: '5 min read', desc: 'Why evening cold air caps trap vehicular and industrial exhaust near ground level across the Indo-Gangetic plain.', body: 'Normally air cools with height. In winter a warm layer can sit above cooler surface air (an inversion), acting like a lid that traps pollutants near the ground. Delhi\'s worst smog coincides with strong nighttime inversions and low wind.' },
  { icon: 'agriculture', tag: 'Regional Transboundary', title: 'Stubble Burning Explained', read: '4 min read', desc: 'Seasonal post-harvest crop residue fires in Punjab and Haryana and how northwest winds transport transboundary plumes.', body: 'After the paddy harvest (Oct–Nov), farmers in Punjab & Haryana burn crop residue. Northwesterly winds carry the smoke into Delhi-NCR, spiking PM2.5. NASA FIRMS satellites detect these hotspots in near real-time.' },
  { icon: 'policy', tag: 'Civic Policy', title: 'GRAP Stages Explained', read: '6 min read', desc: 'A plain-language guide to the Graded Response Action Plan (Stage I to IV) and municipal curbs triggered at each threshold.', body: 'GRAP triggers restrictions by severity: Stage I (Poor) to Stage IV (Severe+). Measures escalate from dust control to construction bans, vehicle restrictions, and school closures.' },
  { icon: 'health_and_safety', tag: 'Health Protocols', title: 'Protecting Vulnerable Groups', read: '5 min read', desc: 'Actionable protection protocols for children, senior citizens, expectant mothers, and chronic respiratory patients.', body: 'Children, the elderly, pregnant women, and people with asthma/COPD/heart disease are most affected. They should limit outdoor exposure, use N95 masks, run air purifiers, and keep rescue medication accessible on high-AQI days.' },
]

const TABLE = [
  ['0 – 50', 'Good', '0 – 30 µg/m³', '0 – 50 µg/m³', 'Minimal impact. Air quality is ideal for all outdoor fitness, runs, and unrestrained children\'s park activities.', 'bg-secondary-container/40 text-secondary', 'bg-secondary'],
  ['51 – 100', 'Satisfactory', '31 – 60 µg/m³', '51 – 100 µg/m³', 'Minor breathing discomfort to highly sensitive individuals. Open room ventilation recommended during midday wind peaks.', 'bg-secondary-fixed-dim/40 text-on-secondary-fixed-variant', 'bg-secondary-fixed-dim'],
  ['101 – 200', 'Moderate', '61 – 90 µg/m³', '101 – 250 µg/m³', 'Breathing discomfort to people with asthma and cardiovascular conditions. Plan intense workouts away from arterial congestion corridors.', 'bg-tertiary-fixed-dim/40 text-on-tertiary-fixed-variant', 'bg-tertiary-fixed-dim'],
  ['201 – 300', 'Poor', '91 – 120 µg/m³', '251 – 350 µg/m³', 'Breathing discomfort to most people on prolonged outdoor exposure. Switch to AtmosIQ Green Commute corridors; wear certified N95 outdoors.', 'bg-tertiary-container/30 text-tertiary-container', 'bg-tertiary-container'],
  ['301 – 400', 'Very Poor', '121 – 250 µg/m³', '351 – 430 µg/m³', 'Respiratory illness likely on prolonged exposure. GRAP Stage II/III restrictions take effect. Vulnerable groups must remain indoors.', 'bg-error-container text-error', 'bg-error'],
  ['401 – 500+', 'Severe', '250+ µg/m³', '430+ µg/m³', 'Emergency atmospheric status. Seriously impairs healthy adults. Run HEPA air purifiers continuously, seal windows, avoid all non-essential outdoor transit.', 'bg-error/15 text-error', 'bg-on-error-container'],
]

const FAQ = [
  ['Is it safe to exercise outdoors in the morning or evening?', 'During winter months in Delhi-NCR, early mornings and late evenings typically feature shallow planetary boundary layers and nocturnal thermal inversions that trap tailpipe particulates close to the ground. If you must exercise outdoors, aim for the midday window (between 12:00 PM and 4:00 PM) when solar heating lifts the boundary layer.'],
  ['How is the National AQI calculated in India?', 'India\'s AQI aggregates eight pollutants (PM2.5, PM10, NO₂, SO₂, CO, O₃, NH₃, Pb) into sub-indices; the worst sub-index becomes the reported AQI. It requires a minimum number of monitored pollutants for a valid reading.'],
  ['What type of mask actually filters toxic winter smog?', 'Only well-fitted N95/FFP2 respirators filter PM2.5 effectively. Cloth and surgical masks do not seal well enough to block fine particulates.'],
  ['Why do indoor air levels sometimes mirror outdoor pollution?', 'Without sealing and filtration, outdoor PM2.5 infiltrates through gaps and open windows. Indoor levels can reach 60–80% of outdoor concentrations unless a HEPA purifier runs with windows shut.'],
  ['How does AtmosIQ predict air quality 24 to 48 hours in advance?', 'AtmosIQ couples meteorological forecasts (wind, boundary-layer height, temperature) with a machine-learning model trained on historical CPCB and ERA5 data, plus satellite fire detection, to project AQI area-by-area with bias correction.'],
  ['What should I do if my child has asthma during a GRAP Stage III notice?', 'Keep them indoors with an air purifier, ensure rescue medication is accessible, avoid outdoor school activities, and consult a pediatric pulmonologist if symptoms escalate.'],
]

export default function Learn() {
  const [open, setOpen] = useState(null)
  const [faq, setFaq] = useState(0)

  return (
    <div className="relative">
      {/* Header */}
      <section className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop pt-space-2xl pb-space-xl">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-low text-primary shadow-sm mb-space-md"><span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span><span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Public Knowledge Hub</span></div>
          <h1 className="font-display text-display text-on-surface tracking-tight mb-space-sm">Understand Air Quality</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">Clear, scientifically grounded guidance to help you navigate Delhi-NCR air shed dynamics, protect your respiratory health, and make informed daily transit choices.</p>
        </div>
      </section>

      {/* Topic grid */}
      <section className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-xl">
        <div className="flex items-end justify-between mb-space-lg">
          <div><span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Core Curriculum</span><h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">Essential Foundations</h2></div>
          <div className="hidden sm:flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md"><span className="w-2 h-2 rounded-full bg-secondary"></span><span>Peer-reviewed by Environmental Clinicians</span></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {TOPICS.map((t, i) => (
            <article key={i} onClick={() => setOpen(open === i ? null : i)} className="group flex flex-col justify-between bg-surface-container-lowest rounded-xl p-space-lg shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_32px_-4px_rgba(13,148,136,0.12)] transition-all duration-300 cursor-pointer">
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center group-hover:bg-primary-fixed transition-colors"><Icon name={t.icon} className="text-[26px]" /></div>
                  <span className="px-space-sm py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">{t.tag}</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface tracking-tight mb-space-xs group-hover:text-primary transition-colors">{t.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{t.desc}</p>
                {open === i && <p className="font-body-sm text-body-sm text-on-surface mt-space-sm fade-up border-t border-surface-container pt-space-sm">{t.body}</p>}
              </div>
              <div className="flex items-center justify-between pt-space-lg mt-space-md">
                <span className="font-label-sm text-label-sm text-outline flex items-center gap-1"><Icon name="schedule" className="text-[16px]" /> {t.read}</span>
                <span className="inline-flex items-center gap-1 font-label-md text-label-md text-primary group-hover:translate-x-0.5 transition-transform"><span>{open === i ? 'Close' : 'Explore Guide'}</span><Icon name="arrow_forward" className="text-[18px]" /></span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Featurette */}
      <section className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-md">
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-space-xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col lg:flex-row items-center justify-between gap-space-xl">
          <div className="max-w-xl">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Live Aerosol Physics</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-1 mb-space-xs">Why Delhi Traps Smog: The Planetary Boundary Layer</h3>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">In summer, warm surface air lofts pollutants up to 2,000 meters high. In winter, radiation cooling shrinks this mixing layer down to merely 150 meters, concentrating ambient tailpipe emissions by up to 12× over short evening windows.</p>
            <div className="flex items-center gap-space-lg mt-space-md text-on-surface">
              <div><span className="font-metric-stat text-metric-stat text-primary block">~150m</span><span className="font-label-sm text-label-sm text-on-surface-variant">Winter Boundary Height</span></div>
              <div><span className="font-metric-stat text-metric-stat text-secondary block">1,800m</span><span className="font-label-sm text-label-sm text-on-surface-variant">Summer Boundary Height</span></div>
              <div><span className="font-metric-stat text-metric-stat text-tertiary block">12.4x</span><span className="font-label-sm text-label-sm text-on-surface-variant">Particulate Compression</span></div>
            </div>
          </div>
          <div className="w-full lg:w-80 shrink-0">
            <div className="w-full h-56 rounded-xl shadow-sm bg-gradient-to-br from-secondary-container via-tertiary-fixed to-inverse-surface flex items-center justify-center overflow-hidden relative">
              <svg viewBox="0 0 320 220" className="w-full h-full">
                <rect width="160" height="220" fill="#89f5e7" opacity="0.5" />
                <rect x="160" width="160" height="220" fill="#213145" opacity="0.85" />
                <text x="80" y="30" textAnchor="middle" fill="#00201d" fontSize="11" fontWeight="700">Daytime</text>
                <text x="240" y="30" textAnchor="middle" fill="#eaf1ff" fontSize="11" fontWeight="700">Nighttime</text>
                {[0,1,2,3].map(i => <line key={i} x1={30+i*35} y1="180" x2={45+i*35} y2="60" stroke="#00685f" strokeWidth="2" markerEnd="" />)}
                <line x1="175" y1="120" x2="305" y2="120" stroke="#ffb95f" strokeWidth="3" strokeDasharray="6 5" />
                <text x="240" y="150" textAnchor="middle" fill="#ffddb8" fontSize="9">Inversion ceiling</text>
                <rect x="175" y="150" width="130" height="55" fill="#ba1a1a" opacity="0.4" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* AQI scale table */}
      <section className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-2xl">
        <div className="text-center max-w-2xl mx-auto mb-space-xl">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Standardized Metrics</span>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1 mb-space-xs">National AQI Scale Reference</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Health advisories and actionable guidance across standardized Indian National Air Quality Index categories based on Central Pollution Control Board criteria.</p>
        </div>
        <div className="w-full mb-space-lg">
          <div className="grid grid-cols-6 rounded-full overflow-hidden shadow-sm h-3 sm:h-4">
            <div className="bg-secondary-container"></div><div className="bg-secondary-fixed-dim"></div><div className="bg-tertiary-fixed-dim"></div><div className="bg-tertiary-container"></div><div className="bg-error"></div><div className="bg-on-error-container"></div>
          </div>
          <div className="hidden sm:grid grid-cols-6 text-center mt-2 font-label-sm text-label-sm text-on-surface-variant">
            <span>0–50 Good</span><span>51–100 Satisfactory</span><span>101–200 Moderate</span><span>201–300 Poor</span><span>301–400 Very Poor</span><span>401–500+ Severe</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-surface-container-low text-on-surface font-label-md text-label-md">
                <th className="py-space-md px-space-lg">AQI Band</th><th className="py-space-md px-space-lg">Category</th><th className="py-space-md px-space-lg">PM2.5 (24h)</th><th className="py-space-md px-space-lg">PM10 (24h)</th><th className="py-space-md px-space-lg">Health Advisory &amp; Citizen Action</th>
              </tr></thead>
              <tbody className="text-on-surface-variant font-body-sm text-body-sm">
                {TABLE.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-container/50 transition-colors border-t border-surface-container">
                    <td className="py-space-md px-space-lg whitespace-nowrap"><span className={`inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full font-label-sm text-label-sm font-bold ${r[5]}`}><span className={`w-2 h-2 rounded-full ${r[6]}`}></span> {r[0]}</span></td>
                    <td className="py-space-md px-space-lg font-title text-title text-on-surface">{r[1]}</td>
                    <td className="py-space-md px-space-lg whitespace-nowrap">{r[2]}</td>
                    <td className="py-space-md px-space-lg whitespace-nowrap">{r[3]}</td>
                    <td className="py-space-md px-space-lg text-on-surface leading-relaxed">{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[900px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop py-space-xl">
        <div className="text-center max-w-2xl mx-auto mb-space-xl">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Clear Clarifications</span>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1 mb-space-xs">Frequently Asked Questions</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Practical answers to common day-to-day decisions faced by NCR residents during peak pollution cycles.</p>
        </div>
        <div className="flex flex-col gap-space-sm">
          {FAQ.map(([q, a], i) => (
            <div key={i} className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] overflow-hidden">
              <button onClick={() => setFaq(faq === i ? null : i)} className="w-full flex items-center justify-between gap-space-md p-space-md text-left">
                <span className="font-title text-title text-on-surface">{q}</span>
                <Icon name={faq === i ? 'expand_less' : 'expand_more'} className="text-on-surface-variant text-[1.5rem] shrink-0" />
              </button>
              {faq === i && <p className="px-space-md pb-space-md font-body-md text-body-md text-on-surface-variant leading-relaxed fade-up">{a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Data integrity strip */}
      <section className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-tablet lg:px-margin-desktop pb-space-2xl">
        <div className="bg-surface-container-low rounded-2xl p-space-lg flex flex-col md:flex-row md:items-center gap-space-md justify-between">
          <div className="flex items-center gap-space-sm max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"><Icon name="verified_user" className="text-[1.4rem]" /></div>
            <div><h4 className="font-title text-title text-on-surface font-bold">Government &amp; Clinical Data Integrity</h4><p className="font-body-sm text-body-sm text-on-surface-variant">AtmosIQ syncs continuously across institutional scientific nodes.</p></div>
          </div>
          <div className="grid grid-cols-2 gap-space-sm font-label-sm text-label-sm text-on-surface-variant">
            {['CPCB & DPCC Feeds','AIIMS Health Directives','100m² Microclimate Grid','Continuous Telemetry Sync'].map(x => (
              <span key={x} className="flex items-center gap-space-xs"><span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>{x}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
