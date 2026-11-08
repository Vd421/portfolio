/* eslint-disable @typescript-eslint/no-explicit-any */
// Two hand-written Lottie animations (shape layers only, so the light player can draw them),
// and a loader that pulls lottie_light from jsDelivr only when it is needed.

import { colors } from './motion-config'

// Lottie wants colors as 0–1 RGBA arrays; derive them from the config.
const rgba = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1)
const SODIUM = rgba(colors.dusk)
const EMBER = rgba(colors.pink)
const PAPER = rgba(colors.hud)

// Lottie keyframe helper: eased value change between two frames
const kf = (t0: number, v0: number[], t1: number, v1: number[]): { a: number; k: any[] } => ({
  a: 1,
  k: [
    { t: t0, s: v0, o: { x: [0.2], y: [0] }, i: { x: [0], y: [1] } },
    { t: t1, s: v1 },
  ],
})
const still = (v: unknown) => ({ a: 0, k: v })
const tr = { ty: 'tr', p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100) }

/** Badge: a sodium slab wipes in, a light slash sweeps across it. 64×40, 1.5 s. */
export const badgeAnim = {
  v: '5.7.4', fr: 30, ip: 0, op: 45, w: 64, h: 40, nm: 'vd badge', ddd: 0, assets: [],
  layers: [
    {
      ty: 4, ind: 1, nm: 'slash', ip: 12, op: 45, st: 0, sr: 1, ao: 0, bm: 0,
      ks: { o: kf(12, [90], 34, [0]), r: still(0), p: kf(12, [-10, 20, 0], 34, [74, 20, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]) },
      shapes: [{ ty: 'gr', it: [
        { ty: 'sh', ks: still({ i: [[0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0]], v: [[-3, 22], [3, 22], [9, -22], [3, -22]], c: true }) },
        { ty: 'fl', c: still(PAPER), o: still(100), r: 1 }, tr,
      ] }],
    },
    {
      ty: 4, ind: 2, nm: 'slab', ip: 0, op: 45, st: 0, sr: 1, ao: 0, bm: 0,
      ks: { o: still(100), r: still(0), p: still([4, 20, 0]), a: still([0, 0, 0]), s: kf(0, [0, 100, 100], 14, [100, 100, 100]) },
      shapes: [{ ty: 'gr', it: [
        { ty: 'sh', ks: still({ i: [[0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0]], v: [[4, -18], [58, -18], [52, 18], [-2, 18]], c: true }) },
        { ty: 'fl', c: still(SODIUM), o: still(100), r: 1 }, tr,
      ] }],
    },
  ],
}

const ring = (ind: number, delay: number) => ({
  ty: 4, ind, nm: `ring ${ind}`, ip: 0, op: 60, st: 0, sr: 1, ao: 0, bm: 0,
  ks: { o: kf(delay, [90], delay + 40, [0]), r: still(0), p: still([24, 24, 0]), a: still([0, 0, 0]), s: kf(delay, [20, 20, 100], delay + 40, [100, 100, 100]) },
  shapes: [{ ty: 'gr', it: [
    { ty: 'el', p: still([0, 0]), s: still([44, 44]), d: 1 },
    { ty: 'st', c: still(EMBER), o: still(100), w: still(2), lc: 1, lj: 1 },
    tr,
  ] }],
})

/** Mission marker: a diamond with two rings pinging outward. 48×48, 2 s loop. */
export const pingAnim = {
  v: '5.7.4', fr: 30, ip: 0, op: 60, w: 48, h: 48, nm: 'mission ping', ddd: 0, assets: [],
  layers: [
    {
      ty: 4, ind: 1, nm: 'diamond', ip: 0, op: 60, st: 0, sr: 1, ao: 0, bm: 0,
      ks: { o: still(100), r: still(45), p: still([24, 24, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]) },
      shapes: [{ ty: 'gr', it: [
        { ty: 'rc', p: still([0, 0]), s: still([12, 12]), r: still(1), d: 1 },
        { ty: 'fl', c: still(SODIUM), o: still(100), r: 1 }, tr,
      ] }],
    },
    ring(2, 0),
    ring(3, 18),
  ],
}

let loading: Promise<any> | null = null
export function loadLottie(): Promise<any> {
  const w = window as any
  if (w.lottie) return Promise.resolve(w.lottie)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/lottie-web@5.13.0/build/player/lottie_light.min.js'
    s.async = true
    s.onload = () => (w.lottie ? resolve(w.lottie) : reject(new Error('lottie missing')))
    s.onerror = () => reject(new Error('lottie failed'))
    document.head.appendChild(s)
  })
  return loading
}
