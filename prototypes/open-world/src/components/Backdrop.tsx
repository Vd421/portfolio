import { useEffect, useRef } from 'react'
import { loadFx, prefersReduced } from '../world'
import { BackdropArt } from '../backdrop-art'

export { BackdropArt }

const LIGHT_RADIUS = 120 // svg units around the pointer
const LIGHT_HOLD = 1800 // ms a window block stays lit after the pointer leaves it

/**
 * Fixed page backdrop: the poster art, static grain, and a night scrim that deepens as you scroll
 * (opacity only). It reacts to the pointer:
 *  - layers shift with the pointer at different depths (transform only; fine pointers, motion allowed);
 *  - building windows near the pointer switch on, then fade off (opacity only; a tap does it on touch).
 * Nothing loops or renders on its own, so it needs no pause control.
 */
export function Backdrop() {
  const root = useRef<HTMLDivElement>(null)

  // Scroll: night scrim + slow layer drift.
  useEffect(() => {
    let kill = () => {}
    loadFx().then(({ gsap }) => {
      const el = root.current
      if (!el) return
      const tweens: gsap.core.Tween[] = []
      const st = { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: true }
      tweens.push(gsap.fromTo(el.querySelector('.backdrop-night'), { opacity: 0 }, { opacity: 0.72, ease: 'none', scrollTrigger: st }))
      if (!prefersReduced()) {
        el.querySelectorAll<SVGGElement>('[data-bd-layer]').forEach((g) => {
          tweens.push(gsap.to(g, { y: 900 * Number(g.dataset.bdLayer), ease: 'none', scrollTrigger: st }))
        })
      }
      kill = () => tweens.forEach((t) => { t.scrollTrigger?.kill(); t.kill() })
    })
    return () => kill()
  }, [])

  // Pointer: windows light up near it; layers tilt with it.
  useEffect(() => {
    const el = root.current
    const svg = el?.querySelector('svg')
    if (!el || !svg) return
    const blocks = [...el.querySelectorAll<SVGGElement>('.bd-win')].map((g) => ({ g, x: Number(g.dataset.bx), off: 0 }))
    const pt = svg.createSVGPoint()
    let frame = 0
    let last: { x: number; y: number } | null = null
    const tilt: ((v: number) => void)[] = []

    const light = () => {
      frame = 0
      if (!last) return
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      pt.x = last.x; pt.y = last.y
      const x = pt.matrixTransform(ctm.inverse()).x
      for (const b of blocks) {
        if (Math.abs(b.x - x) < LIGHT_RADIUS) {
          b.g.classList.add('lit')
          clearTimeout(b.off)
          b.off = window.setTimeout(() => b.g.classList.remove('lit'), LIGHT_HOLD)
        }
      }
    }
    const onPointer = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY }
      if (!frame) frame = requestAnimationFrame(light)
      if (tilt.length) {
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5
        tilt.forEach((f, i) => f(i % 2 ? -ny : -nx))
      }
    }
    addEventListener('pointermove', onPointer, { passive: true })
    addEventListener('pointerdown', onPointer, { passive: true })

    let cancelled = false
    if (!prefersReduced() && matchMedia('(pointer: fine)').matches) {
      loadFx().then(({ gsap }) => {
        if (cancelled) return
        el.querySelectorAll<SVGGElement>('[data-bd-tilt]').forEach((g) => {
          const k = Number(g.dataset.bdTilt)
          const qx = gsap.quickTo(g, 'x', { duration: 0.9, ease: 'power3.out' })
          const qy = gsap.quickTo(g, 'y', { duration: 0.9, ease: 'power3.out' })
          tilt.push((v) => qx(v * k), (v) => qy(v * k * 0.4))
        })
      })
    }
    return () => {
      cancelled = true
      removeEventListener('pointermove', onPointer)
      removeEventListener('pointerdown', onPointer)
      cancelAnimationFrame(frame)
      blocks.forEach((b) => clearTimeout(b.off))
    }
  }, [])

  return (
    <div className="backdrop" ref={root} aria-hidden="true">
      <BackdropArt className="backdrop-art" layers windowsOn />
      <div className="backdrop-night" />
      <div className="grain" />
    </div>
  )
}
