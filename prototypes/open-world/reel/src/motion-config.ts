// Single source of truth for the Open World look: colors, type, timings and eases.
// CSS reads these through custom properties (applyTokens), GSAP and Motion import them directly,
// and both city renderers take their sky from `sky`.

export const colors = {
  dusk: '#FF7A3D',     // dusk orange: the one accent (primary actions, underline start)
  pink: '#FF4F8B',     // sky pink: underline end, sky gradient
  teal: '#0E2A33',     // deep teal: shadows, raised panels
  base: '#0A0C10',     // near-black page base
  hud: '#F4F1EA',      // HUD white: primary text
  cash: '#3DDC84',     // cash green: the counter only
  star: '#FFC53D',     // star gold: the skill stars only
  // Derived neutrals (measured against `base`, see README contrast table)
  hud2: '#C9C3B6',     // secondary text
  hud3: '#9C978C',     // labels, tertiary text
  line: 'rgb(244 241 234 / 0.16)',
  lineStrong: 'rgb(244 241 234 / 0.42)',
  panel: 'rgb(14 42 51 / 0.92)',
  onAccent: '#0A0C10',
} as const

/** Sky stops, top → horizon, for golden hour and night. Shared by the CSS poster, the 2D and the 3D city. */
export const sky = {
  dusk: ['#0E2A33', '#7E2F5C', '#FF4F8B', '#FF7A3D'],
  night: ['#03050A', '#0A1124', '#1D1A33', '#3B2438'],
  sun: ['#FFF1C9', '#FF7A3D'],
} as const

export const fonts = {
  display: '"Anton", "Anton Fallback", Impact, sans-serif',
  body: '"Inter", "Inter Fallback", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", "JetBrains Mono Fallback", ui-monospace, Menlo, monospace',
} as const

/** Type scale (rem-based) with paired line-heights. */
export const type = {
  name: 'clamp(3.5rem, 11vw, 9rem)',
  title: 'clamp(2.75rem, 1.5rem + 5vw, 6rem)',
  heading: 'clamp(1.75rem, 1.25rem + 1.5vw, 2.5rem)',
  lead: 'clamp(1.0625rem, 1rem + 0.35vw, 1.25rem)',
  body: '1.0625rem',
  small: '0.875rem',
  label: '0.75rem',
  lhDisplay: '0.95',
  lhHeading: '1.15',
  lhBody: '1.6',
  trackDisplay: '-0.01em',
  trackLabel: '0.08em',
  measure: '65ch',
} as const

/** 8 px spacing scale. */
export const space = [0, 8, 16, 24, 32, 48, 64, 96, 128] as const

/** Eases as cubic-bezier control points. Motion takes the arrays; GSAP gets them as CustomEase names. */
export const ease = {
  out: [0.2, 0, 0, 1] as [number, number, number, number],        // Krehel ease-out
  underline: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const
export const gsapEase = { out: 'vd-out', underline: 'vd-underline', inOut: 'vd-inout' } as const

/** Durations in seconds. */
export const time = {
  press: 0.15,          // tap / press feedback (scale 0.96)
  fast: 0.15,           // exits, high-frequency feedback
  reveal: 0.3,          // child reveal
  stagger: 0.1,         // child stagger
  heading: 0.5,         // section heading reveal
  nameRise: 0.5,        // hero name words
  nameStagger: 0.08,
  underline: 0.6,
  loadingMin: 3,        // loading screen, at least
  loadingCap: 4,        // and never longer than
  loadingFade: 0.4,
  tip: 1.2,             // one loading tip per
  counterHold: 2.4,     // HUD counter: seconds on each stat
  counterTick: 0.9,     // HUD counter: tick-up duration
  starStagger: 0.12,
} as const

export const distance = { nameRise: 24, childRise: 12, tipRise: 8, kenBurnsScale: 1.08 } as const

/** Write the tokens to CSS custom properties on <html>. Runs once, before the first render. */
export function applyTokens(root: HTMLElement = document.documentElement) {
  const set = (k: string, v: string) => root.style.setProperty(k, v)
  Object.entries(colors).forEach(([k, v]) => set(`--c-${k}`, v))
  sky.dusk.forEach((v, i) => set(`--sky-dusk-${i}`, v))
  sky.sun.forEach((v, i) => set(`--sun-${i}`, v))
  Object.entries(fonts).forEach(([k, v]) => set(`--font-${k}`, v))
  Object.entries(type).forEach(([k, v]) => set(`--t-${k}`, v))
  space.forEach((v, i) => set(`--s-${i}`, `${v}px`))
  set('--ease-out', `cubic-bezier(${ease.out.join(',')})`)
  set('--ease-underline', `cubic-bezier(${ease.underline.join(',')})`)
  set('--dur-press', `${time.press * 1000}ms`)
  set('--dur-fast', `${time.fast * 1000}ms`)
  set('--dur-reveal', `${time.reveal * 1000}ms`)
  set('--dur-underline', `${time.underline * 1000}ms`)
}
