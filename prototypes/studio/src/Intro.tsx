import { useEffect, useRef, useState } from 'react'
import { intro as T } from './motion'

// Smoke, flame and sparks in one fragment shader, drawn at reduced resolution (smoke is soft anyway).
// The canvas is an overlay: it paints the matte base until the smoke is thick, then the smoke
// dissolves through noise holes and the already-rendered page shows through. Original effect.
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uOrigin;   // match tip, 0..1 with y up
uniform float uTime, uFlame, uDensity, uSpread, uClear, uCover, uSpark;
const vec3 BASE = vec3(0.0784);
const vec3 SMOKE = vec3(0.80, 0.77, 0.73);
const vec3 EMBER = vec3(0.886, 0.408, 0.235);

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - uOrigin.x) * aspect, uv.y - uOrigin.y); // origin-centred, aspect-correct
  float t = uTime;

  // Smoke: domain-warped fbm advected upward, with a lateral sway that grows with height.
  vec2 q = vec2(p.x * 2.2, p.y * 1.6 - t * 0.55);
  q.x += sin(p.y * 3.0 - t * 0.9) * 0.25 * clamp(p.y, 0.0, 1.0);
  float warp = fbm(q * 1.3 + vec2(0.0, t * 0.12));
  float n = fbm(q * 1.7 + warp * 1.6);

  // Plume: a thin column above the tip that widens with height, then (spread) fills the frame.
  float h = max(p.y - 0.05, 0.0);
  float width = mix(0.04 + 0.2 * h + 0.3 * h * h, 2.5, uSpread);
  float plume = exp(-(p.x * p.x) / (width * width)) * smoothstep(0.02, 0.1, p.y + uSpread * 2.0);
  float smoke = plume * smoothstep(0.3 - uSpread * 0.1, 0.78, n) * uDensity;
  // Wisp: one curling thread rising from the flame, the first smoke you see.
  float sway = sin(h * 7.0 - t * 2.4) * 0.05 * h + (n - 0.5) * 0.12 * h;
  float thread = 0.006 + 0.05 * h;
  float wisp = exp(-pow(p.x - sway, 2.0) / (thread * thread)) * smoothstep(0.04, 0.1, p.y) * exp(-h * 1.3);
  smoke = max(smoke, wisp * (0.35 + 0.65 * n) * 0.9 * min(1.0, uDensity * 2.0) * (1.0 - uSpread));

  // Clear: holes open where a second noise field passes the threshold.
  float holes = fbm(uv * vec2(aspect, 1.0) * 2.5 + vec2(t * 0.05, -t * 0.08));
  smoke *= 1.0 - smoothstep(holes - 0.12, holes + 0.12, uClear * 1.25 - 0.1);
  smoke = clamp(smoke, 0.0, 1.0);

  // Flame: a flickering teardrop at the tip, plus a warm glow lighting nearby smoke.
  vec2 fp = p - vec2(0.0, 0.045);
  float flick = 0.85 + 0.15 * sin(t * 31.0) * sin(t * 17.0 + 1.3);
  float tear = length(vec2(fp.x * 2.2, fp.y * (fp.y > 0.0 ? 0.75 : 2.0)) ) / (0.07 * flick);
  float core = smoothstep(1.0, 0.0, tear) * uFlame;
  float glow = exp(-length(p) * 5.0) * uFlame;

  // Sparks: a burst at the strike, falling under gravity.
  float sparks = 0.0;
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    float ang = hash(vec2(fi, 3.1)) * 3.1416 * 1.1 - 0.05;
    float spd = 0.25 + hash(vec2(fi, 7.7)) * 0.45;
    float age = uSpark;
    vec2 sp = vec2(cos(ang), sin(ang)) * spd * age - vec2(0.0, 0.9 * age * age);
    float d = length(p - sp);
    sparks += smoothstep(0.006, 0.0, d) * (1.0 - age) * step(0.001, age);
  }

  vec3 smokeCol = mix(SMOKE * (0.55 + 0.45 * n), EMBER, clamp(glow * 1.6, 0.0, 0.7));
  float sa = smoke * 0.92;
  float cover = uCover;
  float a = sa + cover * (1.0 - sa);
  vec3 col = a > 0.0 ? (smokeCol * sa + BASE * cover * (1.0 - sa)) / a : BASE;
  // Light: flame core, glow and sparks are additive and also raise alpha so they show over the page.
  vec3 light = mix(EMBER, vec3(1.0, 0.86, 0.6), core) * (core * 1.4 + glow * 0.35) + vec3(1.0, 0.75, 0.45) * sparks;
  col += light;
  a = clamp(a + core + glow * 0.4 + sparks, 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}`

const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const smooth = (x: number) => x * x * (3 - 2 * x)

function makeGL(canvas: HTMLCanvasElement) {
  // No real GPU (software rendering) → no intro: the smoke would block the main thread. `?anygl` overrides for QA.
  const failIfMajorPerformanceCaveat = !new URLSearchParams(location.search).has('anygl')
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true, antialias: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat })
  if (!gl) return null
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog); gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u = (n: string) => gl.getUniformLocation(prog, n)
  return { gl, u: { res: u('uRes'), origin: u('uOrigin'), time: u('uTime'), flame: u('uFlame'), density: u('uDensity'), spread: u('uSpread'), clear: u('uClear'), cover: u('uCover'), spark: u('uSpark') } }
}

/**
 * First-visit intro: a match strikes, flares, and its smoke fills the screen, then clears to reveal
 * the page. About 4 s. Skippable by click, tap, Enter, Space, Esc or the Skip button. Calls `onReveal`
 * when the page should start its entrance, and `onDone` when the overlay is gone.
 */
export function Intro({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'ready' | 'struck' | 'lit' | 'out'>('ready')
  const [leaving, setLeaving] = useState(false)
  const done = useRef(false)
  const revealed = useRef(false)
  const cb = useRef({ onReveal, onDone })
  cb.current = { onReveal, onDone }

  const reveal = () => { if (!revealed.current) { revealed.current = true; cb.current.onReveal() } }
  const finish = (skipped: boolean) => {
    if (done.current) return
    done.current = true
    reveal()
    if (skipped) { setLeaving(true); window.setTimeout(() => cb.current.onDone(), T.fadeSkip * 1000) }
    else cb.current.onDone()
  }
  const skip = useRef(() => finish(true))
  skip.current = () => finish(true)

  useEffect(() => {
    const el = canvas.current
    let ctx: ReturnType<typeof makeGL> = null
    try { ctx = el ? makeGL(el) : null } catch { ctx = null }
    if (!ctx || !el) { finish(true); return }
    const { gl, u } = ctx
    const scale = Math.min(innerWidth < 768 ? 0.35 : 0.5, 960 / innerWidth)
    const size = () => {
      el.width = Math.max(1, Math.round(innerWidth * scale)); el.height = Math.max(1, Math.round(innerHeight * scale))
      gl.viewport(0, 0, el.width, el.height)
    }
    size(); addEventListener('resize', size)

    const t0 = performance.now()
    const freeze = Number(new URLSearchParams(location.search).get('introAt') ?? NaN) // QA: render one moment
    let raf = 0
    const timers = [
      window.setTimeout(() => setPhase('struck'), 30),
      window.setTimeout(() => setPhase('lit'), T.strike * 1000),
      window.setTimeout(() => setPhase('out'), 1900),
    ]
    const frame = () => {
      const t = Number.isFinite(freeze) ? freeze : (performance.now() - t0) / 1000
      const flame = smooth(ramp(t, T.strike, T.flameFull)) * (1 - smooth(ramp(t, 1.8, 2.4)))
      const density = 0.75 * smooth(ramp(t, T.strike + 0.15, T.plumeEnd)) + 0.25 * smooth(ramp(t, T.plumeEnd, T.billowEnd))
      const spread = smooth(ramp(t, T.plumeEnd - 0.2, T.billowEnd))
      const clear = ramp(t, T.billowEnd, T.clearEnd)
      const cover = 1 - smooth(ramp(t, T.billowEnd, T.coverGone))
      const spark = t >= T.strike ? ramp(t, T.strike, T.strike + 0.55) : 0
      gl.uniform2f(u.res, el.width, el.height)
      gl.uniform2f(u.origin, 0.5, 0.38)
      gl.uniform1f(u.time, t); gl.uniform1f(u.flame, flame); gl.uniform1f(u.density, density); gl.uniform1f(u.spread, spread)
      gl.uniform1f(u.clear, clear); gl.uniform1f(u.cover, cover); gl.uniform1f(u.spark, spark >= 1 ? 0 : spark)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (Number.isFinite(freeze)) return
      if (t >= T.revealAt) reveal()
      if (t >= T.clearEnd) { finish(false); return }
      if (!done.current) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); skip.current() }
    }
    addEventListener('keydown', onKey)
    const onVis = () => { if (document.hidden) skip.current() } // don't leave a half-played intro in a background tab
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf); timers.forEach(clearTimeout)
      removeEventListener('resize', size); removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`intro${leaving ? ' leaving' : ''}`} onClick={() => skip.current()} aria-hidden="true">
      <canvas ref={canvas} />
      <svg className={`match${phase !== 'ready' ? ' struck' : ''}${phase === 'lit' || phase === 'out' ? ' lit' : ''}${phase === 'out' ? ' out' : ''}`}
        viewBox="0 0 120 14" aria-hidden="true">
        <rect x="8" y="5" width="112" height="4" rx="1" fill="#c9b59a" />
        <ellipse cx="7" cy="7" rx="7" ry="5.5" fill="#7a2a1c" />
        <ellipse className="head-lit" cx="7" cy="7" rx="7" ry="5.5" fill="#2a1612" />
      </svg>
      <button type="button" className="btn btn-glass btn-sm intro-skip" tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); skip.current() }}>Skip intro</button>
    </div>
  )
}
