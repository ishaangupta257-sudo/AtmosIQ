// POST /api/assistant/query — a grounded rule-based responder.
//
// Answers a broad range of questions using REAL pipeline data: current AQI,
// the bias-corrected forecast, SHAP drivers, live weather, city-wide rankings,
// fire hotspots and GRAP status. It also resolves a location mentioned in the
// question itself (e.g. "AQI in Dwarka") before answering.
// (Swap this for an LLM behind the same interface without touching routes.)
import { current, forecast, explain, weather, locations, fires } from '../mlClient.js';
import { aqiCategory, grapStage } from '../aqi.js';

const DEFAULT_LOC = 'anand-vihar';

// Area names / aliases → modelled station slug.
const ALIASES = {
  'anand vihar': 'anand-vihar', 'anand': 'anand-vihar',
  'r.k. puram': 'rk-puram', 'rk puram': 'rk-puram', 'rkpuram': 'rk-puram',
  dwarka: 'dwarka', noida: 'noida-62', 'sec-62': 'noida-62', 'sector 62': 'noida-62',
  gurugram: 'gurugram', gurgaon: 'gurugram', rohini: 'rohini',
  faridabad: 'faridabad', ito: 'ito', cp: 'ito', 'connaught': 'ito',
};

function extractLocation(q, ctx = {}) {
  for (const [k, slug] of Object.entries(ALIASES)) if (q.includes(k)) return slug;
  return ctx.location || DEFAULT_LOC;
}

const clock = (iso) => (iso ? iso.slice(11, 16) : '');

