import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { loadFx, lenisStop, prefersReduced, scrollToEl, scrollToY, world, focusHeadingIfNavigated } from '../world'
import { aboutStats, missions, person, sections, story, type Mission, type SectionId } from '../data'
import type { Route } from '../components/Hud'
import { LottieIcon } from '../components/LottieIcon'
import { pingAnim } from '../lottie'
import { HudStats } from '../components/HudStats'
import { HeroCar } from '../components/HeroCar'
import { Minimap } from '../components/Minimap'
import { ContactPhone } from '../components/ContactPhone'
import { SkillsOrbit } from '../components/SkillsOrbit'
import { distance, gsapEase, revealStart, time } from '../motion-config'

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

/** Section heading: eyebrow + display title. `data-reveal-head` marks it for the entrance. */
function SecHead({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div className="sec-head" data-reveal-head>
      <span className="label eyebrow">{eyebrow}</span>
      <h2 id={id} className="display">{title}</h2>
    </div>
  )
}

export function Landing({ go, introDone }: { go: (r: Route) => void; introDone: boolean }) {
  const root = useRef<HTMLElement>(null)
  const [open, setOpen] = useState<Mission | null>(null)
  const [active, setActive] = useState<SectionId>('hero')
  // The HUD waits for the hero entrance; under reduced motion it is simply there.
  const [hudIn, setHudIn] = useState(prefersReduced)

  useEffect(() => { focusHeadingIfNavigated(root.current) }, [])

  useEffect(() => {
    if (!introDone) return
    // Safety net (rule 5): the HUD shows even if the entrance never runs.
    const hudFallback = window.setTimeout(() => setHudIn(true), 2500)
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
      // The minimap follows the section in the middle of the screen. Created after any pin
      // (see trackSections below) so their positions include the pinned run's extra scroll.
      const trackSections = () => {
        sections.forEach((s) => ScrollTrigger.create({
          trigger: `#${s.id}`, start: 'top center', end: 'bottom center', refreshPriority: -1,
          onToggle: (st) => { if (st.isActive) setActive(s.id) },
        }))
        ScrollTrigger.sort()
      }

      if (reduced) { trackSections(); setHudIn(true); return } // reduced motion: no pin, no scrub, no reveals

      // Hero entrance, once: name per word → underline draws → tagline, CTAs and HUD. ≤ 1.4 s.
      const split = new SplitText('.hero-name', { type: 'words', aria: 'auto' })
      gsap.timeline()
        .from(split.words, { autoAlpha: 0, y: distance.nameRise, stagger: time.nameStagger, duration: time.nameRise, ease: gsapEase.out })
        .fromTo('.name-bar', { scaleX: 0 }, { scaleX: 1, duration: time.underline, ease: gsapEase.underline }, '>-0.05')
        .from('.hero-loc, .hero-tagline, .hero .cta-row', { autoAlpha: 0, y: distance.childRise, duration: 0.2, stagger: 0.04, ease: gsapEase.out }, '>-0.15')
        .call(() => setHudIn(true), [], '<')

      // One entrance per section: heading, then children 100 ms apart, then the section's signature beat.
      const beat = (sel: string, signature?: (tl: gsap.core.Timeline) => void) => {
        const sec = el.querySelector<HTMLElement>(sel)
        if (!sec) return
        const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: revealStart, once: true } })
        const head = sec.querySelector('[data-reveal-head]')
        if (head) tl.from(head, { autoAlpha: 0, y: distance.headingRise, duration: time.headingReveal, ease: gsapEase.out })
        const kids = sec.querySelectorAll('[data-reveal]')
        if (kids.length) tl.from(kids, { autoAlpha: 0, y: distance.childRise, duration: time.reveal, stagger: time.stagger, ease: gsapEase.out }, '-=0.2')
        signature?.(tl)
      }

      beat('#about', (tl) => tl.fromTo('.stat-fill', { scaleX: 0 }, {
        scaleX: (_i: number, t: HTMLElement) => Number(t.style.getPropertyValue('--v')) || 0,
        duration: time.barFill, stagger: time.barStagger, ease: gsapEase.out,
      }, '-=0.1'))

      beat('#experience', (tl) => tl
        .from('.timeline-line', { scaleY: 0, duration: time.timelineGrow, ease: gsapEase.inOut }, 0.2)
        .from('.tl-entry', {
          autoAlpha: 0, duration: time.reveal * 1.4, stagger: time.stagger * 1.5, ease: gsapEase.out,
          x: (i: number) => (wide ? (i % 2 === 0 ? -distance.timelineSlide : distance.timelineSlide) : distance.timelineSlide),
        }, 0.35))

      beat('#skills') // the orbit runs its own pop-in (SkillsOrbit), so it never fights the spin

      beat('#contact', (tl) => tl.from('.contact-phone', {
        autoAlpha: 0, y: distance.phoneRise, x: wide ? 40 : 0, duration: time.phoneSlide, ease: gsapEase.out,
      }, '-=0.2'))

      // Projects: the pinned horizontal run on wide screens; a simple reveal elsewhere.
      const track = el.querySelector<HTMLElement>('.missions-track')!
      if (wide) {
        beat('#projects')
        const dist = () => Math.max(0, track.scrollWidth - innerWidth + 32)
        const run = gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: '#projects', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
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
        trackSections()
        return () => track.removeEventListener('focusin', onFocus)
      }
      beat('#projects', (tl) => tl.from('.mission-slot', { autoAlpha: 0, y: distance.childRise, duration: time.reveal, stagger: time.stagger, ease: gsapEase.out }, '-=0.2'))
      trackSections()
    }, el)
    requestAnimationFrame(() => ScrollTrigger.refresh())
    })
    return () => { cancelled = true; clearTimeout(hudFallback); ctx?.revert(); document.documentElement.classList.remove('js-motion') }
  }, [introDone])

  return (
    <main id="main" ref={root} tabIndex={-1}>
      <section id="hero" className="hero wrap" aria-labelledby="hero-title">
        <div className="hero-inner">
          <p className="label hero-loc"><Pin /> {person.base} · <span className="tnum">{person.coords}</span></p>
          <h1 id="hero-title" className="display hero-name">
            <span className="name-text">{person.first} {person.last}</span>
            <span className="name-bar" aria-hidden="true" />
          </h1>
          <p className="lead hero-tagline">{person.roles[0]}. {person.tagline}</p>
          <div className="cta-row">
            <m.a className="btn primary" href="#projects" {...press} onClick={(e) => { e.preventDefault(); scrollToEl('#projects') }}>Start main mission <Arrow /></m.a>
            <m.a className="btn" href="#about" {...press} onClick={(e) => { e.preventDefault(); go('about') }}>View profile</m.a>
          </div>
        </div>
        <HeroCar ready={introDone} />
        <HudStats entered={hudIn} />
      </section>

      <section id="about" className="section wrap" aria-labelledby="about-title">
        <SecHead id="about-title" eyebrow="01 · Player stats" title="About" />
        <div className="about-grid">
          <div className="about-copy">
            <p className="lead" data-reveal>{person.tagline}</p>
            {person.about.map((p) => <p key={p} data-reveal>{p}</p>)}
            <m.a className="btn" href="#about" data-reveal {...press} onClick={(e) => { e.preventDefault(); go('about') }}>Full profile <Arrow /></m.a>
          </div>
          <ul className="stats" aria-label="Skill areas">
            {aboutStats.map((s) => (
              <li key={s.label} className="stat" data-reveal>
                <span className="stat-label">{s.label}</span>
                <span className="stat-bar" aria-hidden="true">
                  <span className="stat-fill" style={{ '--v': String((s.value ?? 0) / 10) } as CSSProperties} />
                </span>
                <span className="stat-val tnum">{s.value == null ? <span className="chip todo">TODO</span> : `${s.value}/10`}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="projects" className="section" aria-labelledby="projects-title">
        <div className="wrap missions-pin">
          <SecHead id="projects-title" eyebrow={`02 · Missions · ${missions.length} available`} title="Projects" />
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

      <section id="experience" className="section wrap" aria-labelledby="experience-title">
        <SecHead id="experience-title" eyebrow="03 · Story so far" title="Experience" />
        <div className="timeline">
          <span className="timeline-line" aria-hidden="true" />
          <ol>
            {story.map((s, i) => (
              <li key={i} className={`tl-entry ${i % 2 ? 'right' : 'left'}`}>
                <span className="tl-dot" aria-hidden="true" />
                <div className="tl-card">
                  <span className="label when">{s.when ?? 'TODO · dates'}{s.now ? ' – Now' : ''}</span>
                  <h3>{s.title ?? <Todo>job title</Todo>}</h3>
                  <span className="where">{s.where}</span>
                  {s.body ? <p>{s.body}</p> : <Todo>what you built here</Todo>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="skills" className="section wrap" aria-labelledby="skills-title">
        <SecHead id="skills-title" eyebrow="04 · Loadout" title="Skills" />
        <SkillsOrbit />
      </section>

      <section id="contact" className="section wrap contact-sec" aria-labelledby="contact-title">
        <div className="contact-copy">
          <SecHead id="contact-title" eyebrow="05 · New mission available" title="Hire vd" />
          <p className="lead" data-reveal>Forward Deployed and Solutions Engineering roles, and full-stack AI work. The fastest way to reach me is LinkedIn or email.</p>
          <div className="cta-row" data-reveal>
            <m.a className="btn primary" href={person.linkedin} target="_blank" rel="noreferrer" {...press}>Message on LinkedIn <Arrow /></m.a>
            <m.a className="btn" href={person.github} target="_blank" rel="noreferrer" {...press}>GitHub</m.a>
          </div>
        </div>
        <ContactPhone className="contact-phone" />
      </section>

      <Minimap active={active} onGo={(id) => scrollToEl(`#${id}`)} />
      <AnimatePresence>{open && <Briefing key={open.id} mission={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </main>
  )
}
