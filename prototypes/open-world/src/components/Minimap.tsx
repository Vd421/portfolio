import { useEffect, useRef } from 'react'
import * as m from 'motion/react-m'
import { sections, type SectionId } from '../data'
import { loadFx, prefersReduced } from '../world'
import { distance, ease, time } from '../motion-config'

const SIZE = 168
const R = 58 // blip ring radius
const pos = (i: number) => {
  const a = (i / sections.length) * Math.PI * 2 - Math.PI / 2
  return { x: SIZE / 2 + Math.cos(a) * R, y: SIZE / 2 + Math.sin(a) * R }
}
const route = sections.map((_, i) => pos(i)).map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

/**
 * Bottom-left minimap: an original stylized street map with one blip per home section.
 * Blips are buttons (44 px targets) that scroll to their section; the current one is filled and
 * pulses once on enter. The map turns ±12° with page scroll (scrubbed). Phones get a bottom nav.
 */
export function Minimap({ active, onGo }: { active: SectionId; onGo: (id: SectionId) => void }) {
  const map = useRef<HTMLDivElement>(null)
  const index = sections.findIndex((s) => s.id === active)

  useEffect(() => {
    if (prefersReduced()) return
    let kill = () => {}
    loadFx().then(({ gsap }) => {
      const main = document.getElementById('main')
      if (!map.current || !main) return
      const tw = gsap.fromTo(map.current, { rotate: -distance.minimapRotate }, {
        rotate: distance.minimapRotate, ease: 'none',
        scrollTrigger: { trigger: main, start: 'top top', end: 'bottom bottom', scrub: true },
      })
      kill = () => { tw.scrollTrigger?.kill(); tw.kill() }
    })
    return () => kill()
  }, [])

  return (
    <>
      <nav className="minimap" aria-label="Sections">
        <div className="minimap-disc">
          <div className="minimap-map" ref={map}>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
              {/* Original map: a river, two curved avenues, a grid of blocks */}
              <path d="M-10 118 C40 104 70 128 110 112 S160 92 180 100" stroke="rgb(14 42 51 / 0.9)" strokeWidth="14" fill="none" />
              <g stroke="rgb(244 241 234 / 0.12)" strokeWidth="5" fill="none">
                <path d="M20 -10 C40 60 30 110 60 180" /><path d="M-10 48 C60 60 110 40 180 62" />
                <path d="M120 -10 L136 180" />
              </g>
              <g fill="rgb(244 241 234 / 0.05)">
                {[[34, 70], [70, 74], [100, 70], [40, 22], [74, 26], [104, 24], [44, 132], [80, 140], [140, 128]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="22" height="16" rx="2" />)}
              </g>
              <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgb(244 241 234 / 0.14)" />
              <path d={route} fill="none" stroke="rgb(255 122 61 / 0.55)" strokeWidth="1.5" strokeDasharray="3 4" />
            </svg>
            {sections.map((s, i) => {
              const p = pos(i)
              const on = s.id === active
              return (
                <button key={s.id} type="button" className={`blip${on ? ' on' : ''}`} style={{ left: p.x, top: p.y }}
                  aria-label={`Go to ${s.label}`} aria-current={on ? 'location' : undefined} onClick={() => onGo(s.id)}>
                  <span className="blip-dot" aria-hidden="true" />
                  {on && (
                    <m.span key={`pulse-${s.id}`} className="blip-pulse" aria-hidden="true"
                      initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }}
                      transition={{ duration: time.blipPulse, ease: ease.out }} />
                  )}
                  <span className="blip-tip" aria-hidden="true">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <p className="minimap-label label">
          {sections[index]?.label} <span className="tnum">· {index + 1}/{sections.length}</span>
        </p>
      </nav>

      <nav className="bottom-nav" aria-label="Sections">
        {sections.map((s) => (
          <button key={s.id} type="button" aria-current={s.id === active ? 'location' : undefined} onClick={() => onGo(s.id)}
            aria-label={s.short === s.label ? undefined : `${s.short} (${s.label})`}>
            <span className="bn-dot" aria-hidden="true" />
            {s.short}
          </button>
        ))}
      </nav>
    </>
  )
}
