import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { tips as allTips } from '../data'
import { distance, ease, time } from '../motion-config'
import { BackdropArt } from './Backdrop'

// Intro reel (Remotion, reel/): a wide cut and a phone cut, ~200 KB each, chosen by aspect ratio.
const REEL = {
  wide: { src: new URL('../assets/intro.mp4', import.meta.url).href, poster: new URL('../assets/intro-poster.jpg', import.meta.url).href },
  tall: { src: new URL('../assets/intro-tall.mp4', import.meta.url).href, poster: new URL('../assets/intro-tall-poster.jpg', import.meta.url).href },
}
const REEL_CAP = 7 // seconds: the reel is 6 s; never hold the page longer than this
/** Play the reel unless the visitor asked to save data. */
const wantsReel = () => !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData

/**
 * First-visit loading screen: poster art with a slow Ken Burns move, rotating real-fact tips,
 * a spinner and a LOADING label. Shows for at least `time.loadingMin`, or until fonts are ready,
 * never longer than `time.loadingCap`, then fades out. Skippable by click, tap, Enter, Space, Esc
 * or the Skip button. It is an overlay only: the page underneath is already rendered.
 */
export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const tips = useMemo(() => allTips.filter((t) => !t.trim().toUpperCase().startsWith('TODO')), [])
  const [tip, setTip] = useState(0)
  const done = useRef(false)
  const finish = useRef(() => {})
  finish.current = () => { if (!done.current) { done.current = true; onDone() } }

  const [reel] = useState(() => (wantsReel() ? (innerHeight > innerWidth ? REEL.tall : REEL.wide) : null))
  const [reelOn, setReelOn] = useState(!!reel) // false if the video fails: fall back to the poster timing

  useEffect(() => {
    const start = performance.now()
    let cancelled = false
    const cap = window.setTimeout(() => finish.current(), (reelOn ? REEL_CAP : time.loadingCap) * 1000)
    // Poster mode: leave once fonts are ready and the minimum has passed. Reel mode: when it ends.
    document.fonts.ready.then(() => {
      if (cancelled || reelOn) return
      const wait = Math.max(0, time.loadingMin * 1000 - (performance.now() - start))
      window.setTimeout(() => finish.current(), wait)
    })
    const rotate = window.setInterval(() => setTip((i) => (i + 1) % Math.max(1, tips.length)), time.tip * 1000)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish.current() }
    }
    addEventListener('keydown', onKey)
    return () => { cancelled = true; clearTimeout(cap); clearInterval(rotate); removeEventListener('keydown', onKey) }
  }, [tips.length, reelOn])

  return (
    <m.div
      className="loading-screen"
      onClick={() => finish.current()}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: time.loadingFade, ease: ease.out } }}
    >
      <div className="loading-art" aria-hidden="true"
        style={{ animationDuration: `${time.loadingCap}s`, ['--kb-scale' as string]: String(distance.kenBurnsScale) }}>
        <BackdropArt />
      </div>
      {reel && reelOn && (
        <video className="loading-reel" src={reel.src} poster={reel.poster} autoPlay muted playsInline preload="auto"
          aria-hidden="true" onEnded={() => finish.current()} onError={() => setReelOn(false)} />
      )}
      {!reelOn && <div className="loading-shade" aria-hidden="true" />}

      <button type="button" className="hud-btn loading-skip" onClick={(e) => { e.stopPropagation(); finish.current() }}>
        Skip
      </button>

      <div className="loading-foot">
        <div className="loading-tip" aria-hidden="true">
          <span className="label">Tip</span>
          <AnimatePresence mode="wait" initial={false}>
            <m.p key={tip}
              initial={{ opacity: 0, y: distance.tipRise }}
              animate={{ opacity: 1, y: 0, transition: { duration: time.reveal, ease: ease.out } }}
              exit={{ opacity: 0, y: -distance.tipRise, transition: { duration: time.fast, ease: ease.out } }}>
              {tips[tip]}
            </m.p>
          </AnimatePresence>
        </div>
        <div className="loading-status" role="status">
          <span className="spinner" aria-hidden="true" />
          <span className="label">Loading</span>
        </div>
      </div>
    </m.div>
  )
}
