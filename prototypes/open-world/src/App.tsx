import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, LazyMotion, MotionConfig, type Variants } from 'motion/react'
import * as m from 'motion/react-m'
import { nav, prefersReduced, refreshScroll, scrollToTop, startWorld, storage, world } from './world'
import { Backdrop } from './components/Backdrop'
import { LoadingScreen } from './components/LoadingScreen'
import { BottomHud, TopBar, type Route } from './components/Hud'
import { Landing } from './pages/Landing'
import { About } from './pages/About'

const routeFromHash = (): Route => (location.hash.replace('#', '') === 'about' ? 'about' : 'home')
const TITLES: Record<Route, string> = { home: 'vd: Open World', about: 'Profile · vd: Open World' }
const EASE = [0.2, 0, 0, 1] as const
const slab = (i: number): Variants => ({
  idle: { x: '-130%', skewX: -14, transition: { duration: 0 } },
  cover: { x: '0%', skewX: -14, transition: { duration: 0.45, delay: i * 0.08, ease: [0.7, 0, 0.84, 0] } },
  hold: { x: '0%', skewX: -14 },
  reveal: { x: '130%', skewX: -14, transition: { duration: 0.5, delay: (1 - i) * 0.06, ease: EASE } },
})
// Motion's animation features arrive after first paint; `m` components render statically until then.
const loadFeatures = () => import('./motion-features').then((r) => r.default)

export default function App() {
  const [phase, setPhase] = useState<'idle' | 'cover' | 'hold' | 'reveal'>('idle')
  const [wipeLabel, setWipeLabel] = useState('The city')
  const pending = useRef<() => void>(() => {})
  const [route, setRoute] = useState<Route>(routeFromHash)
  // Loading screen: first visit per session only, never under reduced motion.
  const [showIntro, setShowIntro] = useState(() => !prefersReduced() && storage('session')?.getItem('ow:loaded') !== '1')
  const [introDone, setIntroDone] = useState(!showIntro)
  const busy = useRef(false)

  useEffect(() => { startWorld() }, [])
  useEffect(() => { document.title = TITLES[route] }, [route])

  const endIntro = useCallback(() => {
    try { storage('session')?.setItem('ow:loaded', '1') } catch { /* private mode */ }
    setShowIntro(false)
    setIntroDone(true)
  }, [])

  /** Switch pages behind a slash wipe (transform only), then focus the new page's heading. */
  const go = useCallback(async (next: Route) => {
    if (busy.current) return
    if (next === route) { scrollToTop(); return }
    const swap = () => {
      setRoute(next)
      if (location.hash !== `#${next}`) history.pushState(null, '', `#${next}`)
      world.progress = 0
      nav.focusOnMount = true // the incoming page focuses its h1 when it mounts
      requestAnimationFrame(() => { scrollToTop(); refreshScroll() })
    }
    if (prefersReduced()) { swap(); return }
    busy.current = true
    pending.current = swap
    setWipeLabel(next === 'about' ? 'Profile' : 'The city')
    setPhase('cover')
  }, [route])

  // Wipe sequence: cover → swap pages → hold the title → reveal → idle.
  const onSlabDone = (def: unknown) => {
    if (def === 'cover') { pending.current(); setPhase('hold'); setTimeout(() => setPhase('reveal'), 300) }
    else if (def === 'reveal') { setPhase('idle'); busy.current = false }
  }

  // Back and forward buttons
  useEffect(() => {
    const onHash = () => { const r = routeFromHash(); if (r !== route) go(r) }
    addEventListener('popstate', onHash)
    addEventListener('hashchange', onHash)
    return () => { removeEventListener('popstate', onHash); removeEventListener('hashchange', onHash) }
  }, [go, route])

  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>Skip to content</a>
        <Backdrop />

        <TopBar route={route} go={go} />

        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={route}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.15, ease: EASE } }}
          >
            {route === 'home'
              ? <Landing go={go} introDone={introDone} />
              : <About />}
          </m.div>
        </AnimatePresence>

        <BottomHud />

        <div className="wipe" aria-hidden="true">
          <m.div className="slab a" variants={slab(0)} initial="idle" animate={phase} onAnimationComplete={onSlabDone} />
          <m.div className="slab b" variants={slab(1)} initial="idle" animate={phase} />
          <m.div className="msg" initial={{ opacity: 0 }} animate={{ opacity: phase === 'hold' ? 1 : 0 }} transition={{ duration: 0.15 }}>
            <span className="label" style={{ color: 'var(--sodium)' }}>Loading</span><span className="display">{wipeLabel}</span>
          </m.div>
        </div>

        <AnimatePresence>{showIntro && <LoadingScreen key="loading" onDone={endIntro} />}</AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  )
}
