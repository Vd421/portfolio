import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { loadFx, lenisStop, prefersReduced, scrollToEl, scrollToY, world, focusHeadingIfNavigated } from '../world'
import { missions, person, story, type Mission } from '../data'
import type { Route } from '../components/Hud'
import { LottieIcon } from '../components/LottieIcon'
import { pingAnim } from '../lottie'

const Todo = ({ children }: { children: string }) => <span className="chip todo">TODO · {children}</span>
const Arrow = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
)
const Pin = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1a5 5 0 0 0-5 5c0 3.6 5 9 5 9s5-5.4 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" /></svg>
)
const Star = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M7 0l2 5h5l-4 3 1.5 6L7 10.5 2.5 14 4 8 0 5h5z" /></svg>
)

// Shared hover and tap for every button-like control: transform only.
const press = { whileHover: { y: -2 }, whileTap: { scale: 0.96 }, transition: { type: 'spring', duration: 0.3, bounce: 0 } } as const

function MissionBody({ m: mi, full }: { m: Mission; full?: boolean }) {
  return (
    <>
      <span className="kick">{mi.kicker}</span>
      <h3 id={`m-${mi.id}${full ? '-full' : ''}`}>{mi.title}</h3>
      {mi.summary ? <p>{mi.summary}</p> : <Todo>one-line summary</Todo>}
      {mi.stack.length > 0 ? (
        <ul className="stack" aria-label="Built with">{mi.stack.map((s) => <li key={s} className="chip">{s}</li>)}</ul>
      ) : <Todo>stack</Todo>}
      <div className="obj"><Star /><span><span className="sr-only">Objective: </span>{mi.objective}</span></div>
    </>
  )
}

/** Full-screen mission briefing: the card grows into it with a shared layout animation. */
function Briefing({ mission, onClose }: { mission: Mission; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => { focusHeadingIfNavigated(root.current) }, [])

  useEffect(() => {
    lenisStop(true)
    close.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('keydown', onKey); lenisStop(false)
      // The card remounts after the shared-layout animation; return focus to its button.
      requestAnimationFrame(() => document.getElementById(`brief-${mission.id}`)?.focus({ preventScroll: true }))
    }
  }, [onClose, mission.id])
  return (
    <div className="briefing-wrap" role="dialog" aria-modal="true" aria-labelledby={`m-${mission.id}-full`}>
      <m.div className="briefing-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <m.article layoutId={`card-${mission.id}`} className={`mission briefing${mission.main ? ' main' : ''}`} transition={{ type: 'spring', duration: 0.5, bounce: 0 }}>
        <m.div className="briefing-inner" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
          <span className="label" style={{ color: 'var(--sodium)' }}>{mission.main ? 'Main mission · briefing' : 'Side mission · briefing'}</span>
          <MissionBody m={mission} full />
          <div className="briefing-todo">
            <Todo>problem it solved</Todo><Todo>your role</Todo><Todo>results you can stand behind</Todo>
            {!mission.link && <Todo>repository or demo link</Todo>}
          </div>
          <m.button ref={close} type="button" className="btn" onClick={onClose} {...press}>Close briefing</m.button>
        </m.div>
      </m.article>
    </div>
  )
}

