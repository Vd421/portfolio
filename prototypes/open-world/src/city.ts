// Procedural city at golden hour → night, drawn with Canvas 2D.
//   state.night: 0 = golden hour, 1 = deep night
//   state.pan:   0..1 camera position along the skyline
//   state.t:     seconds, for ambient motion (traffic, palms, helicopter)
//
// Performance: the three skyline layers (silhouettes plus lit windows: thousands of rects)
// are drawn once into off-screen canvases, cached per quantized night level, and re-cached
// at most one layer per frame. A frame is then a few gradients, three drawImage calls,
// and a handful of moving details.

export type CityState = { t: number; night: number; pan: number }

type Building = { x: number; w: number; h: number; top: 0 | 1 | 2 | 3; antenna: number }
type Win = { x: number; y: number; w: number; h: number; th: number; warm: boolean }
type Layer = { p: number; buildings: Building[]; windows: Win[]; span: number; cache: HTMLCanvasElement; level: number }
type Palm = { x: number; h: number; lean: number; phase: number }
type Star = { x: number; y: number; r: number; tw: number }

const LEVELS = 14
const PAD = 40 // buildings start at x = -PAD

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
type RGB = [number, number, number]
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a: RGB, b: RGB, k: number, alpha = 1) =>
  `rgba(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))},${alpha})`

const SKY = {
  dusk: [hex('#1a2440'), hex('#6e3550'), hex('#e0644a'), hex('#ffb35c')],
  night: [hex('#03050a'), hex('#0a1124'), hex('#1d1a33'), hex('#3b2438')],
}
const LAYER_DUSK = [hex('#5a3a52'), hex('#2e2236'), hex('#14131c')]
const LAYER_NIGHT = [hex('#151b2c'), hex('#0d121e'), hex('#06090f')]

export class City {
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private cacheDpr = 1
  private layers: Layer[] = []
  private palms: Palm[] = []
  private stars: Star[] = []
  private cars: { lane: number; off: number; speed: number; len: number }[] = []
  private worldW = 0
  private recacheCursor = 0

