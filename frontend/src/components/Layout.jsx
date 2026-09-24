import { Outlet, useLocation } from 'react-router-dom'
import TopNav from './TopNav'
import GrapBanner from './GrapBanner'
import ChatbotBubble from './ChatbotBubble'
import Footer from './Footer'

export default function Layout() {
  const { pathname } = useLocation()
  const fullscreen = pathname === '/command' || pathname === '/map'

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen">
      <TopNav />
      <main className="w-full pt-16 bg-surface min-h-screen flex flex-col">
        {!fullscreen && <GrapBanner />}
        <div className="flex-1"><Outlet /></div>
        {!fullscreen && <Footer />}
      </main>
      <ChatbotBubble />
    </div>
  )
}
