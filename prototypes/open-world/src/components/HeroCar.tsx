import { useEffect, useRef } from 'react'
import { BODY, CANOPY, FIN, HEADLIGHT, INTAKE, TAILLIGHT, WHEELS, svgPath } from '../car-shape'
import { ambient, loadFx, prefersReduced } from '../world'
import { colors, distance } from '../motion-config'

// Poster view: 1 unit = 110 px, origin at the ground under the car's centre.
const S = 110, OX = 300, OY = 214

/** Flat poster-style side view of the hypercar: the fallback and the first paint. */
function CarPoster() {
  const wheel = (x: number) => (
    <g key={x}>
      <circle cx={OX + x * S} cy={OY - WHEELS.y * S} r={WHEELS.radius * S} fill="#0b0c0f" />
      <circle cx={OX + x * S} cy={OY - WHEELS.y * S} r={WHEELS.radius * S * 0.62} fill="none" stroke={colors.dusk} strokeWidth="3" />
      <circle cx={OX + x * S} cy={OY - WHEELS.y * S} r={WHEELS.radius * S * 0.16} fill="#1c222c" />
    </g>
  )
  const [[hx1, hy1], [hx2, hy2]] = HEADLIGHT
  const [[tx1, ty1], [tx2, ty2]] = TAILLIGHT
  return (
    <svg className="car-poster" viewBox="0 0 600 260" aria-hidden="true">
      <defs>
        <linearGradient id="car-rim" x1="0" x2="1"><stop offset="0" stopColor={colors.pink} /><stop offset="1" stopColor={colors.dusk} /></linearGradient>
      </defs>
      <ellipse cx={OX} cy={OY + 4} rx="280" ry="16" fill="rgb(0 0 0 / 0.55)" />
      <path d={svgPath(FIN, S, OX, OY)} fill="#161c26" />
      <path d={svgPath(BODY, S, OX, OY)} fill="#161c26" />
      <path d={svgPath(INTAKE, S, OX, OY)} fill="#06080b" />
      <path d={svgPath(CANOPY, S, OX, OY)} fill="#0a0e13" />
      {/* Sunset rim light along the roofline */}
      <path d={BODY.slice(1, 9).map(([x, y], i) => `${i ? 'L' : 'M'}${(OX + x * S).toFixed(1)} ${(OY - y * S).toFixed(1)}`).join(' ')}
        fill="none" stroke="url(#car-rim)" strokeWidth="3" strokeLinejoin="round" />
      <path d={`M${OX + 0.55 * S} ${OY - 0.86 * S} L${OX - 0.15 * S} ${OY - 0.97 * S}`} stroke={colors.pink} strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
      {wheel(WHEELS.front)}{wheel(WHEELS.rear)}
      <line x1={OX + hx1 * S} y1={OY - hy1 * S} x2={OX + hx2 * S} y2={OY - hy2 * S} stroke={colors.hud} strokeWidth="5" strokeLinecap="round" />
      <line x1={OX + tx1 * S} y1={OY - ty1 * S} x2={OX + tx2 * S} y2={OY - ty2 * S} stroke={colors.pink} strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

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
      const [{ Car3D }, { loadThree }] = await Promise.all([import('../car3d'), import('../three-city')])
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
