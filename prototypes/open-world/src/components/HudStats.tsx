import { useEffect, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { hudStats, skillLevel } from '../data'
import { ambient, loadFx, prefersReduced } from '../world'
import { ease, gsapEase, time } from '../motion-config'

const fmt = new Intl.NumberFormat('en-US')
const STAR = 'M12 1.8l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9l7.1-.6z' // original 5-point star

/**
 * Top-right HUD: a cash-style counter cycling labelled stats, and a 5-star skill meter.
 * Unknown values render as TODO, never a guessed number. The visible counter is aria-hidden;
 * screen readers get every value as static text. Cycling pauses with the Motion toggle and
 * never runs under reduced motion.
 */
export function HudStats({ entered }: { entered: boolean }) {
  const [i, setI] = useState(0)
  const num = useRef<HTMLSpanElement>(null)
  const reduced = prefersReduced()
  const stat = hudStats[i]
  const lit = skillLevel ?? 0

  // Cycle through the stats while visible, unless motion is paused or reduced.
  useEffect(() => {
    if (reduced || !entered || hudStats.length < 2) return
    const id = window.setInterval(() => { if (!ambient.paused && !document.hidden) setI((n) => (n + 1) % hudStats.length) }, time.counterHold * 1000)
    return () => clearInterval(id)
  }, [reduced, entered])

  // Tick the number up on a proxy object (transform-free: text only).
  useEffect(() => {
    const el = num.current
    if (!el || !entered) return
    if (stat.value == null) { el.textContent = 'TODO'; return }
    const target = stat.value
    if (reduced) { el.textContent = fmt.format(target); return }
    let kill = () => {}
    loadFx().then(({ gsap }) => {
      const proxy = { v: 0 }
      const tw = gsap.to(proxy, { v: target, duration: time.counterTick, ease: gsapEase.out,
        onUpdate: () => { el.textContent = fmt.format(Math.round(proxy.v)) } })
      kill = () => tw.kill()
    })
    return () => kill()
  }, [i, entered, reduced, stat.value])

  return (
    <div className="hud-stats" data-hud-stats data-entered={entered || undefined}>
      <div className="cash" aria-hidden="true">
        <span className="cash-label label">{stat.label}</span>
        <span className="cash-value">
          <span className="cash-sign">$</span>
          <span ref={num} className={stat.value == null ? 'cash-num todo-num' : 'cash-num'}>{stat.value == null ? 'TODO' : fmt.format(stat.value)}</span>
        </span>
      </div>
      <dl className="sr-only">
        {hudStats.map((s) => (
          <div key={s.label}><dt>{s.label}</dt><dd>{s.value == null ? 'Not set yet' : fmt.format(s.value)}</dd></div>
        ))}
      </dl>

      <div className="stars-row">
        <m.svg className="stars" viewBox="0 0 132 24" role="img"
          aria-label={skillLevel == null ? 'Skill level not set yet' : `Skill level ${skillLevel} out of 5`}
          initial="off" animate={entered ? 'on' : 'off'}
          variants={{ off: {}, on: { transition: { staggerChildren: time.starStagger } } }}>
          {Array.from({ length: 5 }, (_, k) => (
            <m.path key={k} d={STAR} transform={`translate(${k * 27} 0)`} className={k < lit ? 'star lit' : 'star'}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              variants={k < lit
                ? { off: { opacity: 0, scale: 0.6 }, on: { opacity: 1, scale: 1, transition: { duration: time.reveal, ease: ease.out } } }
                : { off: { opacity: 1 }, on: { opacity: 1 } }} />
          ))}
        </m.svg>
        <span className="label stars-label" aria-hidden="true">
          {skillLevel == null ? <>Skill level <span className="chip todo">TODO</span></> : `Skill level ${skillLevel}/5`}
        </span>
      </div>
    </div>
  )
}
