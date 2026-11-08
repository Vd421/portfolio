import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger, SplitText, prefersReduced, scrollToEl, world } from '../world'
import { missions, person, story } from '../data'
import type { Route } from '../components/Hud'

const Todo = ({ children }: { children: string }) => <span className="chip todo">TODO · {children}</span>

const Arrow = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
)
const Pin = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1a5 5 0 0 0-5 5c0 3.6 5 9 5 9s5-5.4 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" /></svg>
)

export function Landing({ go, introDone, setObjective }: { go: (r: Route) => void; introDone: boolean; setObjective: (s: string) => void }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!introDone) return
    const el = root.current!
    const reduced = prefersReduced()
    const wide = matchMedia('(min-width: 64rem)').matches
    if (!reduced) document.documentElement.classList.add('js-motion')

    const ctx = gsap.context(() => {
      // Whole-page scroll drives the city: golden hour at the top, deep night at the bottom.
      ScrollTrigger.create({
        trigger: el, start: 'top top', end: 'bottom bottom',
        onUpdate: (st) => {
          world.progress = st.progress
          world.target.night = 0.08 + st.progress * 0.92
          world.target.pan = 0.16 + st.progress * 0.84
        },
      })

      // Objective text follows the section you are in.
      const objectives: [string, string][] = [
        ['#hero', 'Scroll to drive into the city.'],
        ['#missions', 'Pick a mission. Replay is the main one.'],
        ['#story', 'Follow the line to see how vd got here.'],
        ['#finale', 'Start a mission with vd.'],
      ]
      objectives.forEach(([sel, text]) =>
        ScrollTrigger.create({ trigger: sel, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && setObjective(text) }))

      if (reduced) return

      // Hero: name drops in after the cinematic, then lifts away as you drive off.
      const split = new SplitText('.hero h1 .row', { type: 'chars', aria: 'auto' })
      gsap.timeline()
        .from(split.chars, { yPercent: 110, autoAlpha: 0, filter: 'blur(8px)', rotate: 6, stagger: 0.03, duration: 0.8, ease: 'expo.out' })
        .from('.hero .kicker > *', { autoAlpha: 0, y: 12, filter: 'blur(4px)', stagger: 0.1, duration: 0.3, ease: 'power2.out' }, '-=0.5')
        .from('.hero .lead, .hero .cta-row', { autoAlpha: 0, y: 12, filter: 'blur(4px)', stagger: 0.1, duration: 0.3, ease: 'power2.out' }, '-=0.2')
      gsap.to('.hero-inner', {
        yPercent: -30, scale: 0.92, autoAlpha: 0.25, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      })

      // Section titles slam in with a skew, scrubbed to the scroll.
      gsap.utils.toArray<HTMLElement>('.sec-head h2').forEach((h) => {
        gsap.from(h, { xPercent: -8, skewX: -12, autoAlpha: 0.2, ease: 'none',
          scrollTrigger: { trigger: h, start: 'top 90%', end: 'top 45%', scrub: true } })
      })

      // Missions: a pinned horizontal run on wide screens.
      const track = el.querySelector<HTMLElement>('.missions-track')!
      if (wide) {
        const dist = () => Math.max(0, track.scrollWidth - innerWidth + 32)
        const run = gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: '#missions', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
        })
        gsap.utils.toArray<HTMLElement>('.mission').forEach((card) => {
          gsap.from(card, { rotateY: -14, z: -80, autoAlpha: 0.4, transformPerspective: 900, ease: 'none',
            scrollTrigger: { trigger: card, containerAnimation: run, start: 'left 100%', end: 'left 60%', scrub: true } })
        })
      } else {
        gsap.utils.toArray<HTMLElement>('.mission').forEach((card) =>
          gsap.from(card, { y: 40, autoAlpha: 0, filter: 'blur(4px)', duration: 0.5, ease: 'power2.out', scrollTrigger: { trigger: card, start: 'top 85%' } }))
      }

      // Story: the metro line draws itself and each station lights as you pass it.
      const path = el.querySelector<SVGPathElement>('.metro .route')
      if (path) {
        const len = path.getTotalLength()
        gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none',
          scrollTrigger: { trigger: '.metro', start: 'top 70%', end: 'bottom 60%', scrub: true } })
      }
      gsap.utils.toArray<HTMLElement>('.stop').forEach((stop) => {
        gsap.from(stop.children, { x: 30, autoAlpha: 0, filter: 'blur(4px)', stagger: 0.08, duration: 0.4, ease: 'power2.out',
          scrollTrigger: { trigger: stop, start: 'top 75%' } })
      })

      // Finale: the call to action builds as you arrive.
      const fin = new SplitText('.finale h2', { type: 'words', aria: 'auto' })
      gsap.from(fin.words, { yPercent: 80, autoAlpha: 0, rotate: -4, stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: '.finale', start: 'top 80%', end: 'top 30%', scrub: true } })
    }, el)

    requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => { ctx.revert(); document.documentElement.classList.remove('js-motion') }
  }, [introDone, setObjective])

  const stops = story
  return (
    <main id="main" ref={root} tabIndex={-1}>
      <section id="hero" className="hero wrap" aria-labelledby="hero-title">
        <div className="hero-inner">
          <div className="kicker">
            <span className="chip sodium"><Pin /> {person.base}</span>
            <span className="chip">{person.coords}</span>
            <span className="chip signal">Player online</span>
          </div>
          <h1 id="hero-title" className="display">
            <span className="row">{person.first}</span>
            <span className="row outline">{person.last}</span>
          </h1>
          <p className="lead">{person.roles[0]}. {person.tagline}</p>
          <div className="cta-row">
            <a className="btn primary" href="#missions" onClick={(e) => { e.preventDefault(); scrollToEl('#missions') }}>Start main mission <Arrow /></a>
            <a className="btn" href="#about" onClick={(e) => { e.preventDefault(); go('about') }}>View profile</a>
          </div>
        </div>
      </section>

      <section id="missions" className="section" aria-labelledby="missions-title">
        <div className="wrap missions-pin">
          <div className="sec-head">
            <span className="label eyebrow">Missions · {missions.length} available</span>
            <h2 id="missions-title" className="display">Missions</h2>
          </div>
          <div className="missions-track">
            {missions.map((m, i) => (
              <article key={m.id} className={`mission${m.main ? ' main' : ''}`} aria-labelledby={`m-${m.id}`}>
                <span className={`chip tag ${m.main ? 'sodium' : ''}`}>{m.main ? 'Main mission' : 'Side mission'}</span>
                <span className="num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span className="kick">{m.kicker}</span>
                <h3 id={`m-${m.id}`}>{m.title}</h3>
                {m.summary ? <p>{m.summary}</p> : <Todo>one-line summary</Todo>}
                {m.stack.length > 0 ? (
                  <ul className="stack" aria-label="Built with" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {m.stack.map((s) => <li key={s} className="chip">{s}</li>)}
                  </ul>
                ) : <Todo>stack</Todo>}
                <div className="obj">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M7 0l2 5h5l-4 3 1.5 6L7 10.5 2.5 14 4 8 0 5h5z" /></svg>
                  <span><span className="sr-only">Objective: </span>{m.objective}</span>
                </div>
                {m.link ? <a className="btn" href={m.link}>Open mission <Arrow /></a> : <Todo>repository or demo link</Todo>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="story" className="section" aria-labelledby="story-title">
        <div className="wrap">
          <div className="sec-head">
            <span className="label eyebrow">Story so far</span>
            <h2 id="story-title" className="display">The route</h2>
          </div>
          <div className="metro panel">
            <svg className="line" viewBox="0 0 56 1000" preserveAspectRatio="none" aria-hidden="true">
              <path d="M28 0 V1000" stroke="rgb(243 236 220 / 0.14)" strokeWidth="6" fill="none" />
              <path className="route" d="M28 0 V1000" stroke="#45e3c6" strokeWidth="6" fill="none" />
            </svg>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
              {stops.map((s, i) => (
                <li key={i} className="stop">
                  <span className="label when">{s.when ?? 'TODO · dates'}{s.now ? ' · Now' : ''}</span>
                  <h3>{s.title ?? <Todo>job title</Todo>}</h3>
                  <span className="where">{s.where}</span>
                  {s.body ? <p>{s.body}</p> : <Todo>what you built here</Todo>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="finale" className="finale wrap" aria-labelledby="finale-title">
        <span className="label" style={{ color: 'var(--signal)' }}>New mission available</span>
        <h2 id="finale-title" className="display">Hire <span className="hot">vd</span> for your next deployment</h2>
        <div className="cta-row">
          <a className="btn primary" href={person.linkedin} target="_blank" rel="noreferrer">Message on LinkedIn <Arrow /></a>
          <a className="btn" href={person.github} target="_blank" rel="noreferrer">GitHub</a>
          <a className="btn" href="#about" onClick={(e) => { e.preventDefault(); go('about') }}>Full profile</a>
        </div>
        <p className="label" style={{ marginTop: 20 }}>Email · <span style={{ userSelect: 'all', color: 'var(--paper)' }}>{person.email}</span></p>
      </section>
    </main>
  )
}
