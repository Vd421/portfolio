import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, prefersReduced, scrollToTop, startWorld, storage, world } from './world'
import { Intro } from './components/Intro'
import { BottomHud, Objective, TopBar, type Route } from './components/Hud'
import { Landing } from './pages/Landing'
import { About } from './pages/About'

const routeFromHash = (): Route => (location.hash.replace('#', '') === 'about' ? 'about' : 'home')
const TITLES: Record<Route, string> = { home: 'vd: Open World', about: 'Profile · vd: Open World' }

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const wipe = useRef<HTMLDivElement>(null)
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [objective, setObjective] = useState('Scroll to drive into the city.')
  const [showIntro, setShowIntro] = useState(() => {
    if (prefersReduced() || routeFromHash() !== 'home') return false
    return storage('session')?.getItem('ow:intro') !== 'seen'
  })
  const [introDone, setIntroDone] = useState(!showIntro)
  const busy = useRef(false)

  useEffect(() => { if (canvas.current) startWorld(canvas.current) }, [])
  useEffect(() => { document.title = TITLES[route] }, [route])

  const endIntro = useCallback(() => {
    try { storage('session')?.setItem('ow:intro', 'seen') } catch { /* private mode */ }
    setShowIntro(false)
    setIntroDone(true)
  }, [])

  /** Switch pages behind a slash wipe, then put focus on the new page's heading. */
  const go = useCallback((next: Route) => {
    if (busy.current) return
    const finish = () => {
      setRoute(next)
      if (location.hash !== `#${next}`) history.pushState(null, '', `#${next}`)
      world.progress = 0
      requestAnimationFrame(() => {
        scrollToTop()
        ScrollTrigger.refresh()
        document.querySelector<HTMLElement>('#main h1')?.setAttribute('tabindex', '-1')
        document.querySelector<HTMLElement>('#main h1')?.focus({ preventScroll: true })
      })
    }
    if (next === route) { scrollToTop(); return }
    const w = wipe.current
    if (prefersReduced() || !w) { finish(); return }
    busy.current = true
    const label = w.querySelector('.msg .display')
    if (label) label.textContent = next === 'about' ? 'Profile' : 'The city'
    gsap.timeline({ onComplete: () => { busy.current = false; gsap.set(w, { visibility: 'hidden' }) } })
      .set(w, { visibility: 'visible' })
      .fromTo(w.querySelector('.slab.a'), { xPercent: -130, skewX: -14 }, { xPercent: 0, skewX: -14, duration: 0.45, ease: 'expo.in' })
      .fromTo(w.querySelector('.slab.b'), { xPercent: -130, skewX: -14 }, { xPercent: 0, skewX: -14, duration: 0.45, ease: 'expo.in' }, 0.08)
      .to(w.querySelector('.msg'), { opacity: 1, duration: 0.15 })
      .call(finish)
      .to({}, { duration: 0.35 })
      .to(w.querySelector('.msg'), { opacity: 0, duration: 0.15 })
      .to(w.querySelector('.slab.b'), { xPercent: 130, duration: 0.5, ease: 'expo.out' })
      .to(w.querySelector('.slab.a'), { xPercent: 130, duration: 0.5, ease: 'expo.out' }, '<0.06')
  }, [route])

  // Back and forward buttons
  useEffect(() => {
    const onHash = () => { const r = routeFromHash(); if (r !== route) go(r) }
    addEventListener('hashchange', onHash)
    addEventListener('popstate', onHash)
    return () => { removeEventListener('hashchange', onHash); removeEventListener('popstate', onHash) }
  }, [go, route])

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>Skip to content</a>
      <canvas ref={canvas} className="city" aria-hidden="true" />
      <div className="city-shade" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <TopBar route={route} go={go} />
      <Objective text={objective} />

      {route === 'home'
        ? <Landing go={go} introDone={introDone} setObjective={setObjective} />
        : <About setObjective={setObjective} />}

      <BottomHud />

      <div className="wipe" ref={wipe} aria-hidden="true">
        <div className="slab a" />
        <div className="slab b" />
        <div className="msg"><span className="label" style={{ color: 'var(--sodium)' }}>Loading</span><span className="display">The city</span></div>
      </div>

      {showIntro && <Intro onDone={endIntro} />}
    </>
  )
}
