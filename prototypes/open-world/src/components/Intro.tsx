import { useEffect, useRef, useState } from 'react'
import { gsap, SplitText, world, lenisStop } from '../world'
import { person, tips } from '../data'

/**
 * Opening cinematic, played over the live city canvas. About 7 seconds, skippable at any
 * moment (button, Enter, Space, Escape or a click), shown once per session.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState(0)
  const [ready, setReady] = useState(false)
  const done = useRef(false)

  useEffect(() => {
    const el = root.current!
    lenisStop(true)
    document.documentElement.style.overflow = 'hidden'

    const finish = () => {
      if (done.current) return
      done.current = true
      tl.kill()
      gsap.timeline({ onComplete: () => { document.documentElement.style.overflow = ''; lenisStop(false); onDone() } })
        .to(el.querySelectorAll('.intro-card, .intro-foot, .skip'), { autoAlpha: 0, y: -12, filter: 'blur(4px)', duration: 0.25, ease: 'power2.in' })
        .to(el.querySelector('.bar.top'), { yPercent: -100, duration: 0.6, ease: 'expo.inOut' }, '<0.1')
        .to(el.querySelector('.bar.bottom'), { yPercent: 100, duration: 0.6, ease: 'expo.inOut' }, '<')
        .to(el, { autoAlpha: 0, duration: 0.3 }, '-=0.2')
    }

    const name = new SplitText(el.querySelector('.name'), { type: 'chars', aria: 'auto' })
    const coords = el.querySelector('.coords') as HTMLElement
    const coordText = coords.textContent || ''

    // The camera drifts along the skyline while the sun dips.
    world.target.pan = 0
    world.pan = 0
    world.night = world.target.night = 0.02

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
    tl.set(el.querySelectorAll('.intro-card, .press'), { autoAlpha: 0 })
      .fromTo('.intro-blackout', { autoAlpha: 1 }, { autoAlpha: 0, duration: 1.4, ease: 'power2.out' }, 0)
      .fromTo(world.target, { pan: 0 }, { pan: 0.16, night: 0.1, duration: 7.5, ease: 'none' }, 0)
      .fromTo('.bar.top', { yPercent: -100 }, { yPercent: 0, duration: 1, ease: 'expo.inOut' }, 0.2)
      .fromTo('.bar.bottom', { yPercent: 100 }, { yPercent: 0, duration: 1, ease: 'expo.inOut' }, 0.2)
      .to('.intro-loc', { autoAlpha: 1, duration: 0.01 }, 1.0)
      .from('.intro-loc .place', { x: -40, autoAlpha: 0, filter: 'blur(6px)', duration: 0.9 }, 1.0)
      .to({ p: 0 }, {
        p: 1, duration: 1.1, ease: 'none',
        onUpdate() {
          // Coordinates decode from noise into the real value
          const p = this.targets()[0].p as number
          const keep = Math.floor(coordText.length * p)
          coords.textContent = coordText.slice(0, keep) + coordText.slice(keep).replace(/[0-9]/g, () => String(Math.floor(Math.random() * 10)))
        },
      }, 1.25)
      .to('.intro-loc', { autoAlpha: 0, y: -10, filter: 'blur(4px)', duration: 0.35, ease: 'power2.in' }, 3.2)
      .to('.intro-title', { autoAlpha: 1, duration: 0.01 }, 3.5)
      .from(name.chars, { yPercent: 120, autoAlpha: 0, rotate: 8, filter: 'blur(8px)', stagger: 0.035, duration: 0.7 }, 3.5)
      .fromTo(el, { x: 0 }, { keyframes: { x: [0, -6, 5, -3, 2, 0] }, duration: 0.35, ease: 'none' }, 3.9)
      .from('.intro-title .role', { autoAlpha: 0, y: 10, duration: 0.5, ease: 'power2.out' }, 4.4)
      .fromTo('.loading .fill', { scaleX: 0 }, { scaleX: 1, duration: 6.2, ease: 'power1.inOut' }, 0.3)
      .call(() => setReady(true), [], 6.5)
      .to('.press', { autoAlpha: 1, duration: 0.3 }, 6.5)
      .call(finish, [], 9.5) // nobody is left waiting on the title card

    const tipTimer = window.setInterval(() => setTip((i) => (i + 1) % tips.length), 2300)
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); finish() }
    }
    addEventListener('keydown', onKey)
    ;(el.querySelector('.skip') as HTMLElement | null)?.focus({ preventScroll: true })

    return () => {
      window.clearInterval(tipTimer)
      removeEventListener('keydown', onKey)
      tl.kill(); name.revert()
      document.documentElement.style.overflow = ''
      lenisStop(false)
    }
  }, [onDone])

  return (
    <div className="intro" ref={root} role="dialog" aria-label="Opening sequence" onClick={(e) => {
      if ((e.target as HTMLElement).closest('button')) return
      ;(root.current?.querySelector('.skip') as HTMLButtonElement | null)?.click()
    }}>
      <div className="intro-blackout" style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 2 }} />
      <div className="bar top" />
      <div className="bar bottom" />
      <button type="button" className="hud-btn skip" onClick={() => {
        // Synthesize the same path the keyboard uses
        dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      }}>Skip intro</button>

      <div className="intro-card intro-loc">
        <span className="label">Location</span>
        <span className="place">{person.base}</span>
        <span className="coords">{person.coords}</span>
      </div>

      <div className="intro-card intro-title">
        <span className="display name">{person.first} <span className="last">{person.last}</span></span>
        <div className="role">{person.roles.join('  /  ')}</div>
      </div>

      <div className="intro-foot">
        <p className="tip" aria-live="off"><b>TIP</b>&nbsp;&nbsp;{tips[tip]}</p>
        <div className="loading">
          {!ready && <span className="label">Loading</span>}
          <div className="track" aria-hidden="true"><div className="fill" /></div>
          <button type="button" className={`press${ready ? ' ready' : ''}`} onClick={() => dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))}>
            <kbd>Enter</kbd>Start
          </button>
        </div>
      </div>
    </div>
  )
}
