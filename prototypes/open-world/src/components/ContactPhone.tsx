import { useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { person } from '../data'

const press = { whileHover: { y: -2 }, whileTap: { scale: 0.96 }, transition: { type: 'spring', duration: 0.3, bounce: 0 } } as const

/** Phone-style contact panel: email (copyable), LinkedIn, GitHub, resume placeholder. */
export function ContactPhone({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState(false)
  const email = useRef<HTMLSpanElement>(null)
  const copy = async () => {
    try { await navigator.clipboard.writeText(person.email); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch {
      // Clipboard refused: select the address so it can be copied by hand.
      if (!email.current) return
      const r = document.createRange(); r.selectNodeContents(email.current)
      const sel = getSelection(); sel?.removeAllRanges(); sel?.addRange(r)
    }
  }
  return (
    <div className={`phone ${className}`}>
      <div className="phone-screen">
        <div className="phone-status" aria-hidden="true"><span>vdOS</span><span className="tnum">{person.coords}</span></div>
        <div className="contact">
          <span className="av" aria-hidden="true">@</span>
          <div className="who"><strong>Email</strong><span ref={email}>{person.email}</span></div>
          <m.button type="button" onClick={copy} {...press} aria-live="polite">{copied ? 'Copied' : 'Copy'}</m.button>
        </div>
        <div className="contact">
          <span className="av" aria-hidden="true">in</span>
          <div className="who"><strong>LinkedIn</strong><span>linkedin.com/in/vaibhav-dhir</span></div>
          <a href={person.linkedin} target="_blank" rel="noreferrer">Open<span className="sr-only"> LinkedIn profile</span></a>
        </div>
        <div className="contact">
          <span className="av" aria-hidden="true">gh</span>
          <div className="who"><strong>GitHub</strong><span>github.com/Vd421</span></div>
          <a href={person.github} target="_blank" rel="noreferrer">Open<span className="sr-only"> GitHub profile</span></a>
        </div>
        <div className="contact">
          <span className="av" aria-hidden="true">cv</span>
          <div className="who"><strong>Resume</strong><span>Coming soon</span></div>
          <span className="chip todo">TODO · PDF</span>
        </div>
      </div>
    </div>
  )
}
