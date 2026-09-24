import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('atmosiq-theme') || 'light')
  const [lang, setLang] = useState(() => localStorage.getItem('atmosiq-lang') || 'en')
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('atmosiq-profile')) || null } catch { return null }
  })
  const [location, setLocation] = useState('Anand Vihar')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('atmosiq-theme', theme)
  }, [theme])

  useEffect(() => { localStorage.setItem('atmosiq-lang', lang) }, [lang])

  // Hydrate the health profile from the backend if none is stored locally.
  useEffect(() => {
    if (profile) return
    api.getHealthProfile('default').then((p) => {
      if (p && p.sensitivity) { setProfile(p); localStorage.setItem('atmosiq-profile', JSON.stringify(p)) }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = (p) => {
    setProfile(p)
    localStorage.setItem('atmosiq-profile', JSON.stringify(p))
    api.saveHealthProfile({ id: 'default', ...p }) // persist to backend (fire-and-forget)
  }

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))
  const toggleLang = () => setLang(l => (l === 'en' ? 'hi' : 'en'))

  return (
    <AppContext.Provider value={{ theme, toggleTheme, lang, setLang, toggleLang, profile, saveProfile, location, setLocation }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
