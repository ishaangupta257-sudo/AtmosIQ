// Personalized routing engine — turns a saved health profile into a concrete
// AQI rerouting threshold and a route recommendation. This is the single source
// of truth for "given who you are, do we send you the direct route or reroute
// you to the cleaner corridor?"
//
// Flow: HealthProfileModal -> AppContext (localStorage + backend) -> here ->
//       SafeRoutes route decision. The backend routeService mirrors this logic
//       so its verdict agrees with the UI.

// Base AQI reroute threshold by Environmental Sensitivity Level.
// Above this AQI we recommend the cleaner (rerouted) option over the direct one.
const BASE_THRESHOLD = { low: 120, medium: 80, moderate: 80, high: 50 }

// Health conditions increase risk at the SAME AQI, so they lower the threshold.
// We apply the single largest applicable buffer (most conservative wins).
const CONDITION_BUFFER = { copd: 25, asthma: 20, cardio: 20, allergies: 8 }

// Age groups at higher risk per general AQI guidance nudge more conservative.
const AGE_BUFFER = { child: 10, senior: 10 }

const SENS_LABEL = { low: 'Standard Citizen', medium: 'Preventative Care', moderate: 'Preventative Care', high: 'High Sensitivity' }

function normSensitivity(p) {
  return p.sensitivityRaw || p.sensitivity || 'medium'
}

/**
 * Derive routing parameters from a saved profile.
 * Returns { threshold, baseThreshold, buffer, sensitivity, sensitivityLabel,
 *           conditions, age, activities, exertion, greenBenefit, reasons[] }.
 */
export function routingParams(profile) {
  if (!profile) {
    return {
      threshold: 100, baseThreshold: 100, buffer: 0,
      sensitivity: 'default', sensitivityLabel: 'No profile',
      conditions: [], age: 'adult', activities: [], exertion: 1.0, greenBenefit: 0.20,
      reasons: ['No health profile set — using a general AQI 100 threshold. Set your profile for personalized routing.'],
    }
  }
  const sensitivity = normSensitivity(profile)
  const baseThreshold = BASE_THRESHOLD[sensitivity] ?? 100
  const reasons = [`${SENS_LABEL[sensitivity] || 'Preventative Care'} → base reroute threshold AQI ${baseThreshold}.`]

  // Conditions: take the most conservative single buffer.
  const conditions = (profile.conditionsList || []).filter((c) => c && c !== 'none')
  let condBuffer = 0
  let worstCond = null
  for (const c of conditions) {
    const b = CONDITION_BUFFER[c] || 0
    if (b > condBuffer) { condBuffer = b; worstCond = c }
  }
  if (condBuffer) reasons.push(`${worstCond === 'copd' ? 'COPD' : worstCond === 'cardio' ? 'Cardiovascular sensitivity' : worstCond === 'asthma' ? 'Asthma' : 'Allergies'} lowers the threshold by ${condBuffer}.`)

  // Age: <18 or 60+ adds a buffer.
  const age = profile.age || 'adult'
  const ageBuffer = AGE_BUFFER[age] || 0
  if (ageBuffer) reasons.push(`${age === 'child' ? 'Under-18' : '60+'} age group lowers the threshold by ${ageBuffer}.`)

  const buffer = condBuffer + ageBuffer
  const threshold = Math.max(25, baseThreshold - buffer)

  // Activity → inhalation-rate multiplier + how strongly to prefer green corridors.
  const activities = profile.activities || []
  const activeModes = activities.filter((a) => a !== 'driving')
  let exertion, activityNote
  if (activities.includes('running')) {
    exertion = 1.5; activityNote = 'Running/outdoor cardio greatly raises inhalation — strongly avoid arterial roads, prefer green corridors.'
  } else if (activeModes.includes('walking') || activeModes.includes('cycling')) {
    exertion = 1.25; activityNote = 'Walking/cycling raises inhalation — prefer green corridors over arterials.'
  } else if (activities.includes('driving') && activeModes.length === 0) {
    exertion = 0.65; activityNote = 'Driving with cabin filtration lowers exposure — direct routes are more tolerable.'
  } else {
    exertion = 1.0; activityNote = 'Mixed activity — balanced routing.'
  }
  reasons.push(activityNote)

  // The greener route's AQI advantage is bigger when exertion is higher.
  const greenBenefit = exertion >= 1.5 ? 0.30 : exertion >= 1.25 ? 0.24 : exertion <= 0.65 ? 0.12 : 0.20

  return {
    threshold, baseThreshold, buffer, sensitivity,
    sensitivityLabel: SENS_LABEL[sensitivity] || 'Preventative Care',
    conditions, age, activities, exertion, greenBenefit, reasons,
  }
}

/**
 * Decide the recommendation for a route whose average AQI is `routeAqi`.
 * `directAqi` is the direct/arterial route's AQI (defaults to routeAqi).
 */
export function decideRoute(params, routeAqi, directAqi = routeAqi) {
  // Effective exposure = direct-route AQI scaled by how hard you're breathing.
  const effectiveAqi = Math.round(directAqi * params.exertion)
  const reroute = effectiveAqi > params.threshold
  const over = effectiveAqi - params.threshold

  let verdict, tone
  if (!reroute) { verdict = 'Direct route OK'; tone = 'secondary' }
  else if (over <= 60) { verdict = 'Take the cleaner route'; tone = 'tertiary' }
  else { verdict = 'Avoid / travel enclosed'; tone = 'error' }

  return {
    effectiveAqi,
    threshold: params.threshold,
    reroute,
    recommend: reroute ? 'safer' : 'fastest',
    verdict,
    tone,
    message: reroute
      ? `Effective exposure AQI ${effectiveAqi} exceeds your personal threshold of ${params.threshold} — recommending the low-exposure route.`
      : `Effective exposure AQI ${effectiveAqi} is within your personal threshold of ${params.threshold} — the direct route is acceptable for you.`,
  }
}
