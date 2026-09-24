import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { answer, SUGGESTIONS } from '../utils/assistant'
import Icon from './Icon'

export default function ChatbotBubble() {
  const { location } = useApp()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([{ from: 'bot', text: "Hi! I'm the AtmosIQ Assistant. Ask me about air quality, safe timing, or routes." }])
  const [input, setInput] = useState('')
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, open])

  const send = (text) => {
    const q = (text ?? input).trim()
    if (!q) return
    setMsgs(m => [...m, { from: 'user', text: q }])
    setInput('')
    setTimeout(() => setMsgs(m => [...m, { from: 'bot', text: answer(q, { location }) }]), 320)
  }

  return (
    <>
      <div className="fixed bottom-space-lg right-space-lg z-50">
        <button onClick={() => setOpen(o => !o)} aria-label="Open AtmosIQ AI Chatbot" type="button"
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0_8px_24px_-4px_rgba(0,104,95,0.4)] hover:bg-primary-container transition-all">
          <Icon name={open ? 'close' : 'forum'} className="text-[1.75rem]" />
          {!open && (
            <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-container opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-secondary"></span>
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="fade-up fixed bottom-24 right-space-lg z-50 w-[min(370px,92vw)] h-[min(520px,72vh)] bg-surface-container-lowest border border-surface-container-high rounded-3xl shadow-[0_20px_40px_-8px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden">
          <div className="px-space-md py-space-sm bg-primary text-on-primary">
            <div className="font-title font-bold flex items-center gap-2"><Icon name="eco" className="text-[1.25rem]" fill /> AtmosIQ Assistant</div>
            <div className="text-body-sm opacity-90">Grounded in live AQI &amp; forecast data</div>
          </div>
          <div className="flex-1 overflow-y-auto p-space-md flex flex-col gap-space-xs">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[82%] px-space-sm py-space-xs rounded-2xl text-body-sm ${m.from === 'user' ? 'self-end bg-primary text-on-primary' : 'self-start bg-surface-container-low text-on-surface border border-surface-container-high'}`}>{m.text}</div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="px-space-sm pb-space-xs flex gap-space-2xs flex-wrap border-t border-surface-container-high pt-space-xs">
            {SUGGESTIONS.slice(0, 2).map(s => (
              <button key={s} onClick={() => send(s)} className="px-2.5 py-1 rounded-full bg-surface-container-low text-primary text-[0.72rem] font-semibold hover:bg-primary-fixed transition-colors">{s}</button>
            ))}
          </div>
          <div className="p-space-sm flex gap-space-xs border-t border-surface-container-high">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask something…"
              className="flex-1 bg-surface-container-low rounded-full py-space-xs px-space-md text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary" />
            <button onClick={() => send()} className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container transition-colors">
              <Icon name="send" className="text-[1.125rem]" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
