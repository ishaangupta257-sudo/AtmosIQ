import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'

export default function Footer() {
  const { lang } = useApp()
  return (
    <footer className="w-full bg-surface-container-low py-space-xl">
      <div className="max-w-7xl mx-auto px-space-md lg:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-md text-on-surface-variant font-body-sm text-body-sm">
        <div className="flex items-center gap-space-xs">
          <span className="font-title text-title text-primary font-bold">AtmosIQ</span>
          <span className="text-outline-variant">•</span>
          <span>{t('Public Atmospheric Intelligence & Clean Air Guidance', lang)}</span>
        </div>
        <div className="flex items-center gap-space-lg font-label-sm text-label-sm">
          <NavLink className="hover:text-on-surface transition-colors" to="/map">{t('Sensors', lang)}</NavLink>
          <NavLink className="hover:text-on-surface transition-colors" to="/learn">{t('Health Guidelines', lang)}</NavLink>
          <span>© 2026 AtmosIQ Platform · SIH26082</span>
        </div>
      </div>
    </footer>
  )
}
