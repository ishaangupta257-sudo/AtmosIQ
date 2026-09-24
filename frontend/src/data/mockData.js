// Mock data standing in for the backend REST API.
// In the full stack these come from /api/* endpoints (OpenAQ, OpenWeather,
// NASA FIRMS, CPCB via Node/Express). Shapes mirror the documented API.

// x/y are % positions on the stylized Delhi-NCR map (0-100).
export const STATIONS = [
  { id: 'anand-vihar', name: 'Anand Vihar',   aqi: 348, x: 72, y: 44, pm25: 289, pm10: 421, o3: 22, nox: 118, temp: 24, wind: 6,  windDir: 315, pbl: 480, trend: [402,388,371,360,352,348], change: -12 },
  { id: 'rk-puram',    name: 'R.K. Puram',    aqi: 296, x: 38, y: 58, pm25: 231, pm10: 358, o3: 31, nox: 88,  temp: 25, wind: 9,  windDir: 300, pbl: 620, trend: [278,283,290,294,298,296], change: +6 },
  { id: 'dwarka',      name: 'Dwarka',        aqi: 214, x: 22, y: 66, pm25: 168, pm10: 262, o3: 44, nox: 61,  temp: 26, wind: 12, windDir: 290, pbl: 780, trend: [240,232,226,220,217,214], change: -14 },
  { id: 'noida-62',    name: 'Noida Sec-62',  aqi: 322, x: 82, y: 56, pm25: 258, pm10: 389, o3: 26, nox: 102, temp: 24, wind: 7,  windDir: 320, pbl: 540, trend: [305,311,318,325,324,322], change: +9 },
  { id: 'gurugram',    name: 'Gurugram',      aqi: 268, x: 26, y: 78, pm25: 204, pm10: 318, o3: 38, nox: 74,  temp: 26, wind: 11, windDir: 285, pbl: 700, trend: [255,259,264,270,269,268], change: +7 },
  { id: 'rohini',      name: 'Rohini',        aqi: 311, x: 46, y: 28, pm25: 246, pm10: 372, o3: 28, nox: 95,  temp: 23, wind: 8,  windDir: 310, pbl: 560, trend: [330,324,319,315,313,311], change: -13 },
  { id: 'faridabad',   name: 'Faridabad',     aqi: 289, x: 58, y: 86, pm25: 224, pm10: 344, o3: 34, nox: 82,  temp: 25, wind: 10, windDir: 295, pbl: 660, trend: [276,280,285,290,290,289], change: +9 },
  { id: 'ito',         name: 'ITO',           aqi: 305, x: 54, y: 52, pm25: 241, pm10: 366, o3: 29, nox: 121, temp: 25, wind: 8,  windDir: 305, pbl: 590, trend: [318,314,310,307,306,305], change: -8 },
]

export const CONSTRUCTION = [
  { id: 'c1', name: 'Dwarka Expressway Ext.', x: 30, y: 70, completion: 'Mar 2027', note: 'Heavy earthwork — high dust load. Water sprinkling mandated.' },
  { id: 'c2', name: 'Metro Phase-4 (Janakpuri)', x: 34, y: 46, completion: 'Dec 2026', note: 'Tunnel boring & muck transport. Anti-smog gun on site.' },
  { id: 'c3', name: 'Noida Link Road Widening', x: 78, y: 62, completion: 'Aug 2026', note: 'Aggregate stockpiling — cover tarpaulins required.' },
]

export const FIRES = [
  { id: 'f1', lat: 30.21, lon: 75.84, place: 'Sangrur, Punjab', brightness: 342, confidence: 'high' },
  { id: 'f2', lat: 29.95, lon: 76.62, place: 'Kurukshetra, Haryana', brightness: 318, confidence: 'high' },
  { id: 'f3', lat: 30.34, lon: 76.38, place: 'Patiala, Punjab', brightness: 305, confidence: 'nominal' },
  { id: 'f4', lat: 29.68, lon: 76.99, place: 'Karnal, Haryana', brightness: 289, confidence: 'nominal' },
]

export const GRAP = {
  stage: 'Stage III',
  color: '#FF9800',
  desc: 'Severe air quality. Ban on non-essential construction & BS-III/IV diesel vehicles; schools may shift to hybrid mode.',
}

// 72-hour forecast (3-hourly) — from the XGBoost ML engine in the full stack
export function forecast72(baseAqi = 320) {
  const out = []
  const now = new Date()
  for (let h = 0; h <= 72; h += 3) {
    // diurnal pattern: worse at night/early morning (inversion), better midday
    const hourOfDay = (now.getHours() + h) % 24
    const diurnal = Math.cos(((hourOfDay - 7) / 24) * 2 * Math.PI) * 55
    const drift = -h * 0.35 + Math.sin(h / 9) * 18
    const noise = (Math.random() - 0.5) * 10
    const aqi = Math.max(60, Math.round(baseAqi + diurnal + drift + noise))
    out.push({ hour: h, at: new Date(now.getTime() + h * 3600e3), aqi })
  }
  return out
}

export const TODAY = { aqi: 348, label: 'Very Poor', peak: '7–9 AM', low: '2–4 PM' }
export const TOMORROW = { aqi: 312, label: 'Very Poor', peak: '6–8 AM', low: '1–4 PM' }
export const OPTIMAL_WINDOW = { time: '2:00 – 4:30 PM', aqi: 268, note: 'Highest boundary-layer height & steady westerly wind disperse pollutants.' }
export const EXERCISE = { verdict: 'Not Recommended', detail: 'Reschedule intense outdoor workouts. If unavoidable, keep it light and mask up during the 2–4 PM window.' }

export const stationById = (id) => STATIONS.find(s => s.id === id)
