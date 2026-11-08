import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { tips as allTips } from '../data'
import { distance, ease, time } from '../motion-config'

const ART_WEBP = new URL('../assets/loading.webp', import.meta.url).toString()
const ART_JPG = new URL('../assets/loading.jpg', import.meta.url).toString()

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

  useEffect(() => {
    const start = performance.now()
    let cancelled = false
    const cap = window.setTimeout(() => finish.current(), time.loadingCap * 1000)
    // Leave once fonts are ready and the minimum has passed, whichever is later.
    document.fonts.ready.then(() => {
      if (cancelled) return
      const wait = Math.max(0, time.loadingMin * 1000 - (performance.now() - start))
      window.setTimeout(() => finish.current(), wait)
    })
    const rotate = window.setInterval(() => setTip((i) => (i + 1) % Math.max(1, tips.length)), time.tip * 1000)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish.current() }
    }
    addEventListener('keydown', onKey)
    return () => { cancelled = true; clearTimeout(cap); clearInterval(rotate); removeEventListener('keydown', onKey) }
  }, [tips.length])

  return (
    <m.div
      className="loading-screen"
      onClick={() => finish.current()}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: time.loadingFade, ease: ease.out } }}
    >
      <picture className="loading-art" aria-hidden="true">
        <source srcSet={ART_WEBP} type="image/webp" />
        <img src={ART_JPG} alt="" width={1600} height={900} decoding="async" fetchPriority="high"
          style={{ animationDuration: `${time.loadingCap}s`, ['--kb-scale' as string]: String(distance.kenBurnsScale) }} />
      </picture>
      <div className="loading-shade" aria-hidden="true" />

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
