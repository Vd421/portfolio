import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { abilities, missions, person, story } from './data'
import { Button } from './Button'
import { Intro } from './Intro'
import { finePointer, prefersReduced, saveData, session } from './motion'

const d = (n: number) => ({ '--d': n }) as CSSProperties
const at = (i: number) => ({ '--i': i }) as CSSProperties

const STATS = [
  { to: missions.length, suffix: '', label: 'projects built' },
  { to: 40, suffix: '%', label: 'lower LLM latency at Hapticware' },
  { to: 30, suffix: '%', label: 'faster backend at Vertex Info Soft' },
]

/** Counts up once when `go` turns true. Screen readers get the final value only. */
function CountUp({ to, suffix, go }: { to: number; suffix: string; go: boolean }) {
  const [v, setV] = useState(() => (prefersReduced() ? to : 0))
  useEffect(() => {
    if (!go || prefersReduced()) { if (go) setV(to); return }
    const t0 = performance.now(), dur = 1200
    let raf = 0
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / dur)
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [go, to])
  return <><span aria-hidden="true">{v}{suffix}</span><span className="sr-only">{to}{suffix}</span></>
}

/** Hero motion graphic: hairline rings, ticks and a crosshair, drawn in once; drifts with the pointer. */
function Orb() {
  const layers = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => {
    if (prefersReduced() || !finePointer()) return
    let raf = 0
    const onMove = (e: globalThis.PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5
        layers.current.forEach((el, i) => { if (el) el.style.transform = `translate(${nx * -(8 + i * 10)}px, ${ny * -(8 + i * 10)}px)` })
      })
    }
    addEventListener('pointermove', onMove, { passive: true })
    return () => { removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [])
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5)
  return (
    <div className="orb" aria-hidden="true">
      <div className="orb-layer" ref={(el) => { layers.current[0] = el }}>
        <svg viewBox="-450 -450 900 900">
          <defs>
            <radialGradient id="orb-glow"><stop offset="0" stopColor="#e2683c" stopOpacity="0.16" /><stop offset="1" stopColor="#e2683c" stopOpacity="0" /></radialGradient>
          </defs>
          <circle className="glow" r="300" />
          <circle className="ring dash orb-ring" r="430" style={d(2)} />
          <circle className="ring orb-ring" r="330" style={d(3)} />
        </svg>
      </div>
      <div className="orb-layer" ref={(el) => { layers.current[1] = el }}>
        <svg viewBox="-450 -450 900 900">
          <g className="orb-ring" style={d(4)}>
            {ticks.map((a) => (
              <line key={a} className="tick" x1="0" y1={a % 30 === 0 ? -250 : -258} x2="0" y2="-266" transform={`rotate(${a})`} opacity={a % 30 === 0 ? 0.9 : 0.4} />
            ))}
          </g>
          <circle className="ring orb-ring" r="200" style={d(5)} />
          <g className="orb-ring" style={d(6)}>
            <line className="tick" x1="-120" y1="0" x2="120" y2="0" opacity="0.5" />
            <line className="tick" x1="0" y1="-120" x2="0" y2="120" opacity="0.5" />
            <text x="16" y="-14">{person.coords.replace(/\s+/g, ' ')}</text>
          </g>
        </svg>
      </div>
      <div className="orb-layer" ref={(el) => { layers.current[2] = el }}>
        <svg viewBox="-450 -450 900 900">
          <g className="orb-ring" style={d(7)}>
            <circle className="ember" cx={330 * Math.cos(-0.7)} cy={330 * Math.sin(-0.7)} r="6" />
            <circle className="ring" cx={330 * Math.cos(-0.7)} cy={330 * Math.sin(-0.7)} r="16" />
            <circle className="ember" r="4" />
          </g>
        </svg>
      </div>
    </div>
  )
}

function SecHead({ n, label, children, id }: { n: string; label: string; children: ReactNode; id: string }) {
  return (
    <header className="sec-head">
      <span className="label rv">{n} · {label}</span>
      <h2 id={id} className="h2 rv" style={at(1)}>{children}</h2>
    </header>
  )
}

function Copy({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'fail'>('idle')
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState('done') } catch { setState('fail') }
    window.setTimeout(() => setState('idle'), 2000)
  }
  return (
    <>
      <Button variant="glass" size="sm" onClick={copy} data-state={state}>
        {state === 'done' ? 'Copied' : state === 'fail' ? 'Press ⌘C / Ctrl+C' : 'Copy email'}
      </Button>
      <span className="sr-only" aria-live="polite">{state === 'done' ? 'Email address copied' : ''}</span>
    </>
  )
}

