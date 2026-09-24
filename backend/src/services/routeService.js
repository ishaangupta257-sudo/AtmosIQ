// POST /api/route-suitability — grounds the health-safe-routes verdict in live
// AQI at the endpoints plus the caller's health profile sensitivity.
import { current } from '../mlClient.js';
import { LOCATIONS } from '../constants.js';
import { aqiCategory } from '../aqi.js';

function nearestLocation(name = '') {
  const q = name.trim().toLowerCase();
  return (LOCATIONS.find((l) => l.name.toLowerCase() === q)
    || LOCATIONS.find((l) => l.name.toLowerCase().includes(q) && q.length > 2)
    || LOCATIONS[0]).id;
}

const SENSITIVITY = { high: 0.75, medium: 0.9, low: 1.1 };

export async function routeSuitability({ from, to, healthProfile = {} }) {
  const a = await current(nearestLocation(from));
  const b = await current(nearestLocation(to));
  const avg = Math.round((a.aqi + b.aqi) / 2);
  const factor = SENSITIVITY[healthProfile.sensitivity] ?? 0.9;
  const adjusted = Math.round(avg / factor); // sensitive users -> effectively worse

  let verdict, detail;
  if (adjusted <= 150) { verdict = 'Recommended'; detail = 'Air quality along this route is acceptable for outdoor travel.'; }
  else if (adjusted <= 250) { verdict = 'Caution'; detail = 'Moderate exposure — prefer a mask and avoid peak-traffic hours.'; }
  else { verdict = 'Not Recommended'; detail = 'High exposure. Reschedule to the cleaner mid-afternoon window or travel enclosed.'; }

  return {
    from: a.name, to: b.name,
    endpoints: [{ name: a.name, aqi: a.aqi }, { name: b.name, aqi: b.aqi }],
    routeAqi: avg, adjustedAqi: adjusted, category: aqiCategory(avg),
    verdict, detail,
    optimalWindow: { time: '2:00 - 4:30 PM', note: 'Highest boundary-layer height & steady westerly wind disperse pollutants.' },
  };
}
