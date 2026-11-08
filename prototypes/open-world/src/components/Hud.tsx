import { useEffect, useState } from 'react'
import { ambient, clockFor, onWorld, prefersReduced, storage, world } from '../world'
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
