import { TileLayer } from 'react-leaflet'
import { useApp } from '../context/AppContext'

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

const ATTRIBUTION = '&copy; OpenStreetMap contributors'

export default function MapTiles() {
  const { theme } = useApp()
  const dark = theme === 'dark'

  return (
    <TileLayer
      key={dark ? 'dark-tiles' : 'light-tiles'}
      className={dark ? 'atmosiq-dark-tiles' : ''}
      url={OSM_TILES}
      attribution={ATTRIBUTION}
    />
  )
}
