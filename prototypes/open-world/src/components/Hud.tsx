import { useEffect, useRef, useState } from 'react'
import { ambient, clockFor, onWorld, prefersReduced, storage, world } from '../world'
import { missions } from '../data'

export type Route = 'home' | 'about'

export function TopBar({ route, go }: { route: Route; go: (r: Route) => void }) {
  const link = (r: Route, label: string) => (
    <a
      href={r === 'home' ? '#home' : '#about'}
      aria-current={route === r ? 'page' : undefined}
      onClick={(e) => { e.preventDefault(); go(r) }}
    >{label}</a>
  )
  return (
    <header className="hud-top">
      <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); go('home') }} aria-label="vd, home">
        <span className="brand-mark" aria-hidden="true">vd</span>
        <span className="brand-name">Vaibhav Dhir</span>
      </a>
      <nav className="nav" aria-label="Pages">
        {link('home', 'City')}
        {link('about', 'Profile')}
      </nav>
    </header>
  )
}

export function Objective({ text }: { text: string }) {
  return (
    <aside className="objective" aria-live="polite">
      <span className="label">Objective</span>
      {text}
    </aside>
  )
}

/** Radar: missions as blips around the ring, your position as the arrow, a sweep while motion is on. */
function Radar() {
  const sweep = useRef<SVGGElement>(null)
  const me = useRef<SVGGElement>(null)
  useEffect(() => onWorld(() => {
    if (sweep.current) sweep.current.setAttribute('transform', `rotate(${(world.t * 70) % 360} 64 64)`)
    if (me.current) me.current.setAttribute('transform', `translate(0 ${-(world.progress - 0.5) * 60}) rotate(${world.progress * 40 - 20} 64 64)`)
  }), [])
  return (
    <div className="radar" role="img" aria-label="Radar showing your position on the page and the six missions">
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <defs>
          <radialGradient id="sweep" cx="64" cy="64" r="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#45e3c6" stopOpacity="0.35" />
            <stop offset="1" stopColor="#45e3c6" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Streets */}
        <g stroke="rgb(243 236 220 / 0.14)" strokeWidth="5" fill="none">
          <path d="M-10 84 L140 60" /><path d="M40 -10 L58 140" /><path d="M-10 30 Q60 50 140 20" />
        </g>
        <g stroke="rgb(243 236 220 / 0.18)" fill="none">
          <circle cx="64" cy="64" r="30" /><circle cx="64" cy="64" r="58" />
        </g>
        <g ref={sweep}><path d="M64 64 L64 4 A60 60 0 0 1 116 34 Z" fill="url(#sweep)" /></g>
        {missions.map((m, i) => {
          const a = (i / missions.length) * Math.PI * 2 - Math.PI / 2
          const r = m.main ? 26 : 44
          return <rect key={m.id} x={64 + Math.cos(a) * r - 4} y={64 + Math.sin(a) * r - 4} width="8" height="8"
            fill={m.main ? '#ffb547' : '#ff5a2c'} transform={`rotate(45 ${64 + Math.cos(a) * r} ${64 + Math.sin(a) * r})`} />
        })}
        <g ref={me}><path d="M64 56 L70 70 L64 66 L58 70 Z" fill="#f3ecdc" /></g>
      </svg>
    </div>
  )
}

export function BottomHud() {
  const [clock, setClock] = useState(clockFor(world.night))
  const [paused, setPaused] = useState(() => storage('local')?.getItem('ow:still') === '1')
  const reduced = prefersReduced()
  useEffect(() => { ambient.paused = paused; try { storage('local')?.setItem('ow:still', paused ? '1' : '0') } catch { /* private mode */ } }, [paused])
  useEffect(() => onWorld(() => {
    const c = clockFor(world.night)
    setClock((prev) => (prev === c ? prev : c))
  }), [])
  return (
    <div className="hud-bottom">
      <Radar />
      <div className="hud-meta">
        <div className="clock" aria-label={`In-game time ${clock}`}>{clock}</div>
        <div className="hud-btns">
          {!reduced && (
            <button type="button" className="hud-btn" aria-pressed={!paused} onClick={() => setPaused((p) => !p)}>
              {paused ? 'Motion: off' : 'Motion: on'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