export async function answer({ question = '', context = {} }) {
  const q = question.toLowerCase().trim();
  const loc = extractLocation(q, context);
  const cur = await current(loc);
  const say = (answer, data = {}) => ({ answer, data, grounded: true });

  // greeting
  if (/^(hi|hello|hey|namaste|yo|hola|good (morning|evening|afternoon))\b/.test(q)) {
    return say(`Hello! I'm the AtmosIQ assistant. Right now ${cur.name} is at AQI ${cur.aqi} (${cur.category}). Ask me about the forecast, the cleanest time to go out, whether it's safe to exercise, or why the air is like this.`);
  }
  // capabilities / help
  if (/(what can you|who are you|help me|capab|how do you work|what do you do)/.test(q)) {
    return say(`I answer air-quality questions grounded in AtmosIQ's live model: current AQI & pollutants for any Delhi-NCR station, the 72-hour forecast and cleanest window, why AQI is rising/falling (SHAP drivers), wind & weather, the most and least polluted areas right now, stubble-fire influence, GRAP restrictions, and health/mask/exercise advice. Try "Is it safe to jog in Dwarka?" or "When is the cleanest window today?"`);
  }
  // thanks
  if (/^(thanks|thank you|thx|great|cool|nice|ok|okay)\b/.test(q)) {
    return say(`Anytime. Stay safe — ${cur.name} is ${cur.category.toLowerCase()} (AQI ${cur.aqi}) right now.`);
  }
  // fires / stubble
  if (/(stubble|fire|burning|farm|punjab|haryana|smoke)/.test(q)) {
    const f = await fires();
    return say(`NASA FIRMS shows ${f.length} active fire hotspot${f.length === 1 ? '' : 's'} in the Punjab/Haryana stubble belt${f[0] ? ` (e.g. ${f[0].place})` : ''}. North-westerly winds transport that smoke into Delhi-NCR, adding to PM2.5. It's one of the drivers in the model's forecast for ${cur.name}.`, { fires: f.length });
  }
  // GRAP / restrictions
  if (/(grap|restriction|\bban\b|advisory|which stage|what stage)/.test(q)) {
    const stage = grapStage(cur.aqi);
    const desc = cur.aqi > 400 ? 'non-essential construction & BS-III/IV diesel are restricted; schools may go hybrid'
      : cur.aqi > 300 ? 'diesel-generator curbs and intensified dust control apply'
      : cur.aqi > 200 ? 'dust control at construction sites and mechanised road sweeping apply'
      : 'no major GRAP curbs are active';
    return say(`At ${cur.name} (AQI ${cur.aqi}) the indicative GRAP level is ${stage === 'None' ? 'below Stage I' : stage} — ${desc}. Check the banner at the top for the live city-wide stage.`, { grap: stage });
  }
  // compare across the city — worst / cleanest AREA (not "cleanest window")
  if (/(worst|most pollut|highest|dirtiest|cleanest area|best area|least pollut|which area|compare area|safest area)/.test(q)) {
    const { locations: list = [] } = { locations: await locations() };
    if (list.length) {
      const worst = list.reduce((m, l) => (l.aqi > m.aqi ? l : m), list[0]);
      const best = list.reduce((m, l) => (l.aqi < m.aqi ? l : m), list[0]);
      return say(`Right now the most polluted monitored area is ${worst.name} (AQI ${worst.aqi}, ${worst.category}) and the cleanest is ${best.name} (AQI ${best.aqi}, ${best.category}). ${cur.name} is at ${cur.aqi}.`, { worst, best });
    }
  }
  // wind / weather / temperature / humidity  (uses the /weather endpoint)
  // \bwind\b so "window" (a forecast question) doesn't match here.
  if (/(\bwind\b|weather|temperature|\btemp\b|humid|breeze|dispersion)/.test(q)) {
    const w = await weather(loc);
    const disp = w.wind_speed > 10 ? 'good dispersion — pollutants clear faster' : 'weak dispersion — pollutants accumulate near the surface';
    return say(`${cur.name}: ${w.temp}°C, humidity ${w.humidity}%, wind ${w.wind_speed} km/h. That means ${disp}. Current AQI is ${cur.aqi} (${cur.category}).`, { weather: w });
  }
  // pollutant-specific
  if (/(pm2|pm 2|pm10|pm 10|no2|nitrogen|ozone|\bo3\b|particulate)/.test(q)) {
    const p = cur.pollutants || {};
    return say(`At ${cur.name} — PM2.5 ${Math.round(p.pm25)} µg/m³, PM10 ${Math.round(p.pm10)} µg/m³, NO₂ ${Math.round(p.no2)} µg/m³, O₃ ${Math.round(p.o3)} µg/m³. Composite AQI ${cur.aqi} (${cur.category}), driven mainly by PM2.5.`, { pollutants: p });
  }
  // health / mask / exercise / children
  if (/(mask|n95|safe|exercise|run|jog|walk|cycle|child|kid|elderly|asthma|outdoor|breath|lung)/.test(q)) {
    const stage = grapStage(cur.aqi);
    const advice = cur.aqi > 300
      ? 'Avoid outdoor exertion; wear an N95 outside and run a purifier indoors. Children, elderly and asthmatics should stay in.'
      : cur.aqi > 200 ? 'Limit prolonged outdoor exertion; sensitive groups should wear an N95 and prefer the mid-afternoon window.'
      : cur.aqi > 100 ? 'Generally OK for short activity; sensitive individuals should keep it light and carry a mask.'
      : 'Outdoor activity is fine for most people right now.';
    return say(`AQI at ${cur.name} is ${cur.aqi} (${cur.category}${stage !== 'None' ? `, GRAP ${stage}` : ''}). ${advice}`, { aqi: cur.aqi, grap: stage });
  }
  // forecast / tomorrow / cleanest window
  if (/(forecast|tomorrow|next|later|when|window|clean|evening|morning|tonight|hours)/.test(q)) {
    const fc = await forecast(loc);
    const next24 = fc.forecast.slice(0, 24);
    const best = next24.reduce((m, r) => (r.aqi < m.aqi ? r : m), next24[0]);
    const worst = next24.reduce((m, r) => (r.aqi > m.aqi ? r : m), next24[0]);
    return say(`At ${cur.name}, AQI is ${cur.aqi} (${cur.category}) now. Over the next 24h the model expects a peak of ${worst.aqi} around ${clock(worst.at)} and the cleanest air (~${best.aqi}) around ${clock(best.at)} — the best window for outdoor activity.`, { current: cur.aqi, best, worst });
  }
  // why / drivers
  if (/(why|cause|driver|reason|explain|because|behind)/.test(q)) {
    const ex = await explain(loc);
    return say(ex.narrative || `AQI at ${cur.name} is ${cur.aqi}, driven mainly by fine-particulate accumulation under weak wind.`, { drivers: ex.drivers });
  }
  // current AQI
  if (/(aqi|air|pollution|quality|how bad|current|now|status|level)/.test(q)) {
    const p = cur.pollutants || {};
    return say(`Current AQI at ${cur.name} is ${cur.aqi} — ${cur.category}. PM2.5 ${Math.round(p.pm25)} µg/m³, wind ${cur.weather?.wind_speed} km/h. Ask about the forecast, the cleanest window, or why it's like this.`, { current: cur });
  }
  // helpful fallback
  return say(`I can help with air quality for ${cur.name} (AQI ${cur.aqi} now). Try: "cleanest window today", "is it safe to jog?", "why is AQI high?", "which area is worst?", or "PM2.5 in Dwarka".`, { current: cur.aqi });
}
