// POST /api/assistant/query — a grounded rule-based responder. It answers using
// REAL pipeline data (current AQI, the bias-corrected forecast, SHAP drivers)
// rather than static text, so the AI Assistant page reflects live conditions.
// (Swap this for an LLM call behind the same interface without touching routes.)
import { current, forecast, explain } from '../mlClient.js';
import { aqiCategory, grapStage } from '../aqi.js';

const DEFAULT_LOC = 'anand-vihar';

function pickLocation(context = {}) {
  return context.location || DEFAULT_LOC;
}

export async function answer({ question = '', context = {} }) {
  const loc = pickLocation(context);
  const q = question.toLowerCase();
  const cur = await current(loc);

  // forecast / tomorrow / when
  if (/(forecast|tomorrow|next|later|when|window|clean)/.test(q)) {
    const fc = await forecast(loc);
    const next24 = fc.forecast.slice(0, 24);
    const best = next24.reduce((m, r) => (r.aqi < m.aqi ? r : m), next24[0]);
    const worst = next24.reduce((m, r) => (r.aqi > m.aqi ? r : m), next24[0]);
    return {
      answer: `At ${cur.name}, AQI is ${cur.aqi} (${cur.category}) now. Over the next 24h the model expects a peak of ${worst.aqi} around ${worst.at.slice(11, 16)} and the cleanest air (~${best.aqi}) around ${best.at.slice(11, 16)} — the best window for outdoor activity.`,
      data: { current: cur.aqi, best, worst }, grounded: true,
    };
  }
  // why / driver / cause
  if (/(why|cause|driver|reason|stubble|fire|wind)/.test(q)) {
    const ex = await explain(loc);
    return { answer: ex.narrative, data: { drivers: ex.drivers }, grounded: true };
  }
  // mask / safe / exercise / children
  if (/(mask|safe|exercise|run|jog|child|kid|elderly|asthma|outdoor)/.test(q)) {
    const stage = grapStage(cur.aqi);
    const advice = cur.aqi > 300
      ? 'Avoid outdoor exertion; wear an N95 outside and run a purifier indoors. Children, elderly and asthmatics should stay in.'
      : cur.aqi > 200 ? 'Limit prolonged outdoor exertion; sensitive groups should mask up.'
      : 'Outdoor activity is generally fine; sensitive individuals should stay aware.';
    return { answer: `AQI at ${cur.name} is ${cur.aqi} (${cur.category}${stage !== 'None' ? `, GRAP ${stage}` : ''}). ${advice}`,
      data: { aqi: cur.aqi, grap: stage }, grounded: true };
  }
  // default: current status
  return {
    answer: `Current AQI at ${cur.name} is ${cur.aqi} — ${cur.category}. PM2.5 ${cur.pollutants.pm25} µg/m³, wind ${cur.weather.wind_speed} km/h. Ask me about the forecast, the cleanest window today, or why the air is like this.`,
    data: { current: cur }, grounded: true,
  };
}