export default function App() {
  const [showIntro, setShowIntro] = useState(() => !prefersReduced() && !saveData() && session()?.getItem('studio:intro') !== '1')
  const [entered, setEntered] = useState(false)

  // Arm the hidden states before first paint; if anything stalls, show everything anyway.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('seq-armed', 'rv-armed')
    const failsafe = window.setTimeout(() => enter(), 6000)
    return () => clearTimeout(failsafe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enter = () => {
    // Two frames so the armed state paints before the transition starts.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.classList.remove('seq-armed')
      setEntered(true)
    }))
  }
  useEffect(() => { if (!showIntro) enter() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll reveals: one entrance per element, staggered by --i within a group.
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.rv, .rv-line')
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) } })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])

  const endIntro = () => {
    try { session()?.setItem('studio:intro', '1') } catch { /* private mode */ }
    setShowIntro(false)
  }

  const jobs = [...story].reverse()

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="grain" aria-hidden="true" />

      <nav className="nav seq" style={d(7)} aria-label="Primary">
        <a className="nav-mark" href="#top"><i aria-hidden="true" />{person.first} {person.last}</a>
        <div className="nav-links">
          <a href="#work">Work</a>
          <a href="#experience">Experience</a>
          <a href="#skills">Skills</a>
          <a href="#contact">Contact</a>
        </div>
        <Button size="sm" href={`mailto:${person.email}`}>Email me</Button>
      </nav>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-name">
          <Orb />
          <div className="wrap hero-inner">
            <span className="status seq" style={d(0)}><i aria-hidden="true" />Open to Forward Deployed &amp; Solutions Engineering roles</span>
            <h1 id="hero-name" className="name">
              <span className="line"><span className="word" style={d(1)}>{person.first}</span></span>
              <span className="line"><span className="word serif" style={d(2)}>{person.last}</span></span>
            </h1>
            <p className="lead seq" style={d(4)}>{person.tagline}</p>
            <div className="cta-row seq" style={d(5)}>
              <Button href="#work" arrow>See my work</Button>
              <Button variant="glass" href="#contact">Get in touch</Button>
            </div>
            <div className="stats seq" style={d(6)}>
              {STATS.map((s) => (
                <div className="stat" key={s.label}>
                  <b><CountUp to={s.to} suffix={s.suffix} go={entered} /></b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="work" aria-labelledby="work-title">
          <div className="wrap">
            <SecHead n="01" label="Selected work" id="work-title">Things I&rsquo;ve <span className="serif">built</span></SecHead>
            <ul className="bento">
              {missions.map((m, i) => (
                <li key={m.id} className={`card rv${m.main ? ' feature' : ''}`} style={at(i % 3)}>
                  <div className="top">
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    {m.main && <span className="badge">Main project</span>}
                  </div>
                  <span className="label kicker">{m.kicker}</span>
                  <h3 className="h3">{m.title}</h3>
                  {m.summary && <p>{m.summary}</p>}
                  {m.stack.length > 0 && (
                    <ul className="chips" aria-label="Built with">{m.stack.map((s) => <li className="chip" key={s}>{s}</li>)}</ul>
                  )}
                  <p className="goal">{m.objective}</p>
                </li>
              ))}
              <li className="card more rv" style={at(1)}>
                <span className="label">Everything else</span>
                <p>Experiments, coursework and works in progress live on GitHub.</p>
                <div><Button variant="glass" size="sm" href={person.github} target="_blank" rel="noopener noreferrer" arrow>More on GitHub</Button></div>
              </li>
            </ul>
          </div>
        </section>

        <section className="section" id="experience" aria-labelledby="xp-title">
          <div className="wrap">
            <SecHead n="02" label="Experience" id="xp-title">Where I&rsquo;ve <span className="serif">worked</span></SecHead>
            <ol className="xp">
              {jobs.map((j, i) => (
                <li className="xp-row rv" key={`${j.where}-${i}`} style={at(i)}>
                  <span className="xp-when">
                    {j.when ?? 'TODO · dates'}{j.now ? ' – Now' : ''}
                    {j.now && <span className="now"><i aria-hidden="true" />Current</span>}
                  </span>
                  <div className="xp-role">
                    <h3 className="h3">{j.title ?? 'TODO · title'}</h3>
                    <p className="xp-where">{j.where}</p>
                  </div>
                  <p className="xp-body">{j.body ?? 'TODO · what you did here'}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="section" id="skills" aria-labelledby="skills-title">
          <div className="wrap">
            <SecHead n="03" label="Skills" id="skills-title">What I <span className="serif">use</span></SecHead>
            <div className="skills">
              {abilities.map((g, i) => (
                <div className="skill-row rv" key={g.name} style={at(i)}>
                  <h3 className="h3">{g.name}</h3>
                  <ul className="chips">{g.items.map((s) => <li className="chip" key={s}>{s}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="contact" aria-labelledby="contact-title">
          <div className="wrap contact">
            <span className="label rv">04 · Contact</span>
            <h2 id="contact-title" className="h2 rv" style={at(1)}>Let&rsquo;s build something <span className="serif">real.</span></h2>
            <p className="lead rv" style={at(2)}>Open to Forward Deployed and Solutions Engineering roles. Email is the fastest way to reach me.</p>
            <div className="mail rv" style={at(3)}>
              <span className="mail-addr">{person.email}</span>
              <Copy text={person.email} />
            </div>
            <div className="cta-row rv" style={at(4)}>
              <Button href={`mailto:${person.email}`} arrow>Email me</Button>
              <Button variant="glass" href={person.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</Button>
              <Button variant="glass" href={person.github} target="_blank" rel="noopener noreferrer">GitHub</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <span>© 2026 {person.first} {person.last}</span>
          <span>{person.base}</span>
        </div>
      </footer>

      {showIntro && <Intro onReveal={enter} onDone={endIntro} />}
    </>
  )
}
