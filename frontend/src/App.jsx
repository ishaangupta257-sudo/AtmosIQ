import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import LiveMap from './pages/LiveMap'
import SafeRoutes from './pages/SafeRoutes'
import Command from './pages/Command'
import Assistant from './pages/Assistant'
import Learn from './pages/Learn'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<LiveMap />} />
        <Route path="/routes" element={<SafeRoutes />} />
        <Route path="/command" element={<Command />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/learn" element={<Learn />} />
      </Route>
    </Routes>
  )
}
