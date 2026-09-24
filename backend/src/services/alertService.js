// GET /api/alerts — combines the ML engine's forecast-threshold alerts with a
// current-conditions GRAP stage derived from the worst live AQI across the city.
import { locations, alerts as mlAlerts } from '../mlClient.js';
import { grapStage, aqiCategory } from '../aqi.js';

const GRAP_DESC = {
  'Stage I': 'Poor air quality. Dust control at construction sites; mechanised road sweeping.',
  'Stage II': 'Very Poor. Diesel-generator curbs; parking-fee hikes; intensified public transport.',
  'Stage III': 'Severe. Ban on non-essential construction & BS-III/IV diesel vehicles; schools may go hybrid.',
  'Stage IV': 'Severe+. Truck-entry ban, construction halt, possible school closures & odd-even.',
};

export async function currentAlerts() {
  const locs = await locations();
  const worst = locs.reduce((m, l) => (l.aqi > m.aqi ? l : m), locs[0]);
  const stage = grapStage(worst.aqi);
  const forecastAlerts = await mlAlerts();
  return {
    grap: {
      stage: stage === 'None' ? 'Stage I' : stage,
      cityMaxAqi: worst.aqi, hotspot: worst.name, category: aqiCategory(worst.aqi),
      desc: GRAP_DESC[stage] || GRAP_DESC['Stage I'],
    },
    forecastAlerts,
    updatedAt: new Date().toISOString(),
  };
}
