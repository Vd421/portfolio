/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react'
import { ambient, prefersReduced } from '../world'
import { loadLottie } from '../lottie'

/**
 * Plays a Lottie animation once the page is idle. Decorative (aria-hidden).
 * Under reduced motion, or with motion paused, it shows the finished last frame and never loops.
 * Until the player loads, `fallback` (a static CSS shape) shows in its place.
 */
export function LottieIcon({ data, loop = false, className, fallback, replayOnHover = false }: {
  data: any; loop?: boolean; className?: string; fallback?: React.ReactNode; replayOnHover?: boolean
}) {
  const box = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let anim: any = null
    let cancelled = false
    const start = () => loadLottie().then((lottie) => {
      if (cancelled || !box.current) return
      const still = prefersReduced() || ambient.paused
      anim = lottie.loadAnimation({ container: box.current, renderer: 'svg', loop: loop && !still, autoplay: !still, animationData: data })
      if (still) anim.goToAndStop(data.op - 1, true)
      box.current.dataset.ready = ''
    }).catch(() => { /* keep the static fallback */ })
    const ric = (window as any).requestIdleCallback as ((cb: () => void, o?: object) => number) | undefined
    const id = ric ? ric(start, { timeout: 2500 }) : window.setTimeout(start, 600)
    const host = box.current?.parentElement
    const replay = () => { if (anim && !prefersReduced() && !ambient.paused) anim.goToAndPlay(0, true) }
    if (replayOnHover) host?.addEventListener('pointerenter', replay)
    return () => {
      cancelled = true
      if (ric) (window as any).cancelIdleCallback?.(id); else clearTimeout(id)
      host?.removeEventListener('pointerenter', replay)
      anim?.destroy()
    }
  }, [data, loop, replayOnHover])
  return (
    <span className={`lottie ${className ?? ''}`} aria-hidden="true">
      <span className="lottie-fallback">{fallback}</span>
      <span ref={box} className="lottie-box" />
    </span>
  )
}
