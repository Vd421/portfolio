import { useEffect, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import { lenisStop } from '../world'
import { person } from '../data'

export const INTRO_VIDEO = 'intro.mp4'
export const INTRO_POSTER = 'intro-poster.jpg'

/** Autoplay the 2.5 MB reel only where it is cheap: wide screens on a decent connection. */
function shouldAutoplay() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (c?.saveData || /(^|-)2g|3g/.test(c?.effectiveType ?? '')) return false
  return matchMedia('(min-width: 48rem)').matches
}

/**
 * Opening sequence: the Remotion-rendered reel (8 s). Skippable at any moment with the
 * button, Enter, Space or Escape. On phones and data saver it waits behind a title card.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const skip = useRef<HTMLButtonElement>(null)
  const [playing, setPlaying] = useState(shouldAutoplay)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    lenisStop(true)
    document.documentElement.style.overflow = 'hidden'
    skip.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'Escape'].includes(e.key) && !(e.target as HTMLElement).closest('button')) { e.preventDefault(); onDone() }
      else if (e.key === 'Escape') onDone()
    }
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = ''
      lenisStop(false)
    }
  }, [onDone])

  useEffect(() => {
    if (!playing || !video.current) return
    video.current.play().catch(() => setPlaying(false)) // autoplay refused: show the title card
  }, [playing])

  useEffect(() => {
    if (!ended) return
    const t = window.setTimeout(onDone, 1400) // hold the last frame briefly, then into the city
    return () => clearTimeout(t)
  }, [ended, onDone])

  return (
    <m.div
      className="intro"
      role="dialog"
      aria-label="Opening sequence"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.45, ease: [0.2, 0, 0, 1] } }}
    >
      <p className="sr-only">{person.first} {person.last}. {person.roles.join(', ')}. Based in {person.base}.</p>
      {playing ? (
        <video
          ref={video}
          className="intro-video"
          src={INTRO_VIDEO}
          poster={INTRO_POSTER}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onEnded={() => setEnded(true)}
          onError={onDone}
        />
      ) : (
        <img className="intro-video" src={INTRO_POSTER} alt="" width={1280} height={720} decoding="async" />
      )}
      <div className="intro-actions">
        {!playing && (
          <button type="button" className="hud-btn" onClick={() => setPlaying(true)}>Play intro · 8 s</button>
        )}
        <button type="button" ref={skip} className="btn primary" onClick={onDone}>
          {playing && !ended ? 'Skip intro' : 'Start'}
        </button>
      </div>
    </m.div>
  )
}
