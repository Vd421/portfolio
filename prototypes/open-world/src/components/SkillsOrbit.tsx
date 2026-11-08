import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { abilities, missions } from '../data'
import { ambient, loadFx, prefersReduced } from '../world'
import { gsapEase, time } from '../motion-config'

type Skill = { name: string; group: string; gi: number; angle: number } // angle in degrees, 0 = top
const monogram = (s: string) => {
  const words = s.replace(/[^A-Za-z0-9+#]/g, ' ').trim().split(/\s+/)
  return words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 2).replace(/^./, (c) => c.toUpperCase())
}
/** Projects whose stack lists this skill (real data only). */
const usedIn = (skill: string) => missions.filter((m) => m.stack.some((s) => s.toLowerCase() === skill.toLowerCase())).map((m) => m.title)

/**
 * Skills loadout as an orbit. The outer ring (skills) turns slowly one way, the inner ring
 * (categories) the other; labels stay upright. Drag to spin. Select a skill (click, tap, or arrow
 * keys) to swing it to the top and see where it is used. Spinning pauses on hover/focus, with the
 * "Pause spin" button and the global Motion toggle, and never runs under reduced motion.
 * Phones get a grid of the same buttons.
 */
export function SkillsOrbit() {
  const skills: Skill[] = useMemo(() => {
    const total = abilities.reduce((n, g) => n + g.items.length, 0)
    let k = 0
    return abilities.flatMap((g, gi) => g.items.map((name) => ({ name, group: g.name, gi, angle: ((k++ + 0.5) / total) * 360 })))
  }, [])
  const cats = useMemo(() => abilities.map((g, gi) => {
    const own = skills.filter((s) => s.gi === gi)
    return { name: g.name, gi, angle: (own[0].angle + own[own.length - 1].angle) / 2 }
  }), [skills])

  const [sel, setSel] = useState(0)
  const [paused, setPaused] = useState(false)
  // Entrance: pending until first in view (motion allowed only), then items pop in, staggered.
  const [pop, setPop] = useState<'pending' | 'in' | undefined>(() => (prefersReduced() ? undefined : 'pending'))
  const box = useRef<HTMLDivElement>(null)
  const rot = useRef({ outer: 0, inner: 0, vel: 0 })
  const hold = useRef(false) // hover / focus / drag
  const drag = useRef<{ x: number; last: number; startX: number; active: boolean; id: number } | null>(null)
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const reduced = prefersReduced()
  const current = skills[sel]
  const where = usedIn(current.name)

  const apply = () => {
    const el = box.current
    if (!el) return
    el.style.setProperty('--rot', `${rot.current.outer}deg`)
    el.style.setProperty('--rot-in', `${rot.current.inner}deg`)
  }

  useEffect(() => {
    if (pop !== 'pending' || !box.current) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setPop('in'); io.disconnect() } }, { threshold: 0.25 })
    io.observe(box.current)
    const fallback = window.setTimeout(() => setPop('in'), 8000) // never leave it hidden
    return () => { io.disconnect(); clearTimeout(fallback) }
  }, [pop])

  // Continuous slow spin, only while the orbit is visible and nothing holds it.
  useEffect(() => {
    if (reduced) return
    let kill = () => {}
    let visible = false
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    if (box.current) io.observe(box.current)
    loadFx().then(({ gsap }) => {
      const tick = (_t: number, dtMs: number) => {
        if (!visible || document.hidden) return
        const dt = Math.min(0.05, dtMs / 1000)
        const r = rot.current
        if (Math.abs(r.vel) > 0.01) { r.outer += r.vel * dt; r.inner -= r.vel * dt * 0.5; r.vel *= Math.pow(0.04, dt) } // drag inertia
        else if (!paused && !hold.current && !ambient.paused) { r.outer += (360 / time.orbitTurn) * dt; r.inner -= (360 / time.orbitTurnInner) * dt }
        apply()
      }
      gsap.ticker.add(tick)
      kill = () => gsap.ticker.remove(tick)
    })
    return () => { kill(); io.disconnect() }
  }, [paused, reduced])

  /** Select a skill and swing it to the top of the ring (shortest way round). */
  const select = (i: number, focus = false) => {
    setSel(i)
    if (focus) btns.current[i]?.focus({ preventScroll: true })
    const r = rot.current
    r.vel = 0
    const target = -skills[i].angle
    const delta = ((((target - r.outer) % 360) + 540) % 360) - 180
    if (reduced) { r.outer += delta; apply(); return }
    loadFx().then(({ gsap }) => gsap.to(r, { outer: r.outer + delta, duration: time.orbitSnap, ease: gsapEase.out, onUpdate: apply, overwrite: true }))
  }

  const onKey = (e: KeyboardEvent) => {
    const n = skills.length
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); select((sel + 1) % n, true) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); select((sel - 1 + n) % n, true) }
    else if (e.key === 'Home') { e.preventDefault(); select(0, true) }
    else if (e.key === 'End') { e.preventDefault(); select(n - 1, true) }
  }

  // Drag to spin from anywhere on the orbit (items included). A 6 px threshold separates a drag
  // from a click; a drag never selects. Arrow keys are the keyboard / single-pointer alternative.
  const suppressClick = useRef(false)
  const onDown = (e: PointerEvent) => {
    if (reduced || e.button !== 0) return
    drag.current = { x: e.clientX, last: performance.now(), startX: e.clientX, active: false, id: e.pointerId }
  }
  const onMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (!d.active) {
      if (Math.abs(e.clientX - d.startX) < 6) return
      d.active = true
      hold.current = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(d.id)
    }
    const dx = e.clientX - d.x
    const now = performance.now()
    rot.current.outer += dx * 0.35
    rot.current.inner -= dx * 0.18
    rot.current.vel = (dx * 0.35) / Math.max(0.008, (now - d.last) / 1000)
    d.x = e.clientX; d.last = now
    apply()
  }
  const onUp = () => {
    if (drag.current?.active) { suppressClick.current = true; setTimeout(() => { suppressClick.current = false }, 0) }
    drag.current = null; hold.current = false
  }

  const style = { '--rot': '0deg', '--rot-in': '0deg' } as CSSProperties

  return (
    <div className="orbit-wrap">
      <div className="orbit" ref={box} style={style} data-pop={pop}
        onPointerEnter={() => { hold.current = true }} onPointerLeave={() => { if (!drag.current) hold.current = false }}
        onFocus={() => { hold.current = true }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) hold.current = false }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div className="orbit-core" aria-live="polite">
          <span className="label orbit-core-group">{current.group}</span>
          <strong className="display orbit-core-name">{current.name}</strong>
          <span className="orbit-core-used">
            {where.length ? <>Used in {where.join(', ')}</> : 'Not linked to a listed project yet'}
          </span>
        </div>

        <ul className="ring ring-inner" aria-hidden="true">
          {cats.map((c) => (
            <li key={c.name} className={`orbit-cat g${c.gi}${c.gi === current.gi ? ' on' : ''}`} style={{ '--a': `${c.angle}deg` } as CSSProperties}>
              <span className="upright upright-in">{c.name}</span>
            </li>
          ))}
        </ul>

        <ul className="ring ring-outer" role="listbox" aria-label="Skills" aria-orientation="horizontal" onKeyDown={onKey}>
          {skills.map((s, i) => (
            <li key={s.name} className={`skill g${s.gi}${s.gi === current.gi ? ' in-group' : ''}${i === sel ? ' on' : ''}`} style={{ '--a': `${s.angle}deg`, '--i': i } as CSSProperties} role="presentation">
              <span className="upright">
                <button ref={(el) => { btns.current[i] = el }} type="button" className="skill-btn" role="option"
                  aria-selected={i === sel} tabIndex={i === sel ? 0 : -1} onClick={() => { if (!suppressClick.current) select(i) }}>
                  <span className="skill-icon" aria-hidden="true">{monogram(s.name)}</span>
                  <span className="skill-name">{s.name}</span>
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="orbit-controls">
        <span className="label orbit-hint-wide">Drag to spin · arrow keys to browse</span>
        <span className="label orbit-hint-narrow">Tap a skill to see where it is used</span>
        {!reduced && (
          <button type="button" className="hud-btn orbit-pause" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? 'Resume spin' : 'Pause spin'}
          </button>
        )}
      </div>
    </div>
  )
}
