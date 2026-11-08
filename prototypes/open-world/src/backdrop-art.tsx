import { useId } from 'react'
import { colors, sky } from './motion-config'

// The poster backdrop, shared by the site (Backdrop, LoadingScreen) and the Remotion intro reel.
// No app imports: only React and the tokens.

// Deterministic skyline: flat rectangles, a few stepped tops. Poster, not simulation.
function rng(seed: number) {
  let a = seed
  return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646 }
}
function skyline(seed: number, count: number, x0: number, x1: number, minH: number, maxH: number) {
  const r = rng(seed)
  const out: { x: number; w: number; h: number; step: number }[] = []
  let x = x0
  for (let i = 0; i < count && x < x1; i++) {
    const w = 28 + r() * 60
    const tall = r() < 0.18
    out.push({ x, w, h: tall ? maxH * (0.75 + r() * 0.25) : minH + r() * (maxH - minH) * 0.55, step: r() })
    x += w + 4 + r() * 18
  }
  return out
}
export const FAR = skyline(7, 60, -40, 1640, 40, 150)
export const NEAR = skyline(42, 46, -40, 1640, 30, 110)
export const HORIZON = 640
const NEAR_BASE = HORIZON + 30

/** Window grid for one near building: deterministic, about half the cells. */
function windows(i: number, b: (typeof NEAR)[number]) {
  const r = rng(1000 + i)
  const cols = Math.max(1, Math.floor((b.w - 10) / 12))
  const rows = Math.max(1, Math.floor((b.h - 14) / 16))
  const out: [number, number][] = []
  for (let c = 0; c < cols; c++) for (let row = 0; row < rows; row++) if (r() < 0.5) out.push([b.x + 7 + c * 12, NEAR_BASE - b.h + 8 + row * 16])
  return out
}

export type BackdropArtProps = {
  className?: string
  /** Wrap layers for scroll drift (data-bd-layer) and pointer parallax (data-bd-tilt). */
  layers?: boolean
  /** Render the window grids that light up near the pointer. */
  windowsOn?: boolean
  /** Remotion: explicit transforms per layer and lit windows, driven by the frame. */
  frame?: { sunY?: number; tilt?: number; lit?: (i: number) => number }
}

/** The poster art itself: sky, striped sun, hills, two flat skyline layers, ground. */
export function BackdropArt({ className, layers, windowsOn, frame }: BackdropArtProps) {
  const uid = useId().replace(/:/g, '')
  const id = (n: string) => `${n}-${uid}`
  const tilt = (k: number) => (frame?.tilt ? `translate(${(frame.tilt * k).toFixed(2)} 0)` : undefined)
  return (
    <svg className={className} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={id('bd-sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.dusk[0]} />
          <stop offset="0.38" stopColor={sky.dusk[1]} />
          <stop offset="0.6" stopColor={sky.dusk[2]} />
          <stop offset="0.71" stopColor={sky.dusk[3]} />
        </linearGradient>
        <linearGradient id={id('bd-sun')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.sun[0]} />
          <stop offset="1" stopColor={sky.sun[1]} />
        </linearGradient>
        {/* Keeps the left (text) side darker than the right */}
        <linearGradient id={id('bd-side')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={colors.base} stopOpacity="0.72" />
          <stop offset="0.55" stopColor={colors.base} stopOpacity="0.3" />
          <stop offset="1" stopColor={colors.base} stopOpacity="0" />
        </linearGradient>
        <clipPath id={id('bd-above')}><rect width="1600" height={HORIZON + 4} /></clipPath>
      </defs>
      <rect width="1600" height={HORIZON + 4} fill={`url(#${id('bd-sky')})`} />
      <g clipPath={`url(#${id('bd-above')})`}>
        <g data-bd-layer={layers ? '0.06' : undefined}>
          <g data-bd-tilt={layers ? '8' : undefined} transform={frame?.sunY ? `translate(${frame?.tilt ? frame.tilt * 0.3 : 0} ${frame.sunY})` : tilt(0.3)}>
            <circle cx="1140" cy="560" r="170" fill={`url(#${id('bd-sun')})`} />
            {/* Poster stripes cut through the lower half of the sun */}
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x="960" y={575 + i * 18} width="360" height={4 + i * 2.2} fill={sky.dusk[3]} />
            ))}
          </g>
        </g>
      </g>
      <g data-bd-layer={layers ? '0.035' : undefined}>
        <g data-bd-tilt={layers ? '18' : undefined} transform={tilt(0.6)}>
          <path d="M-40 610 L150 560 L310 600 L470 540 L640 590 L820 548 L1000 596 L1180 552 L1360 600 L1640 560 L1640 650 L-40 650 Z" fill="#4a1f3d" fillOpacity="0.85" />
          {FAR.map((b, i) => (
            <g key={i} fill="#2a1430">
              <rect x={b.x} y={HORIZON - b.h} width={b.w} height={b.h + 10} />
              {b.step > 0.7 && <rect x={b.x + b.w * 0.25} y={HORIZON - b.h - 14} width={b.w * 0.5} height="14" />}
            </g>
          ))}
        </g>
      </g>
      <g data-bd-layer={layers ? '0.015' : undefined}>
        <g data-bd-tilt={layers ? '32' : undefined} transform={tilt(1)}>
          {NEAR.map((b, i) => (
            <g key={i} fill={colors.teal}>
              <rect x={b.x} y={NEAR_BASE - b.h} width={b.w} height={b.h + 20} />
              {b.step > 0.8 && <rect x={b.x + b.w / 2 - 1.5} y={NEAR_BASE - b.h - 30} width="3" height="30" />}
            </g>
          ))}
          {(windowsOn || frame?.lit) && NEAR.map((b, i) => (
            <g key={`w${i}`} className="bd-win" data-bx={(b.x + b.w / 2).toFixed(0)} fill={colors.star}
              opacity={frame?.lit ? frame.lit(i) : undefined}>
              {windows(i, b).map(([x, y], k) => <rect key={k} x={x} y={y} width="5" height="7" />)}
            </g>
          ))}
        </g>
      </g>
      <rect y={HORIZON + 40} width="1600" height={900 - HORIZON - 40} fill={colors.base} />
      <rect y={HORIZON + 40} width="1600" height="2" fill={colors.dusk} fillOpacity="0.35" />
      <rect width="1600" height="900" fill={`url(#${id('bd-side')})`} />
    </svg>
  )
}
