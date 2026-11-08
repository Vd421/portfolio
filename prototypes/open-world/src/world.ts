// The world loop: city rendering, smooth scroll and the shared clock.
// Nothing heavy is imported statically. GSAP, Lenis and the 2D city load after first paint;
// the 3D city loads on capable desktops after the intro.
import type { City } from './city'
import type { City3D } from './three-city'

type Fx = typeof import('./fx-libs')

/** The world the city renders. Pages set targets; the loop eases toward them. */
export const world = {
  night: 0.06,
  pan: 0,
  target: { night: 0.06, pan: 0 },
  t: 0,
  progress: 0, // 0..1 page scroll, for the HUD
  mode: 'poster' as 'poster' | '2d' | '3d',
  /** True while a full-screen overlay (the loading screen) hides the city: skip drawing. */
  covered: false,
}

type Listener = () => void
const listeners = new Set<Listener>()
export function onWorld(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn) } }

export const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Ambient motion the viewer can pause (WCAG 2.2.2). Scroll-linked changes still follow the viewer. */
export const ambient = { paused: false }

/** Set by navigation so the next page focuses its heading once it has mounted. */
export const nav = { focusOnMount: false }
export function focusHeadingIfNavigated(root: HTMLElement | null) {
  if (!nav.focusOnMount || !root) return
  nav.focusOnMount = false
  const h = root.querySelector<HTMLElement>('h1')
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }) }
}

/** Run once the page has painted and the main thread is free. */
export function whenIdle(fn: () => void, timeout = 1500) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    if (ric) ric(fn, { timeout }); else setTimeout(fn, 200)
  }))
}

let fxPromise: Promise<Fx> | null = null
/** GSAP + ScrollTrigger + SplitText + Lenis, loaded once, after first paint. */
export function loadFx(): Promise<Fx> {
  if (!fxPromise) fxPromise = new Promise((resolve) => whenIdle(() => resolve(import('./fx-libs')), 600))
  return fxPromise
}

let city: City | null = null
let city3d: City3D | null = null
let lenis: InstanceType<Fx['Lenis']> | null = null
let fx: Fx | null = null
let started = false
let canvas3dEl: HTMLCanvasElement | null = null
let dirty = true
const pointer = { x: 0, y: 0 }

export function startWorld(canvas2d: HTMLCanvasElement, canvas3d: HTMLCanvasElement) {
  if (started) return
  started = true
  canvas3dEl = canvas3d
  const reduced = prefersReduced()

  loadFx().then(async (lib) => {
    fx = lib
    if (!reduced) {
      lenis = new lib.Lenis({ lerp: 0.09, wheelMultiplier: 0.9 })
      lenis.on('scroll', lib.ScrollTrigger.update)
      lib.gsap.ticker.add((time) => lenis?.raf(time * 1000))
      lib.gsap.ticker.lagSmoothing(0)
    }
    const { City } = await import('./city')
    try { city = new City(canvas2d, innerWidth < 640 ? 1.25 : 1.5) } catch { city = null; return }
    world.mode = '2d'
    canvas2d.classList.add('ready')
    loop(lib, reduced)
  })

  addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5 }, { passive: true })
  let raf = 0
  addEventListener('resize', () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      city?.resize()
      city3d?.setSize(innerWidth, innerHeight)
      dirty = true
      fx?.ScrollTrigger.refresh()
    })
  })
}

/** After the intro: on capable desktops, load the 3D city and crossfade it in. */
export function upgradeTo3D() {
  if (city3d || !canvas3dEl || prefersReduced()) return
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  const capable = matchMedia('(min-width: 64rem) and (pointer: fine)').matches
    && !nav.connection?.saveData
    && (nav.deviceMemory ?? 8) >= 4
    && (navigator.hardwareConcurrency ?? 8) >= 4
    && !!document.createElement('canvas').getContext('webgl2')
  if (!capable) return
  const el = canvas3dEl
  whenIdle(async () => {
    try {
      const { City3D, loadThree } = await import('./three-city')
      const THREE = await loadThree()
      city3d = new City3D(THREE, el, { dpr: Math.min(devicePixelRatio || 1, 1.5), width: innerWidth, height: innerHeight })
      city3d.render({ t: world.t, night: world.night, pan: world.pan })
      world.mode = '3d'
      el.classList.add('ready') // opacity crossfade in CSS
      dirty = true
    } catch { /* stay on the 2D city */ }
  }, 3000)
}

function loop(lib: Fx, reduced: boolean) {
  let last = performance.now() / 1000
  let slow = 0
  let lastNight = -1, lastPan = -1
  const frameMs: number[] = []
  lib.gsap.ticker.add((time) => {
    const dt = Math.min(0.05, time - last); last = time
    const animating = !ambient.paused && !reduced
    if (animating) world.t += dt
    const k = reduced ? 1 : 1 - Math.pow(0.0015, dt) // frame-rate independent easing
    world.night += (world.target.night - world.night) * k
    world.pan += (world.target.pan - world.pan) * k
    if (document.hidden || (world.covered && !dirty)) return
    const changed = Math.abs(world.night - lastNight) > 0.0008 || Math.abs(world.pan - lastPan) > 0.0004
    if (animating || changed || dirty) {
      dirty = false
      lastNight = world.night; lastPan = world.pan
      const t0 = performance.now()
      const pan = reduced ? 0.1 : world.pan
      if (world.mode === '3d' && city3d) city3d.render({ t: world.t, night: world.night, pan, px: pointer.x, py: pointer.y })
      else city?.render({ t: world.t, night: world.night, pan })
      const ms = performance.now() - t0
      frameMs.push(ms); if (frameMs.length > 40) frameMs.shift()
      const avg = frameMs.reduce((a, b) => a + b, 0) / frameMs.length
      // Adaptive quality: drop resolution, then fall back from 3D to 2D if frames stay slow.
      if (frameMs.length === 40 && avg > 14) {
        if (++slow > 3) {
          slow = 0; frameMs.length = 0
          if (world.mode === '3d' && city3d) { city3d.setDpr(1); if (avg > 24) dropTo2D() }
          else city?.setMaxDpr(1)
        }
      } else slow = 0
    }
    listeners.forEach((fn) => fn())
  })
}

function dropTo2D() {
  if (!city3d || !canvas3dEl) return
  canvas3dEl.classList.remove('ready')
  world.mode = '2d'
  const c = city3d; city3d = null
  setTimeout(() => c.dispose(), 700)
  dirty = true
}

export function refreshScroll() { fx?.ScrollTrigger.refresh() }

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}

/** Jump to a scroll position immediately (used to bring a focused element into view). */
export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true })
  else window.scrollTo(0, y)
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
