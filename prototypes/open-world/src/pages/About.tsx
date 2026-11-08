import { useEffect, useRef } from 'react'
import type { Variants } from 'motion/react'
import * as m from 'motion/react-m'
import { loadFx, prefersReduced, world, focusHeadingIfNavigated } from '../world'
import { abilities, person, story } from '../data'
import { ContactPhone } from '../components/ContactPhone'

const Todo = ({ children }: { children: string }) => <span className="chip todo">TODO · {children}</span>

// Staggered reveal: chunks enter 100 ms apart with opacity and a 12 px rise (transform only).
const group: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const item: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.2, 0, 0, 1] } } }
const reveal = { variants: group, initial: 'hidden', whileInView: 'show', viewport: { once: true, amount: 0.25 } } as const

/** Stylised character art: an original silhouette against the dusk, drawn in SVG. */
function Portrait() {
  return (
    <div className="portrait" data-portrait>
      <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="rim" x1="0" x2="1"><stop offset="0" stopColor="#ffb547" stopOpacity="0" /><stop offset="1" stopColor="#ffb547" stopOpacity="0.9" /></linearGradient>
        </defs>
        <g data-depth="0.2" opacity="0.55" fill="#2b1f2a">
          <rect x="0" y="300" width="60" height="200" /><rect x="70" y="250" width="45" height="250" /><rect x="300" y="270" width="55" height="230" /><rect x="360" y="230" width="40" height="270" />
          <rect x="120" y="320" width="30" height="180" /><rect x="250" y="310" width="40" height="190" />
        </g>
        <circle data-depth="0.1" cx="300" cy="190" r="70" fill="#ffd27a" opacity="0.75" />
        <g data-depth="0.45" fill="#0d0a10">
          {/* Shoulders, jacket collar, head: built from simple shapes, not traced from anyone */}
          <path d="M60 500 C70 400 120 360 200 350 C280 360 330 400 340 500 Z" />
          <path d="M150 360 L200 430 L250 360 L232 352 L200 395 L168 352 Z" fill="#1b141c" />
          <rect x="178" y="300" width="44" height="60" rx="10" />
          <ellipse cx="200" cy="250" rx="62" ry="74" />
          <path d="M138 236 C140 180 180 160 214 166 C246 170 266 196 264 236 C252 214 230 204 200 206 C172 206 150 216 138 236 Z" fill="#050407" />
          <path d="M262 230 C268 260 262 300 240 318" stroke="url(#rim)" strokeWidth="4" fill="none" />
          <path d="M336 500 C332 430 300 380 252 362" stroke="url(#rim)" strokeWidth="3" fill="none" />
        </g>
      </svg>
      <div className="todo-photo"><Todo>swap in your own photo or illustrated portrait</Todo></div>
    </div>
  )
}