export function Landing({ go, introDone, setObjective }: { go: (r: Route) => void; introDone: boolean; setObjective: (s: string) => void }) {
  const root = useRef<HTMLElement>(null)
  const [open, setOpen] = useState<Mission | null>(null)

  useEffect(() => {
    if (!introDone) return
    const el = root.current!
    const reduced = prefersReduced()
    const wide = matchMedia('(min-width: 64rem)').matches
    if (!reduced) document.documentElement.classList.add('js-motion')

    let ctx: { revert: () => void } | null = null
    let cancelled = false
    loadFx().then(({ gsap, ScrollTrigger, SplitText }) => {
    if (cancelled) return
    ctx = gsap.context(() => {
      // Whole-page scroll drives the city: golden hour at the top, deep night at the bottom.
      ScrollTrigger.create({
        trigger: el, start: 'top top', end: 'bottom bottom',
        onUpdate: (st) => {
          world.progress = st.progress
          world.target.night = 0.08 + st.progress * 0.92
          world.target.pan = 0.16 + st.progress * 0.84
        },
      })
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
      const split = new SplitText('.hero h1', { type: 'chars', aria: 'auto' })
      gsap.timeline()
        .from(split.chars, { yPercent: 110, autoAlpha: 0, rotate: 6, stagger: 0.03, duration: 0.8, ease: 'expo.out' })
        .from('.hero .kicker > *, .hero .lead, .hero .cta-row', { autoAlpha: 0, y: 12, stagger: 0.1, duration: 0.3, ease: 'power2.out' }, '-=0.5')
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
        gsap.utils.toArray<HTMLElement>('.mission-slot').forEach((card) => {
          gsap.from(card, { rotateY: -14, z: -80, autoAlpha: 0.4, transformPerspective: 900, ease: 'none',
            scrollTrigger: { trigger: card, containerAnimation: run, start: 'left 100%', end: 'left 60%', scrub: true } })
        })
        // Keyboard focus on an off-screen card scrolls the run so the card is in view (WCAG 2.4.11).
        const st = run.scrollTrigger!
        const onFocus = (e: FocusEvent) => {
          const slot = (e.target as HTMLElement).closest<HTMLElement>('.mission-slot')
          const max = dist()
          if (!slot || !max) return
          const p = Math.min(1, Math.max(0, (slot.offsetLeft - 32) / max))
          scrollToY(st.start + p * (st.end - st.start))
        }
        track.addEventListener('focusin', onFocus)
        return () => track.removeEventListener('focusin', onFocus)
      } else {
        gsap.utils.toArray<HTMLElement>('.mission-slot').forEach((card) =>
          gsap.from(card, { y: 40, autoAlpha: 0, duration: 0.5, ease: 'power2.out', scrollTrigger: { trigger: card, start: 'top 85%' } }))
      }

      // Story: the metro line grows down (scaleY) and each station slides in as you pass it.
      gsap.fromTo('.metro .route', { scaleY: 0 }, { scaleY: 1, transformOrigin: '50% 0%', ease: 'none',
        scrollTrigger: { trigger: '.metro', start: 'top 70%', end: 'bottom 60%', scrub: true } })
      gsap.utils.toArray<HTMLElement>('.stop').forEach((stop) => {
        gsap.from(stop.children, { x: 30, autoAlpha: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out',
          scrollTrigger: { trigger: stop, start: 'top 75%' } })
      })

      // Finale: the call to action builds as you arrive.
      const fin = new SplitText('.finale h2', { type: 'words', aria: 'auto' })
      gsap.from(fin.words, { yPercent: 80, autoAlpha: 0, rotate: -4, stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: '.finale', start: 'top 80%', end: 'top 30%', scrub: true } })
    }, el)
    requestAnimationFrame(() => ScrollTrigger.refresh())
    })
    return () => { cancelled = true; ctx?.revert(); document.documentElement.classList.remove('js-motion') }
  }, [introDone, setObjective])

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
            <m.a className="btn primary" href="#missions" {...press} onClick={(e) => { e.preventDefault(); scrollToEl('#missions') }}>Start main mission <Arrow /></m.a>
            <m.a className="btn" href="#about" {...press} onClick={(e) => { e.preventDefault(); go('about') }}>View profile</m.a>
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
            {missions.map((mi, i) => (
              <div key={mi.id} className={`mission-slot${mi.main ? ' main' : ''}`}>
                {open?.id !== mi.id && <m.article layoutId={`card-${mi.id}`} className={`mission${mi.main ? ' main' : ''}`} aria-labelledby={`m-${mi.id}`}
                  whileHover={{ y: -6 }} transition={{ type: 'spring', duration: 0.4, bounce: 0 }}>
                  <span className={`chip tag ${mi.main ? 'sodium' : ''}`}>
                    {mi.main && <LottieIcon data={pingAnim} loop className="ping" />}
                    {mi.main ? 'Main mission' : 'Side mission'}
                  </span>
                  <span className="num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <MissionBody m={mi} />
                  <m.button type="button" className="btn" {...press} id={`brief-${mi.id}`} onClick={() => setOpen(mi)} aria-haspopup="dialog">
                    Open briefing <Arrow />
                  </m.button>
                </m.article>}
              </div>
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
            <ol className="stops">
              {story.map((s, i) => (
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
          <m.a className="btn primary" href={person.linkedin} target="_blank" rel="noreferrer" {...press}>Message on LinkedIn <Arrow /></m.a>
          <m.a className="btn" href={person.github} target="_blank" rel="noreferrer" {...press}>GitHub</m.a>
          <m.a className="btn" href="#about" {...press} onClick={(e) => { e.preventDefault(); go('about') }}>Full profile</m.a>
        </div>
        <p className="label" style={{ marginTop: 20 }}>Email · <span style={{ userSelect: 'all', color: 'var(--paper)' }}>{person.email}</span></p>
      </section>

      <AnimatePresence>{open && <Briefing key={open.id} mission={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </main>
  )
}