  constructor(private canvas: HTMLCanvasElement, private maxDpr = 1.5, private seed = 421) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    this.resize()
  }

  /** Lower the resolution when frames run long (adaptive quality). */
  setMaxDpr(v: number) {
    if (v === this.maxDpr) return
    this.maxDpr = v
    this.resize()
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr)
    this.cacheDpr = Math.min(this.dpr, 1.25)
    this.w = Math.max(1, r.width)
    this.h = Math.max(1, r.height)
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)
    this.build()
  }

  private horizon() { return this.h * 0.74 }

  private build() {
    const R = rng(this.seed)
    const { w, h } = this
    this.worldW = w * 2.4
    const horizon = this.horizon()
    this.layers = [0.18, 0.42, 0.75].map((p, li) => {
      const buildings: Building[] = []
      const windows: Win[] = []
      const span = w + (this.worldW - w) * p + PAD * 2
      const maxH = [0.34, 0.46, 0.6][li] * h
      const minH = [0.08, 0.12, 0.16][li] * h
      let x = -PAD
      while (x < span - PAD) {
        const bw = lerp([28, 40, 56][li], [70, 110, 150][li], R())
        const tall = R() < [0.12, 0.16, 0.12][li]
        const bh = tall ? lerp(maxH * 0.8, maxH, R()) : lerp(minH, maxH * 0.55, Math.pow(R(), 1.4))
        buildings.push({ x, w: bw, h: bh, top: Math.floor(R() * 4) as Building['top'], antenna: R() < 0.3 ? lerp(10, 40, R()) : 0 })
        const cw = [3, 4, 5][li], ch = [4, 6, 8][li], gx = [4, 6, 8][li], gy = [6, 9, 12][li]
        const cols = Math.max(1, Math.floor((bw - gx) / (cw + gx)))
        const rows = Math.max(1, Math.floor((bh - 14) / (ch + gy)))
        const ox = (bw - cols * (cw + gx) + gx) / 2
        const strips = R() < 0.25
        for (let r = 0; r < rows; r++) {
          const floorLit = R()
          for (let c = 0; c < cols; c++) {
            if (strips && c % 2 === 1) continue
            windows.push({
              x: x + ox + c * (cw + gx), y: horizon - bh + 12 + r * (ch + gy),
              w: strips ? cw * 2 + gx : cw, h: ch,
              th: clamp(floorLit * 0.6 + R() * 0.55), warm: R() < 0.78,
            })
          }
        }
        x += bw + lerp(2, [10, 16, 26][li], R())
      }
      const cache = document.createElement('canvas')
      cache.width = Math.ceil(span * this.cacheDpr)
      cache.height = Math.ceil((horizon + 4) * this.cacheDpr)
      return { p, buildings, windows, span, cache, level: -1 }
    })
    this.palms = Array.from({ length: 7 }, (_, i) => ({
      x: (i / 7) * w * 1.6 + R() * 120 - 60, h: lerp(h * 0.32, h * 0.52, R()), lean: lerp(-0.25, 0.25, R()), phase: R() * Math.PI * 2,
    }))
    this.stars = Array.from({ length: 140 }, () => ({ x: R() * w, y: R() * horizon * 0.7, r: R() < 0.1 ? 1.4 : 0.8, tw: R() * 6 }))
    this.cars = Array.from({ length: 30 }, (_, i) => ({ lane: i % 2, off: R(), speed: lerp(70, 160, R()), len: lerp(18, 46, R()) }))
    // Fill every cache now so the first frame is complete.
    this.layers.forEach((_, i) => this.paintLayer(i, 0))
  }

  /** Draw one skyline layer, with the windows lit at this night level, into its cache. */
  private paintLayer(li: number, level: number) {
    const L = this.layers[li]
    const c = L.cache.getContext('2d')!
    const n = level / LEVELS
    const horizon = this.horizon()
    c.setTransform(this.cacheDpr, 0, 0, this.cacheDpr, PAD * this.cacheDpr, 0)
    c.clearRect(-PAD, 0, L.span, horizon + 4)
    c.fillStyle = mix(LAYER_DUSK[li], LAYER_NIGHT[li], n)
    for (const b of L.buildings) {
      const top = horizon - b.h
      c.fillRect(b.x, top, b.w, b.h + 4)
      if (b.top === 1) c.fillRect(b.x + b.w * 0.2, top - 8, b.w * 0.6, 8)
      if (b.top === 2) { c.fillRect(b.x + b.w * 0.3, top - 16, b.w * 0.4, 16); c.fillRect(b.x + b.w * 0.42, top - 26, b.w * 0.16, 10) }
      if (b.top === 3) { c.beginPath(); c.moveTo(b.x, top); c.lineTo(b.x + b.w / 2, top - b.w * 0.35); c.lineTo(b.x + b.w, top); c.fill() }
      if (b.antenna) c.fillRect(b.x + b.w / 2 - 1, top - b.antenna - (b.top === 2 ? 26 : 0), 2, b.antenna)
    }
    if (n < 0.8 && li > 0) {
      c.fillStyle = `rgba(255,150,90,${0.22 * (1 - n / 0.8)})`
      for (const b of L.buildings) c.fillRect(b.x, horizon - b.h, 2, b.h)
    }
    const lit = n * 1.15 + 0.05
    for (const warm of [true, false]) {
      c.fillStyle = warm ? `rgba(255,196,107,${li === 0 ? 0.55 : 0.9})` : `rgba(191,233,255,${li === 0 ? 0.55 : 0.9})`
      for (const wn of L.windows) if (wn.warm === warm && wn.th <= lit) c.fillRect(wn.x, wn.y, wn.w, wn.h)
    }
    L.level = level
  }

  render(s: CityState) {
    const { ctx, w, h, dpr } = this
    const n = clamp(s.night)
    const horizon = this.horizon()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Re-cache at most one stale layer per frame, so scrolling never stalls.
    const want = Math.round(n * LEVELS)
    for (let k = 0; k < 3; k++) {
      const li = (this.recacheCursor + k) % 3
      if (this.layers[li].level !== want) { this.paintLayer(li, want); this.recacheCursor = li + 1; break }
    }

    // Sky
    const g = ctx.createLinearGradient(0, 0, 0, horizon)
    g.addColorStop(0, mix(SKY.dusk[0], SKY.night[0], n))
    g.addColorStop(0.45, mix(SKY.dusk[1], SKY.night[1], n))
    g.addColorStop(0.8, mix(SKY.dusk[2], SKY.night[2], n))
    g.addColorStop(1, mix(SKY.dusk[3], SKY.night[3], n))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, horizon + 2)

    if (n > 0.35) {
      const a = (n - 0.35) / 0.65
      ctx.fillStyle = '#fff'
      for (const st of this.stars) {
        ctx.globalAlpha = a * (0.45 + 0.55 * Math.sin(s.t * 1.3 + st.tw) ** 2)
        ctx.fillRect(st.x, st.y, st.r, st.r)
      }
      ctx.globalAlpha = 1
    }

    // Sun sinks below the skyline as night falls
    const sunX = w * (0.66 - s.pan * 0.08)
    const sunR = Math.min(w, h) * 0.13
    const sunY = horizon - h * 0.16 + n * h * 0.32
    if (n < 0.95) {
      const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 4.2)
      glow.addColorStop(0, `rgba(255,190,110,${0.55 * (1 - n)})`)
      glow.addColorStop(1, 'rgba(255,120,60,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, horizon)
      const disc = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR)
      disc.addColorStop(0, '#fff3c9')
      disc.addColorStop(1, '#ff7a35')
      ctx.globalAlpha = 1 - n
      ctx.fillStyle = disc
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = mix(SKY.dusk[2], SKY.night[2], n)
      for (let i = 0; i < 5; i++) ctx.fillRect(sunX - sunR, sunY + sunR * (0.15 + i * 0.17), sunR * 2, 2 + i * 1.6)
      ctx.globalAlpha = 1
    }

    // Helicopter, with a searchlight at night
    const hp = ((s.t / 26) % 1.4) - 0.2
    const hx = lerp(-80, w + 80, hp)
    const hy = h * 0.26 + Math.sin(s.t * 0.8) * 6
    if (n > 0.4) {
      ctx.fillStyle = `rgba(255,240,200,${0.1 * (n - 0.4)})`
      ctx.beginPath(); ctx.moveTo(hx, hy + 4); ctx.lineTo(hx - 150, horizon); ctx.lineTo(hx + 30, horizon); ctx.closePath(); ctx.fill()
    }
    ctx.fillStyle = mix(hex('#2a1d24'), hex('#04060a'), n)
    ctx.beginPath(); ctx.ellipse(hx, hy, 15, 6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillRect(hx + 10, hy - 2, 26, 3)
    ctx.fillRect(hx + 33, hy - 6, 3, 8)
    ctx.fillRect(hx - 22 + Math.sin(s.t * 40) * 6, hy - 9, 44, 1.5)
    if (Math.sin(s.t * 5) > 0.6) { ctx.fillStyle = '#ff3b30'; ctx.fillRect(hx + 35, hy - 7, 2.5, 2.5) }

    // Distant hills and haze
    ctx.fillStyle = mix(hex('#7b4a5a'), hex('#0c1020'), n)
    ctx.beginPath(); ctx.moveTo(0, horizon)
    for (let x = 0; x <= w; x += 16) {
      const xx = x + s.pan * w * 0.08
      ctx.lineTo(x, horizon - h * 0.05 - Math.sin(xx * 0.004) * h * 0.03 - Math.sin(xx * 0.011 + 1) * h * 0.012)
    }
    ctx.lineTo(w, horizon); ctx.closePath(); ctx.fill()
    if (n < 1) {
      const haze = ctx.createLinearGradient(0, horizon - h * 0.12, 0, horizon)
      haze.addColorStop(0, 'rgba(255,170,110,0)')
      haze.addColorStop(1, `rgba(255,150,100,${0.28 * (1 - n)})`)
      ctx.fillStyle = haze
      ctx.fillRect(0, horizon - h * 0.12, w, h * 0.12)
    }

    // Skyline layers from cache, with parallax
    this.layers.forEach((L, li) => {
      const sx = s.pan * (this.worldW - w) * L.p + Math.sin(s.t * 0.05) * 6 * L.p + PAD
      ctx.drawImage(L.cache, sx * this.cacheDpr, 0, w * this.cacheDpr, (horizon + 4) * this.cacheDpr, 0, 0, w, horizon + 4)
      // Aviation lights blink on the antennas
      if (n > 0.3 && Math.sin(s.t * 2.2 + li) > 0) {
        ctx.fillStyle = '#ff4d3d'
        for (const b of L.buildings) {
          if (!b.antenna) continue
          const x = b.x - (sx - PAD)
          if (x > w || x < 0) continue
          ctx.fillRect(x + b.w / 2 - 1.5, horizon - b.h - b.antenna - (b.top === 2 ? 26 : 0) - 2, 3, 3)
        }
      }
    })

    // Ground and an elevated freeway with traffic
    ctx.fillStyle = mix(hex('#140f18'), hex('#030407'), n)
    ctx.fillRect(0, horizon, w, h - horizon)
    const roadY = horizon + h * 0.035
    ctx.fillStyle = mix(hex('#100d14'), hex('#030407'), n)
    ctx.fillRect(0, roadY - 3, w, 16)
    ctx.fillStyle = `rgba(255,190,120,${0.25 + 0.4 * n})`
    ctx.fillRect(0, roadY - 4, w, 1)
    ctx.fillStyle = mix(hex('#0e0b12'), hex('#020304'), n)
    for (let x = -((s.pan * w * 1.4) % 140); x < w; x += 140) ctx.fillRect(x, roadY + 12, 10, h * 0.08)
    const headA = 0.55 + 0.45 * n
    for (const c of this.cars) {
      const dir = c.lane === 0 ? -1 : 1
      const span = w + 200
      const pos = ((c.off * span + dir * c.speed * s.t) % span + span) % span - 100
      const y = roadY + (c.lane === 0 ? 1 : 6)
      const rgb = c.lane === 0 ? '255,244,214' : '255,70,50'
      // A streak as three segments of falling alpha: no per-car gradient objects.
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = `rgba(${rgb},${headA * (1 - k / 3)})`
        const seg = c.len / 3
        ctx.fillRect(dir < 0 ? pos + k * seg : pos - (k + 1) * seg, y, seg, 2.5)
      }
    }

    // Foreground palms sway against the sky
    ctx.strokeStyle = mix(hex('#0d0a10'), hex('#010203'), n)
    for (const p of this.palms) {
      const x = p.x - s.pan * w * 0.9
      if (x < -200 || x > w + 200) continue
      const base = h + 10
      const sway = Math.sin(s.t * 0.9 + p.phase) * 6
      const tx = x + p.lean * p.h + sway
      const ty = base - p.h
      ctx.lineWidth = 7
      ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + p.lean * p.h * 0.2, base - p.h * 0.55, tx, ty); ctx.stroke()
      ctx.lineWidth = 3.2
      ctx.beginPath()
      for (let f = 0; f < 9; f++) {
        const a = (f / 9) * Math.PI * 2 + Math.sin(s.t * 1.1 + p.phase + f) * 0.06
        const len = p.h * 0.32
        ctx.moveTo(tx, ty)
        ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.25 - len * 0.18, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.5 + len * 0.28)
      }
      ctx.stroke()
    }
  }
}
