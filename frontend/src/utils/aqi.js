// AQI scale helpers — single source of truth for colors + categories

export const AQI_BANDS = [
  { max: 50,  label: 'Good',         hi: 'अच्छा',        color: '#4CAF50', var: '--aqi-good' },
  { max: 100, label: 'Satisfactory', hi: 'संतोषजनक',    color: '#8BC34A', var: '--aqi-satisfactory' },
  { max: 200, label: 'Moderate',     hi: 'मध्यम',        color: '#FFC107', var: '--aqi-moderate' },
  { max: 300, label: 'Poor',         hi: 'खराब',         color: '#FF9800', var: '--aqi-poor' },
  { max: 400, label: 'Very Poor',    hi: 'बहुत खराब',    color: '#F44336', var: '--aqi-very-poor' },
  { max: 9999,label: 'Severe',       hi: 'गंभीर',        color: '#7B1E1E', var: '--aqi-severe' },
]

export function aqiBand(aqi) {
  return AQI_BANDS.find(b => aqi <= b.max) || AQI_BANDS[AQI_BANDS.length - 1]
}
export function aqiColor(aqi) { return aqiBand(aqi).color }
export function aqiLabel(aqi, lang = 'en') { const b = aqiBand(aqi); return lang === 'hi' ? b.hi : b.label }

export function healthMessage(aqi, lang = 'en') {
  const en = [
    'Air quality is good. Enjoy your usual outdoor activities.',
    'Air quality is satisfactory. Sensitive groups should stay aware.',
    'Moderate — sensitive individuals may feel minor discomfort. Limit prolonged exertion.',
    'Poor — reduce prolonged outdoor exertion, especially children and elderly.',
    'Very Poor — avoid outdoor activity. Wear an N95 mask outside.',
    'Severe — stay indoors, keep windows shut, run an air purifier.',
  ]
  const hi = [
    'वायु गुणवत्ता अच्छी है। सामान्य गतिविधियाँ करें।',
    'वायु गुणवत्ता संतोषजनक है। संवेदनशील लोग सतर्क रहें।',
    'मध्यम — संवेदनशील लोगों को हल्की परेशानी हो सकती है।',
    'खराब — लंबे समय तक बाहर मेहनत कम करें, खासकर बच्चे व बुज़ुर्ग।',
    'बहुत खराब — बाहर की गतिविधि से बचें। N95 मास्क पहनें।',
    'गंभीर — घर के अंदर रहें, खिड़कियाँ बंद रखें, प्यूरीफायर चलाएँ।',
  ]
  const idx = AQI_BANDS.indexOf(aqiBand(aqi))
  return (lang === 'hi' ? hi : en)[idx]
}
