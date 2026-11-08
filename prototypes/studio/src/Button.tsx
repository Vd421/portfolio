import { useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react'
import { finePointer, prefersReduced } from './motion'

const MAGNET = 0.22 // fraction of the pointer offset the button follows
const MAX = 6 // px

type Common = { variant?: 'primary' | 'glass'; size?: 'md' | 'sm'; arrow?: boolean; children: ReactNode }
type AsLink = Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }

/**
 * Pill button with Apple-like feedback: press to 0.96 (150 ms ease-out), a soft sheen that follows
 * the pointer, and a small magnetic pull toward the pointer on fine-pointer devices. Transform and
 * opacity only; magnet and sheen are off under reduced motion and on touch.
 */
export function Button(props: AsLink | AsButton) {
  const { variant = 'primary', size = 'md', arrow, children, className, ...rest } = props
  const ref = useRef<HTMLElement | null>(null)
  const cls = `btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''}${className ? ` ${className}` : ''}`

  const move = (e: PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    el.style.setProperty('--mx', `${x}px`)
    el.style.setProperty('--my', `${y}px`)
    if (prefersReduced() || !finePointer()) return
    const clampPx = (v: number) => Math.max(-MAX, Math.min(MAX, v))
    el.classList.add('is-magnet')
    el.style.setProperty('--tx', `${clampPx((x - r.width / 2) * MAGNET)}px`)
    el.style.setProperty('--ty', `${clampPx((y - r.height / 2) * MAGNET)}px`)
  }
  const leave = () => {
    const el = ref.current
    if (!el) return
    el.classList.remove('is-magnet') // settle back with the spring ease
    el.style.setProperty('--tx', '0px')
    el.style.setProperty('--ty', '0px')
  }

  const inner = (
    <>
      <span>{children}</span>
      {arrow && (
        <svg className="arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h9.5M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  )

  if ('href' in rest && rest.href !== undefined) {
    const a = rest as AnchorHTMLAttributes<HTMLAnchorElement>
    return <a {...a} ref={(el) => { ref.current = el }} className={cls} onPointerMove={move} onPointerLeave={leave}>{inner}</a>
  }
  const b = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return <button type="button" {...b} ref={(el) => { ref.current = el }} className={cls} onPointerMove={move} onPointerLeave={leave}>{inner}</button>
}
