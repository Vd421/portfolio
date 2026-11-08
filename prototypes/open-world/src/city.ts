// Procedural city at golden hour → night, drawn with Canvas 2D.
// One renderer drives both the intro cinematic and the scrolling backdrop.
//   state.night: 0 = golden hour, 1 = deep night
//   state.pan:   0..1 camera position along the skyline
//   state.t:     seconds, for ambient motion (traffic, palms, helicopter)

export type CityState = { t: number; night: number; pan: number; zoom?: number }

type Building = { x: number; w: number; h: number; top: 0 | 1 | 2 | 3; antenna: number; seed: number }
type Win = { x: number; y: number; w: number; h: number; th: number; warm: boolean }
type Layer = { p: number; buildings: Building[]; windows: Win[]; base: number }
type Palm = { x: number; h: number; lean: number; phase: number }
type Star = { x: number; y: number; r: number; tw: number }

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
const WARM: RGB = hex('#ffc46b')
const COOL: RGB = hex('#bfe9ff')

export class City {
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private layers: Layer[] = []
  private palms: Palm[] = []
  private stars: Star[] = []
  private cars: { lane: number; off: number; speed: number; len: number }[] = []
  private worldW = 0

  constructor(private canvas: HTMLCanvasElement, private seed = 421) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    this.resize()
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.w = Math.max(1, r.width)
    this.h = Math.max(1, r.height)
    this.canvas.width = Math.round(this.w * this.dpr)
    this.canvas.height = Math.round(this.h * this.dpr)
    this.build()
  }

  private build() {
    const R = rng(this.seed)
    const { w, h } = this
    this.worldW = w * 2.4
    const horizon = h * 0.74
    this.layers = [0.18, 0.42, 0.75].map((p, li) => {
      const buildings: Building[] = []
      const windows: Win[] = []
      const span = w + (this.worldW - w) * p + 40
      const maxH = [0.34, 0.46, 0.6][li] * h
      const minH = [0.08, 0.12, 0.16][li] * h
      let x = -40
      while (x < span) {
        const bw = lerp([28, 40, 56][li], [70, 110, 150][li], R())
        // A few towers break the roofline; the rest stays low.
        const tall = R() < [0.12, 0.16, 0.12][li]
        const bh = tall ? lerp(maxH * 0.8, maxH, R()) : lerp(minH, maxH * 0.55, Math.pow(R(), 1.4))
        const b: Building = { x, w: bw, h: bh, top: Math.floor(R() * 4) as Building['top'], antenna: R() < 0.3 ? lerp(10, 40, R()) : 0, seed: R() }
        buildings.push(b)
        // Window grid
        const cw = [3, 4, 5][li], ch = [4, 6, 8][li], gx = [4, 6, 8][li], gy = [6, 9, 12][li]
        const cols = Math.max(1, Math.floor((bw - gx) / (cw + gx)))
        const rows = Math.max(1, Math.floor((bh - 14) / (ch + gy)))
        const ox = (bw - cols * (cw + gx) + gx) / 2
        const style = R()
        for (let r = 0; r < rows; r++) {
          const floorLit = R()
          for (let c = 0; c < cols; c++) {
            if (style < 0.25 && c % 2 === 1) continue // strip windows on some buildings
            windows.push({
              x: x + ox + c * (cw + gx),
              y: horizon - bh + 12 + r * (ch + gy),
              w: style < 0.25 ? cw * 2 + gx : cw,
              h: ch,
              th: clamp(floorLit * 0.6 + R() * 0.55),
              warm: R() < 0.78,
            })
          }
        }
        x += bw + lerp(2, [10, 16, 26][li], R())
      }
      return { p, buildings, windows, base: horizon + li * 2 }
    })
    this.palms = Array.from({ length: 7 }, (_, i) => ({
      x: (i / 7) * w * 1.6 + R() * 120 - 60,
      h: lerp(h * 0.32, h * 0.52, R()),
      lean: lerp(-0.25, 0.25, R()),
      phase: R() * Math.PI * 2,
    }))
    this.stars = Array.from({ length: 160 }, () => ({ x: R() * w, y: R() * horizon * 0.7, r: R() < 0.1 ? 1.4 : 0.8, tw: R() * 6 }))
    this.cars = Array.from({ length: 34 }, (_, i) => ({ lane: i % 2, off: R(), speed: lerp(70, 160, R()), len: lerp(18, 46, R()) }))
  }

  render(s: CityState) {
    const { ctx, w, h, dpr } = this
    const n = clamp(s.night)
    const horizon = h * 0.74
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Sky
    const g = ctx.createLinearGradient(0, 0, 0, horizon)
    g.addColorStop(0, mix(SKY.dusk[0], SKY.night[0], n))
    g.addColorStop(0.45, mix(SKY.dusk[1], SKY.night[1], n))
    g.addColorStop(0.8, mix(SKY.dusk[2], SKY.night[2], n))
    g.addColorStop(1, mix(SKY.dusk[3], SKY.night[3], n))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, horizon + 2)

    // Stars fade in after sunset
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
      // Heat bands across the disc
      ctx.fillStyle = mix(SKY.dusk[2], SKY.night[2], n)
      for (let i = 0; i < 5; i++) {
        const y = sunY + sunR * (0.15 + i * 0.17)
        ctx.fillRect(sunX - sunR, y, sunR * 2, 2 + i * 1.6)
      }
      ctx.globalAlpha = 1
    }

    // Helicopter with a searchlight at night
    const hp = ((s.t / 26) % 1.4) - 0.2
    const hx = lerp(-80, w + 80, hp)
    const hy = h * 0.26 + Math.sin(s.t * 0.8) * 6
    if (n > 0.4) {
      const beam = ctx.createLinearGradient(hx, hy, hx - 60, horizon)
      beam.addColorStop(0, `rgba(255,240,200,${0.22 * (n - 0.4)})`)
      beam.addColorStop(1, 'rgba(255,240,200,0)')
      ctx.fillStyle = beam
      ctx.beginPath(); ctx.moveTo(hx, hy + 4); ctx.lineTo(hx - 150, horizon); ctx.lineTo(hx + 30, horizon); ctx.closePath(); ctx.fill()
    }
    ctx.fillStyle = mix(hex('#2a1d24'), hex('#04060a'), n)
    ctx.beginPath(); ctx.ellipse(hx, hy, 15, 6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillRect(hx + 10, hy - 2, 26, 3)
    ctx.fillRect(hx + 33, hy - 6, 3, 8)
    ctx.fillRect(hx - 22 + Math.sin(s.t * 40) * 6, hy - 9, 44, 1.5)
    if (Math.sin(s.t * 5) > 0.6) { ctx.fillStyle = '#ff3b30'; ctx.fillRect(hx + 35, hy - 7, 2.5, 2.5) }

    // Distant hills, then three skyline layers with parallax
    ctx.fillStyle = mix(hex('#7b4a5a'), hex('#0c1020'), n)
    ctx.beginPath(); ctx.moveTo(0, horizon)
    for (let x = 0; x <= w; x += 12) {
      const xx = x + s.pan * w * 0.08
      ctx.lineTo(x, horizon - h * 0.05 - Math.sin(xx * 0.004) * h * 0.03 - Math.sin(xx * 0.011 + 1) * h * 0.012)
    }
    ctx.lineTo(w, horizon); ctx.closePath(); ctx.fill()

    // Low haze in front of the hills
    const haze = ctx.createLinearGradient(0, horizon - h * 0.12, 0, horizon)
    haze.addColorStop(0, 'rgba(255,170,110,0)')
    haze.addColorStop(1, `rgba(255,150,100,${0.28 * (1 - n)})`)
    ctx.fillStyle = haze
    ctx.fillRect(0, horizon - h * 0.12, w, h * 0.12)

    this.layers.forEach((L, li) => {
      const ox = -s.pan * (this.worldW - w) * L.p - Math.sin(s.t * 0.05) * 6 * L.p
      const col = mix(LAYER_DUSK[li], LAYER_NIGHT[li], n)
      ctx.fillStyle = col
      for (const b of L.buildings) {
        const x = b.x + ox
        if (x > w || x + b.w < 0) continue
        const top = horizon - b.h
        ctx.fillRect(x, top, b.w, b.h + 2)
        if (b.top === 1) ctx.fillRect(x + b.w * 0.2, top - 8, b.w * 0.6, 8)
        if (b.top === 2) { ctx.fillRect(x + b.w * 0.3, top - 16, b.w * 0.4, 16); ctx.fillRect(x + b.w * 0.42, top - 26, b.w * 0.16, 10) }
        if (b.top === 3) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + b.w / 2, top - b.w * 0.35); ctx.lineTo(x + b.w, top); ctx.fill() }
        if (b.antenna) {
          ctx.fillRect(x + b.w / 2 - 1, top - b.antenna - (b.top === 2 ? 26 : 0), 2, b.antenna)
        }
      }
      // Rim light from the sunset on the near edge of each building
      if (n < 0.8 && li > 0) {
        ctx.fillStyle = `rgba(255,150,90,${0.22 * (1 - n / 0.8)})`
        for (const b of L.buildings) {
          const x = b.x + ox
          if (x > w || x + b.w < 0) continue
          ctx.fillRect(x, horizon - b.h, 2, b.h)
        }
      }
      // Windows switch on as the night deepens
      const lit = n * 1.15 + 0.05
      for (const warm of [true, false]) {
        ctx.fillStyle = mix(warm ? WARM : COOL, warm ? WARM : COOL, 0, li === 0 ? 0.55 : 0.9)
        for (const wn of L.windows) {
          if (wn.warm !== warm || wn.th > lit) continue
          const x = wn.x + ox
          if (x > w || x + wn.w < 0) continue
          ctx.fillRect(x, wn.y, wn.w, wn.h)
        }
      }
      // Aviation lights on antennas
      if (n > 0.3 && Math.sin(s.t * 2.2 + li) > 0) {
        ctx.fillStyle = '#ff4d3d'
        for (const b of L.buildings) {
          if (!b.antenna) continue
          const x = b.x + ox
          if (x > w || x < 0) continue
          ctx.fillRect(x + b.w / 2 - 1.5, horizon - b.h - b.antenna - (b.top === 2 ? 26 : 0) - 2, 3, 3)
        }
      }
    })

    // Ground and an elevated freeway with traffic
    const gy = horizon
    const ground = ctx.createLinearGradient(0, gy, 0, h)
    ground.addColorStop(0, mix(hex('#1b1420'), hex('#05070b'), n))
    ground.addColorStop(1, mix(hex('#0b0a10'), hex('#020305'), n))
    ctx.fillStyle = ground
    ctx.fillRect(0, gy, w, h - gy)
    const roadY = gy + h * 0.035
    ctx.fillStyle = mix(hex('#100d14'), hex('#030407'), n)
    ctx.fillRect(0, roadY - 3, w, 16)
    ctx.fillStyle = `rgba(255,190,120,${0.25 + 0.4 * n})`
    ctx.fillRect(0, roadY - 4, w, 1)
    // Pillars
    ctx.fillStyle = mix(hex('#0e0b12'), hex('#020304'), n)
    for (let x = -((s.pan * w * 1.4) % 140); x < w; x += 140) ctx.fillRect(x, roadY + 12, 10, h * 0.08)
    // Light streaks
    ctx.globalCompositeOperation = 'lighter'
    for (const c of this.cars) {
      const dir = c.lane === 0 ? -1 : 1
      const span = w + 200
      const pos = ((c.off * span + dir * c.speed * s.t) % span + span) % span - 100
      const y = roadY + (c.lane === 0 ? 1 : 6)
      const grad = ctx.createLinearGradient(pos, 0, pos - dir * c.len, 0)
      const head = c.lane === 0 ? '255,244,214' : '255,70,50'
      grad.addColorStop(0, `rgba(${head},${0.55 + 0.45 * n})`)
      grad.addColorStop(1, `rgba(${head},0)`)
      ctx.fillStyle = grad
      ctx.fillRect(Math.min(pos, pos - dir * c.len), y, c.len, 2.5)
    }
    ctx.globalCompositeOperation = 'source-over'

    // Foreground palms sway against the sky
    ctx.strokeStyle = ctx.fillStyle = mix(hex('#0d0a10'), hex('#010203'), n)
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
      for (let f = 0; f < 9; f++) {
        const a = (f / 9) * Math.PI * 2 + Math.sin(s.t * 1.1 + p.phase + f) * 0.06
        const len = p.h * 0.32
        const ex = tx + Math.cos(a) * len
        const ey = ty + Math.sin(a) * len * 0.5 + len * 0.28
        ctx.beginPath(); ctx.moveTo(tx, ty)
        ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.25 - len * 0.18, ex, ey)
        ctx.stroke()
      }
    }

    // Vignette
    const v = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.8)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, w, h)
  }
}
