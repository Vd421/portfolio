// Operator cursor: a precise dot on the pointer, four reticle brackets that spring to it
// and lock onto interactive elements (reading their box and radius), and a soft trailing
// blob on a critically damped spring (no overshoot). Fine hover pointers only.
// Over text (selection) and text entry the custom cursor steps aside and the native
// cursor shows. Hidden while the palette is open. Never intercepts events.

import { css, LIVE } from './styles.js';

const INTERACTIVE = 'a[href], button:not(:disabled), [role="button"], summary, label[for], select, input[type="range"], input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"], [data-cursor="lock"]';
const TEXT_ENTRY = 'input:not([type="range"], [type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="reset"]), textarea, [contenteditable]:not([contenteditable="false"])';
const TEXT = 'p, li, dd, dt, blockquote, pre, code, h1, h2, h3, h4, h5, h6, figcaption, td, th, address, small, time, output, label';
const PAD = 6;
const C = 10; // bracket size

css('cursor', `
@media (hover: hover) and (pointer: fine) {
  ${LIVE}.fx-cursor-on, ${LIVE}.fx-cursor-on body, ${LIVE}.fx-cursor-on :is(a, button, summary, [role="button"], label, select, input[type="range"], input[type="checkbox"], input[type="radio"]) { cursor: none; }
  ${LIVE}.fx-cursor-on :is(${TEXT}) { cursor: auto; }
  ${LIVE}.fx-cursor-on :is(${TEXT}) :is(a[href], button) { cursor: none; }
  ${LIVE}.fx-cursor-on :is(${TEXT_ENTRY}) { cursor: text; }
}
.fx-cursor { position: fixed; inset: 0; pointer-events: none; z-index: var(--z-fx, 60); contain: strict; opacity: 0; transition: opacity 150ms ease-out; }
.fx-cursor[data-on] { opacity: 1; }
.fx-cursor > * { position: absolute; left: 0; top: 0; will-change: transform; }
.fx-c-k { width: ${C}px; height: ${C}px; border: 0 solid var(--color-accent, #6ef); transition: opacity 150ms ease-out; }
.fx-c-k[data-k="0"] { border-top-width: 1.5px; border-left-width: 1.5px; }
.fx-c-k[data-k="1"] { border-top-width: 1.5px; border-right-width: 1.5px; }
.fx-c-k[data-k="2"] { border-bottom-width: 1.5px; border-right-width: 1.5px; }
.fx-c-k[data-k="3"] { border-bottom-width: 1.5px; border-left-width: 1.5px; }
.fx-c-dot { width: 4px; height: 4px; margin: -2px 0 0 -2px; border-radius: 50%; background: var(--color-text, #e8edf3); transition: opacity 150ms ease-out; }
.fx-c-blob { width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in oklab, var(--color-accent, #6ef) 30%, transparent), transparent);
  mix-blend-mode: screen; transition: opacity 150ms ease-out; }
.fx-cursor[data-mode="text"] > *, .fx-cursor[data-mode="entry"] > * { opacity: 0; }
.fx-cursor[data-mode="lock"] .fx-c-dot { opacity: 0.5; }
.fx-cursor[data-mode="lock"] .fx-c-blob { opacity: 0.6; }
`);

function spring(p, v, target, k, dt) {
  // Critically damped: c = 2·sqrt(k). Semi-implicit Euler, stable for dt ≤ 1/30.
  const c = 2 * Math.sqrt(k);
  const a = k * (target - p) - c * v;
  v += a * dt;
  return [p + v * dt, v];
}

