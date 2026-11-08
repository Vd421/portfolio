import { useEffect, useRef, useState } from 'react'
import { ambient, clockFor, onWorld, prefersReduced, storage, world } from '../world'
import { missions } from '../data'
import { LottieIcon } from './LottieIcon'
import { badgeAnim } from '../lottie'

export type Route = 'home' | 'about'

export function TopBar({ route, go }: { route: Route; go: (r: Route) => void }) {
  const link = (r: Route, label: string) => (
    <a href={r === 'home' ? '#home' : '#about'} aria-current={route === r ? 'page' : undefined}
      onClick={(e) => { e.preventDefault(); go(r) }}>{label}</a>
  )
  return (
    <header className="hud-top">
      <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); go('home') }} aria-label="vd, home">
        <span className="brand-mark">
          <LottieIcon data={badgeAnim} replayOnHover className="brand-lottie" />
          <span className="brand-text" aria-hidden="true">vd</span>
        </span>
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

/** Radar: a static SVG map; the sweep and your arrow are separate layers moved with transform only. */
function Radar() {
  const sweep = useRef<HTMLDivElement>(null)
  const me = useRef<HTMLDivElement>(null)
  useEffect(() => onWorld(() => {
    if (sweep.current) sweep.current.style.transform = `rotate(${(world.t * 70) % 360}deg)`
    if (me.current) me.current.style.transform = `translate(-50%, calc(-50% + ${((world.progress - 0.5) * -60).toFixed(1)}%)) rotate(${(world.progress * 40 - 20).toFixed(1)}deg)`
  }), [])
  return (
    <div className="radar" role="img" aria-label={`Radar: ${missions.length} missions around your position`}>
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <g stroke="rgb(243 236 220 / 0.14)" strokeWidth="5" fill="none">
          <path d="M-10 84 L140 60" /><path d="M40 -10 L58 140" /><path d="M-10 30 Q60 50 140 20" />
        </g>
        <g stroke="rgb(243 236 220 / 0.18)" fill="none"><circle cx="64" cy="64" r="30" /><circle cx="64" cy="64" r="58" /></g>
        {missions.map((m, i) => {
          const a = (i / missions.length) * Math.PI * 2 - Math.PI / 2
          const r = m.main ? 26 : 44
          const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r
          return <rect key={m.id} x={x - 4} y={y - 4} width="8" height="8" fill={m.main ? '#ffb547' : '#ff5a2c'} transform={`rotate(45 ${x} ${y})`} />
        })}
      </svg>
      <div className="radar-sweep" ref={sweep} aria-hidden="true" />
      <div className="radar-me" ref={me} aria-hidden="true" />
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
        <div className="clock"><span className="sr-only">In-game time </span>{clock}</div>
        {!reduced && (
          <button type="button" className="hud-btn" aria-pressed={!paused} onClick={() => setPaused((p) => !p)}>
            {paused ? 'Motion: off' : 'Motion: on'}
          </button>
        )}
      </div>
    </div>
  )
}
