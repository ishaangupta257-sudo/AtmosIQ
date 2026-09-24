import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import Icon from './Icon'

const LINKS = [
  ['/', 'Home'],
  ['/map', 'Live AQI & Map'],
  ['/routes', 'Health-Safe Routes'],
  ['/command', 'Command Center'],
  ['/assistant', 'Assistant'],
  ['/learn', 'Learn'],
]

export default function TopNav() {
  const { theme, toggleTheme, lang, setLang } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-7xl mx-auto px-space-md lg:px-margin-desktop flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm lg:gap-space-lg min-w-0">
          <button onClick={() => setMenuOpen(o => !o)} aria-label="Menu"
            className="lg:hidden w-9 h-9 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center shrink-0">
            <Icon name={menuOpen ? 'close' : 'menu'} className="text-[1.4rem]" />
          </button>
          <NavLink to="/" className="flex items-center gap-space-xs shrink-0">
            <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <Icon name="eco" className="text-[1.25rem]" fill />
            </span>
            <span className="font-title text-title text-primary tracking-tight font-bold hidden sm:inline-block">AtmosIQ</span>
          </NavLink>
          <nav className="hidden lg:flex items-center gap-space-2xs p-space-2xs rounded-full bg-surface-container-low">
            {LINKS.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) => [
                  'px-space-md py-space-xs rounded-full transition-colors whitespace-nowrap text-label-md font-label-md',
                  isActive ? 'bg-surface-container-high text-on-surface font-title' : 'text-on-surface-variant hover:text-on-surface',
                ].join(' ')}>
                {t(label, lang)}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-space-xs sm:gap-space-sm shrink-0">
          <div className="flex items-center bg-surface-container-low rounded-full p-space-2xs font-label-sm text-label-sm text-on-surface-variant">
            <button onClick={() => setLang('en')} type="button"
              className={`px-space-xs py-space-2xs rounded-full transition-colors ${lang === 'en' ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.04)]' : 'hover:text-on-surface'}`}>EN</button>
            <span className="text-outline-variant px-space-2xs">|</span>
            <button onClick={() => setLang('hi')} type="button"
              className={`px-space-xs py-space-2xs rounded-full transition-colors ${lang === 'hi' ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.04)]' : 'hover:text-on-surface'}`}>हि</button>
          </div>
          <button onClick={toggleTheme} aria-label="Toggle color mode" type="button"
            className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors">
            <Icon name={theme === 'dark' ? 'dark_mode' : 'light_mode'} className="text-[1.25rem]" />
          </button>
          <div className="hidden sm:flex items-center pl-space-xs">
            <div className="w-8 h-8 rounded-full ring-2 ring-surface-container-high bg-primary text-on-primary flex items-center justify-center font-bold text-label-sm">IG</div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="lg:hidden border-t border-surface-container bg-surface-container-lowest px-space-md py-space-sm flex flex-col gap-1 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}
              className={({ isActive }) => [
                'px-space-md py-space-sm rounded-xl text-label-md font-label-md transition-colors',
                isActive ? 'bg-surface-container-high text-on-surface font-bold' : 'text-on-surface-variant hover:bg-surface-container-low',
              ].join(' ')}>
              {t(label, lang)}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
