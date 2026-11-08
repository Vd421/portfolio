import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import { City } from './city'

gsap.registerPlugin(ScrollTrigger, SplitText)

export { gsap, ScrollTrigger, SplitText }

/** The world the city canvas renders. Pages set targets; the loop eases toward them. */
export const world = {
  night: 0.06,
  pan: 0,
  target: { night: 0.06, pan: 0 },
  t: 0,
  progress: 0, // 0..1 page scroll, for the HUD
}

type Listener = () => void
const listeners = new Set<Listener>()
export function onWorld(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn) } }

export const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Ambient motion the viewer can pause (WCAG 2.2.2). Scroll-linked changes still follow the viewer. */
export const ambient = { paused: false }

let city: City | null = null
let lenis: Lenis | null = null
let started = false

export function startWorld(canvas: HTMLCanvasElement) {
  if (started) return
  started = true
  try { city = new City(canvas) } catch { city = null; return }
  const reduced = prefersReduced()

  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis?.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  }

  let last = 0
  gsap.ticker.add((time) => {
    const dt = Math.min(0.05, time - last); last = time
    if (!ambient.paused && !reduced) world.t += dt
    const k = reduced ? 1 : 1 - Math.pow(0.0015, dt) // frame-rate independent easing
    world.night += (world.target.night - world.night) * k
    world.pan += (world.target.pan - world.pan) * k
    if (document.hidden) return
    city?.render({ t: world.t, night: world.night, pan: reduced ? 0.1 : world.pan })
    listeners.forEach((fn) => fn())
  })

  let raf = 0
  addEventListener('resize', () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => { city?.resize(); ScrollTrigger.refresh() })
  })
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}

export function scrollToEl(sel: string) {
  const el = document.querySelector<HTMLElement>(sel)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.4 })
  else el.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth' })
  const h = el.querySelector<HTMLElement>('h2')
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }) }
}

export function lenisStop(stop: boolean) {
  if (!lenis) return
  if (stop) lenis.stop(); else lenis.start()
}

/** In-game clock: golden hour 18:40 rolling to 23:40 as night falls. */
export function clockFor(night: number) {
  const mins = Math.round(18 * 60 + 40 + night * 300)
  const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0')
  const mm = String(mins % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export function storage(kind: 'session' | 'local') {
  try { return kind === 'session' ? window.sessionStorage : window.localStorage } catch { return null }
}