export function startCursor({ gsap }) {
  const layer = document.getElementById('fx-layer') ?? document.body;
  const root = document.createElement('div');
  root.className = 'fx-cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `<i class="fx-c-blob"></i>${[0, 1, 2, 3].map((k) => `<i class="fx-c-k" data-k="${k}"></i>`).join('')}<i class="fx-c-dot"></i>`;
  layer.append(root);
  const blob = root.querySelector('.fx-c-blob');
  const dot = root.querySelector('.fx-c-dot');
  const ks = [...root.querySelectorAll('.fx-c-k')];
  const html = document.documentElement;
  html.classList.add('fx-cursor-on');

  let px = -100, py = -100, seen = false, pressed = false, paletteOpen = false;
  let mode = 'idle';
  let lockEl = null;
  let lastTarget = null;
  const corners = ks.map(() => ({ x: -100, y: -100, vx: 0, vy: 0 }));
  const b = { x: -100, y: -100, vx: 0, vy: 0 };
  let radius = 0;

  const setMode = (m) => {
    if (m === mode) return;
    mode = m;
    root.dataset.mode = m;
  };

  const classify = (t) => {
    if (!(t instanceof Element)) return setMode('idle');
    if (t.closest(TEXT_ENTRY)) { lockEl = null; return setMode('entry'); }
    const hit = t.closest(INTERACTIVE);
    if (hit) {
      const r = hit.getBoundingClientRect();
      if (r.width * r.height < innerWidth * innerHeight * 0.4) {
        lockEl = hit;
        const cs = getComputedStyle(hit);
        radius = Math.min(12, (parseFloat(cs.borderTopLeftRadius) || 0) + PAD);
        ks.forEach((k, i) => {
          const prop = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'][i];
          k.style[prop] = `${radius}px`;
        });
        return setMode('lock');
      }
    }
    lockEl = null;
    ks.forEach((k) => { k.style.borderRadius = ''; });
    if (t.closest(TEXT)) return setMode('text');
    return setMode('idle');
  };

  const show = (on) => {
    if (on && seen && !paletteOpen) root.dataset.on = '';
    else delete root.dataset.on;
  };

  const onMove = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') { show(false); return; }
    px = e.clientX; py = e.clientY;
    if (!seen) {
      seen = true;
      corners.forEach((c) => { c.x = px; c.y = py; });
      b.x = px; b.y = py;
    }
    if (e.target !== lastTarget) { lastTarget = e.target; classify(e.target); }
    show(true);
  };
  const onDown = (e) => { if (e.pointerType === 'mouse') pressed = true; };
  const onUp = () => { pressed = false; };
  const onLeave = (e) => { if (!e.relatedTarget) show(false); };
  const onPalette = (e) => {
    paletteOpen = !!e.detail?.open;
    html.classList.toggle('fx-cursor-on', !paletteOpen);
    show(!paletteOpen);
  };
  let rehit = false;
  const onScroll = () => { rehit = true; };

  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  addEventListener('pointerup', onUp, { passive: true });
  document.addEventListener('mouseout', onLeave);
  document.addEventListener('vd:palette', onPalette);
  addEventListener('scroll', onScroll, { passive: true });

  const tick = (_t, dtMs) => {
    if (!seen) return;
    const dt = Math.min(dtMs, 50) / 1000;
    if (rehit) {
      // Content moved under a still pointer: hit-test once for this frame.
      rehit = false;
      const t = document.elementFromPoint(px, py);
      if (t && t !== lastTarget && !root.contains(t)) { lastTarget = t; classify(t); }
    }
    // Targets for the four brackets.
    let x0, y0, x1, y1;
    if (mode === 'lock' && lockEl?.isConnected) {
      const r = lockEl.getBoundingClientRect(); // one read per frame, before any write
      const s = pressed ? 0.96 : 1;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hw = (r.width / 2 + PAD) * s, hh = (r.height / 2 + PAD) * s;
      x0 = cx - hw; y0 = cy - hh; x1 = cx + hw - C; y1 = cy + hh - C;
    } else {
      const h = pressed ? 7 : 11;
      x0 = px - h; y0 = py - h; x1 = px + h - C; y1 = py + h - C;
    }
    const T = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const steps = dt > 1 / 60 ? 2 : 1;
    const sdt = dt / steps;
    for (let s = 0; s < steps; s++) {
      corners.forEach((c, i) => {
        [c.x, c.vx] = spring(c.x, c.vx, T[i][0], 900, sdt);
        [c.y, c.vy] = spring(c.y, c.vy, T[i][1], 900, sdt);
      });
      [b.x, b.vx] = spring(b.x, b.vx, px, 160, sdt);
      [b.y, b.vy] = spring(b.y, b.vy, py, 160, sdt);
    }
    // Writes.
    corners.forEach((c, i) => { ks[i].style.transform = `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0)`; });
    dot.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    const sp = Math.hypot(b.vx, b.vy);
    const st = 1 + Math.min(sp / 3000, 0.5);
    const ang = Math.atan2(b.vy, b.vx);
    blob.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) rotate(${ang.toFixed(3)}rad) scale(${st.toFixed(3)}, ${(1 / st).toFixed(3)})`;
  };
  gsap.ticker.add(tick);

  // Rebind cursor targets after a boosted swap (old element may be gone).
  const onPage = () => { lastTarget = null; lockEl = null; setMode('idle'); };
  document.addEventListener('vd:page', onPage);

  return () => {
    gsap.ticker.remove(tick);
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerdown', onDown);
    removeEventListener('pointerup', onUp);
    document.removeEventListener('mouseout', onLeave);
    document.removeEventListener('vd:palette', onPalette);
    document.removeEventListener('vd:page', onPage);
    removeEventListener('scroll', onScroll);
    html.classList.remove('fx-cursor-on');
    root.remove();
  };
}
