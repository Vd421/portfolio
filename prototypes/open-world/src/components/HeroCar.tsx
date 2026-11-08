import { useEffect, useRef } from 'react'
import { CarPoster } from '../car-poster'
import { ambient, loadFx, prefersReduced } from '../world'
import { colors, distance } from '../motion-config'

/**
 * Hero centrepiece. The SVG poster renders immediately; capable desktops (wide screen, fine pointer,
 * WebGL2, motion allowed) get the low-poly 3D model once the intro is done, drawn only while visible.
 * As the hero scrolls out, the car drives across and out of frame (transform only, scrubbed).
 */
export function HeroCar({ ready }: { ready: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!ready || prefersReduced()) return
    const el = box.current!, cv = canvas.current!
    let cancelled = false
    let cleanup = () => {}
    const drive = { p: 0 }

    loadFx().then(async ({ gsap }) => {
      if (cancelled) return
      // Scroll beat: the car drives out of frame as the hero leaves.
      const tw = gsap.to(el, {
        xPercent: distance.carDrive, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (st) => { drive.p = st.progress } },
      })
      cleanup = () => { tw.scrollTrigger?.kill(); tw.kill() }

      const capable = matchMedia('(min-width: 64rem) and (pointer: fine)').matches && !!document.createElement('canvas').getContext('webgl2')
      if (!capable) return
      const [{ Car3D }, { loadThree }] = await Promise.all([import('../car3d'), import('../three-loader')])
      const THREE = await loadThree().catch(() => null)
      if (!THREE || cancelled) return
      const car = new Car3D(THREE, cv, Math.min(devicePixelRatio || 1, 1.5))
      const size = () => { const r = el.getBoundingClientRect(); car.setSize(Math.max(1, r.width), Math.max(1, r.height)) }
      size()
      let visible = true, t = 0, first = true
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
      io.observe(el)
      const tick = (_time: number, dtMs: number) => {
        if (!visible || document.hidden) return
        const dt = ambient.paused ? 0 : Math.min(0.05, dtMs / 1000)
        t += dt
        car.render(t, dt, drive.p)
        if (first) { first = false; el.dataset.car3d = '' } // CSS crossfades poster → canvas
      }
      gsap.ticker.add(tick)
      addEventListener('resize', size)
      const prev = cleanup
      cleanup = () => { prev(); gsap.ticker.remove(tick); io.disconnect(); removeEventListener('resize', size); car.dispose() }
    })
    return () => { cancelled = true; cleanup() }
  }, [ready])

  return (
    <div className="hero-car" ref={box} aria-hidden="true">
      <CarPoster />
      <canvas ref={canvas} className="car-canvas" />
    </div>
  )
}
