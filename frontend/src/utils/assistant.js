// Rules/keyword-based assistant. Mirrors the backend POST /api/assistant/query
// contract: takes a question + context, returns a data-grounded templated reply.
import { TODAY, TOMORROW, OPTIMAL_WINDOW, STATIONS } from '../data/mockData'
import { aqiLabel } from './aqi'

export function answer(question, ctx = {}) {
  const q = (question || '').toLowerCase()
  const loc = ctx.location || 'Anand Vihar'
  const st = STATIONS.find(s => s.name === loc) || STATIONS[0]

  if (/(jog|run|exercise|workout|walk|cycle)/.test(q)) {
    return `With AQI ${TODAY.aqi} (${TODAY.label}) in ${loc} right now, intense outdoor exercise isn't recommended. Your safest window today is ${OPTIMAL_WINDOW.time} (AQI ~${OPTIMAL_WINDOW.aqi}). Keep it light and wear an N95 if you head out.`
  }
  if (/(window|ventilat|open|air out)/.test(q)) {
    return `Best time to open windows today is ${OPTIMAL_WINDOW.time}, when the boundary layer lifts and westerly wind clears pollutants (AQI dips to ~${OPTIMAL_WINDOW.aqi}). Keep them shut overnight and early morning during the inversion.`
  }
  if (/(route|noida|travel|drive|commute|go to)/.test(q)) {
    return `For lowest-exposure travel, favour routes via Dwarka/outer ring corridors — they read ~214 AQI vs 320+ through central hotspots. Head to Health-Safe Routes to plan From→To with live AQI along the path and construction-zone detours.`
  }
  if (/(mask|n95|protect)/.test(q)) {
    return `At AQI ${TODAY.aqi}, wear a well-fitted N95/FFP2 outdoors. Cloth masks don't filter PM2.5. Limit time outside and prefer indoor spaces with a purifier.`
  }
  if (/(tomorrow|forecast|next|72|three day)/.test(q)) {
    return `Tomorrow's forecast for ${loc} is AQI ${TOMORROW.aqi} (${TOMORROW.label}), peaking ${TOMORROW.peak}. Conditions ease slightly midday. The 72-hour trend shows gradual improvement as wind speed picks up.`
  }
  if (/(aqi|air|pollution|pm2|quality|how bad|current)/.test(q)) {
    return `Current AQI in ${loc} is ${st.aqi} (${aqiLabel(st.aqi)}). PM2.5 is ${st.pm25} µg/m³, PM10 ${st.pm10} µg/m³. ${st.change < 0 ? 'Improving' : 'Worsening'} over the last 6 hours.`
  }
  if (/(stubble|fire|burning|farm)/.test(q)) {
    return `NASA FIRMS shows active stubble-burning hotspots in Sangrur, Patiala (Punjab) and Kurukshetra, Karnal (Haryana). Northwesterly winds are transporting that smoke into Delhi-NCR, adding to PM2.5.`
  }
  if (/(grap|advisory|restriction)/.test(q)) {
    return `Delhi-NCR is under GRAP Stage III: non-essential construction and BS-III/IV diesel vehicles are restricted, and schools may run hybrid. Check the GRAP banner up top for the live stage.`
  }
  return `Right now ${loc} is at AQI ${st.aqi} (${aqiLabel(st.aqi)}). Ask me about the best time to go out, whether it's safe to exercise, a low-exposure route, or the 72-hour forecast.`
}

export const SUGGESTIONS = [
  "What's AQI in my area?",
  'Can I safely jog today?',
  'Best time to open windows?',
  'Find lowest-exposure route to Noida',
]
