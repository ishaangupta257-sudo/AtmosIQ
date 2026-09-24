import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import Icon from './Icon'
import { useAlerts } from '../useLive'

export default function GrapBanner() {
  const { lang } = useApp()
  const alerts = useAlerts()
  const grap = alerts?.grap
  // Live GRAP stage + description from the backend; static text until it loads.
  const stageLabel = grap ? `GRAP ${grap.stage} Active` : 'GRAP Stage II Active'
  const desc = grap
    ? `${grap.desc}${grap.hotspot ? ` City max AQI ${grap.cityMaxAqi} at ${grap.hotspot}.` : ''}`
    : t('Diesel generator restrictions & enhanced anti-dust sprinkling enforced in Delhi-NCR.', lang)
  return (
    <div className="w-full bg-error-container text-on-error-container px-space-md py-space-xs shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-space-xs text-body-sm font-body-sm">
        <div className="flex items-center gap-space-xs">
          <Icon name="warning" className="text-[1.25rem] text-error animate-pulse" fill />
          <span className="font-label-md text-label-md font-bold text-error tracking-wide uppercase">{t(stageLabel, lang)}</span>
          <span className="text-outline-variant hidden sm:inline">•</span>
          <span className="text-on-error-container font-medium">{desc}</span>
        </div>
        <a className="inline-flex items-center gap-1 font-label-sm text-label-sm font-bold text-error hover:underline" href="https://cpcb.nic.in/" target="_blank" rel="noreferrer">
          {t('CPCB Official Advisory #409', lang)}
          <Icon name="arrow_forward" className="text-[1rem]" />
        </a>
      </div>
    </div>
  )
}