export function About() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => { focusHeadingIfNavigated(root.current) }, [])

  useEffect(() => {
    const el = root.current!
    world.target.night = 0.7
    if (prefersReduced()) return
    let ctx: { revert: () => void } | null = null
    let cancelled = false
    loadFx().then(({ gsap, ScrollTrigger, SplitText }) => {
    if (cancelled) return
    ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el, start: 'top top', end: 'bottom bottom',
        onUpdate: (st) => { world.progress = st.progress; world.target.night = 0.7 + st.progress * 0.3; world.target.pan = 0.35 + st.progress * 0.5 },
      })
      const name = new SplitText('.charname', { type: 'chars', aria: 'auto' })
      gsap.timeline({ delay: 0.15 })
        .from('.portrait', { yPercent: 8, scale: 0.94, autoAlpha: 0, duration: 0.9, ease: 'expo.out' })
        .from(name.chars, { yPercent: 100, autoAlpha: 0, stagger: 0.03, duration: 0.6, ease: 'expo.out' }, '-=0.6')
        .from('.attrs > *', { autoAlpha: 0, x: -12, stagger: 0.04, duration: 0.3, ease: 'power2.out' }, '-=0.3')

      // Depth layers inside the portrait drift at different speeds as you scroll.
      gsap.utils.toArray<SVGGElement>('[data-depth]').forEach((g) => {
        const d = Number(g.dataset.depth)
        gsap.to(g, { y: -120 * d, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: true } })
      })
      gsap.utils.toArray<HTMLElement>('.about-sec h2').forEach((h) =>
        gsap.from(h, { xPercent: -6, skewX: -10, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: h, start: 'top 92%', end: 'top 60%', scrub: true } }))
      gsap.from('.phone', { y: 120, rotate: -8, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.phone', start: 'top 100%', end: 'top 55%', scrub: true } })
    }, el)
    requestAnimationFrame(() => ScrollTrigger.refresh())
    })
    return () => { cancelled = true; ctx?.revert() }
  }, [])

  const jobs = [...story].reverse().filter((s) => s.where !== 'VIT Chennai')

  return (
    <main id="main" ref={root} tabIndex={-1} className="about wrap">
      <div className="profile">
        <div className="portrait-col">
          <Portrait />
          <h1 className="display charname">{person.first} <span className="last">{person.last}</span></h1>
          <dl className="attrs">
            <dt className="label">Class</dt><dd>{person.roles[0]}</dd>
            <dt className="label">Also plays</dt><dd>{person.roles.slice(1).join(', ')}</dd>
            <dt className="label">Origin</dt><dd>{person.education} · {person.gradYear}</dd>
            <dt className="label">Base</dt><dd>{person.base}</dd>
            <dt className="label">Current</dt><dd>{person.now}</dd>
          </dl>
        </div>

        <div>
          <m.section className="about-sec bio" aria-labelledby="bg-title" {...reveal}>
            <h2 id="bg-title"><span className="label eyebrow">01 · Background</span>Who is vd</h2>
            <m.p variants={item}>{person.tagline}</m.p>
            {person.about.map((p) => <m.p key={p} variants={item}>{p}</m.p>)}
            <m.p variants={item} style={{ marginTop: 14 }}><Todo>a few sentences in your own voice about how you work with customers</Todo></m.p>
          </m.section>

          <section className="about-sec" aria-labelledby="ab-title">
            <h2 id="ab-title"><span className="label eyebrow">02 · Abilities</span>Unlocked</h2>
            <m.div className="abilities" {...reveal}>
              {abilities.map((a) => (
                <m.div key={a.name} className="ability" variants={item} whileHover={{ y: -4 }}>
                  <h3>{a.name}</h3>
                  <ul>{a.items.map((i) => <li key={i} className="chip">{i}</li>)}</ul>
                </m.div>
              ))}
            </m.div>
          </section>

          <section className="about-sec" aria-labelledby="car-title">
            <h2 id="car-title"><span className="label eyebrow">03 · Career</span>Jobs done</h2>
            <m.div className="career" {...reveal}>
              {jobs.map((j) => (
                <m.article key={j.where} className="job" variants={item}>
                  <h3>{j.title ?? 'Role'}</h3>
                  <span className="dates">{j.when ?? 'TODO · dates'}{j.now ? ' · Now' : ''}</span>
                  <span className="co">{j.where}</span>
                  {!j.title && <Todo>job title</Todo>}
                  {j.body ? <p style={{ gridColumn: '1 / -1', color: 'var(--paper-2)' }}>{j.body}</p> : <span style={{ gridColumn: '1 / -1' }}><Todo>what you built here</Todo></span>}
                </m.article>
              ))}
            </m.div>
          </section>

          <section className="about-sec" aria-labelledby="ct-title">
            <h2 id="ct-title"><span className="label eyebrow">04 · Contacts</span>Call vd</h2>
            <ContactPhone />
          </section>
        </div>
      </div>
    </main>
  )
}
