// The world loop: smooth scroll and the shared clock. GSAP and Lenis load after first paint.

type Fx = typeof import('./fx-libs')

/** The world the city renders. Pages set targets; the loop eases toward them. */
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

let lenis: InstanceType<Fx['Lenis']> | null = null
let fx: Fx | null = null
let started = false

export function startWorld() {
  if (started) return
  started = true
  const reduced = prefersReduced()
  loadFx().then((lib) => {
    fx = lib
    // Smooth scroll on desktop only; touch devices keep native scrolling.
    if (!reduced && matchMedia('(min-width: 64rem) and (pointer: fine)').matches) {
      lenis = new lib.Lenis({ lerp: 0.09, wheelMultiplier: 0.9 })
      lenis.on('scroll', lib.ScrollTrigger.update)
      lib.gsap.ticker.add((time) => lenis?.raf(time * 1000))
      lib.gsap.ticker.lagSmoothing(0)
    }
    // Ease the night value (it drives the HUD clock); notify listeners while it moves.
    let last = performance.now() / 1000
    lib.gsap.ticker.add((time) => {
      const dt = Math.min(0.05, time - last); last = time
      if (!ambient.paused && !reduced) world.t += dt
      const before = world.night
      const k = reduced ? 1 : 1 - Math.pow(0.0015, dt)
      world.night += (world.target.night - world.night) * k
      world.pan += (world.target.pan - world.pan) * k
      if (Math.abs(world.night - before) > 1e-4 || !reduced) listeners.forEach((fn) => fn())
    })
  })
  let raf = 0
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => fx?.ScrollTrigger.refresh()) })
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
  const h = el.querySelector<HTMLElement>('h1, h2')
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
