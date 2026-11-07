// Shared motion runtime: GSAP + plugins, the one animation clock (gsap.ticker),
// frame statistics for the HUD fps meter, and helpers every effect uses.
// Loaded only when motion is allowed (main.js decides).

let loading;

/** Resolve { gsap, ScrollTrigger, CustomEase } once, with the project eases registered. */
export function loadRuntime() {
  loading ??= Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger.js'),
    import('gsap/CustomEase.js'),
  ]).then(([g, st, ce]) => {
    const gsap = g.gsap ?? g.default;
    const { ScrollTrigger } = st;
    const { CustomEase } = ce;
    gsap.registerPlugin(ScrollTrigger, CustomEase);
    // Token eases, exact: --ease-out and --ease-in-out.
    CustomEase.create('vd-out', 'M0,0 C0.2,0 0,1 1,1');
    CustomEase.create('vd-in-out', 'M0,0 C0.4,0 0.2,1 1,1');
    gsap.defaults({ ease: 'vd-out', duration: 0.3 });
    // Lenis is driven from the ticker; lag smoothing would desync scroll and scene.
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.config({ ignoreMobileResize: true });
    startFrameStats(gsap);
    return { gsap, ScrollTrigger, CustomEase };
  });
  return loading;
}

/* ---------- frame statistics (fed by the shared ticker) ---------- */

export const frames = {
  fps: 0,          // rolling fps over the last ~0.5 s
  ms: 16.7,        // rolling average frame time
  samples: [],     // last 120 frame deltas, ms
};

function startFrameStats(gsap) {
  let acc = 0;
  let n = 0;
  gsap.ticker.add((_t, dt) => {
    if (dt <= 0 || dt > 250) return; // tab switch or first frame
    frames.samples.push(dt);
    if (frames.samples.length > 120) frames.samples.shift();
    acc += dt;
    n += 1;
    if (acc >= 500) {
      frames.ms = acc / n;
      frames.fps = Math.round(1000 / frames.ms);
      acc = 0;
      n = 0;
    }
  });
}

/* ---------- small helpers ---------- */

export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

const logged = new Set();
/** Log an effect failure once per key; never rethrow. */
export function fail(key, err) {
  if (logged.has(key)) return;
  logged.add(key);
  console.warn(`[fx] ${key} disabled:`, err);
}

/** Read a CSS custom property from :root. */
export function token(name, fallback = '') {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Resolve any CSS color (oklch, color-mix, hex…) to linear-ish sRGB floats [0..1]. */
let probe;
export function cssColor(value, fallback = '#000') {
  probe ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = fallback;
  try { probe.fillStyle = value || fallback; } catch { /* keep fallback */ }
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
