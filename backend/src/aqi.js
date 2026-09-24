// CPCB AQI helpers (server-side mirror of the ML engine's config.py logic) —
// used by the JS fallback path and by services that reason about AQI/GRAP.
export function aqiCategory(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function grapStage(aqi) {
  if (aqi <= 200) return 'None';
  if (aqi <= 300) return 'Stage I';
  if (aqi <= 400) return 'Stage II';
  if (aqi <= 450) return 'Stage III';
  return 'Stage IV';
}

// Contiguous edges + cascading `c <= hi` so no value falls between bands.
const BP = [
  [0, 30, 0, 50], [30, 60, 51, 100], [60, 90, 101, 200],
  [90, 120, 201, 300], [120, 250, 301, 400], [250, 500, 401, 500],
];
export function pm25ToAqi(pm25) {
  const c = Math.max(0, pm25);
  for (const [lo, hi, alo, ahi] of BP) {
    if (c <= hi) return Math.round(((ahi - alo) / (hi - lo)) * (c - lo) + alo);
  }
  return 500;
}
