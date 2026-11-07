// Pointer-driven micro-interactions (fine pointers only; main.js checks).
//   magnetic – element is pulled toward the pointer (data-fx-strength, default 0.3)
//   tilt     – 3D tilt toward the pointer, max 6°, springs back without overshoot
// Both use gsap.quickTo on transforms only, and read the element box once per enter.

import { css, LIVE } from './styles.js';

css('pointer', `
${LIVE} .fx-tilt-glare {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(60% 60% at var(--fx-gx, 50%) var(--fx-gy, 50%), oklch(1 0 0 / 0.07), transparent 70%);
  opacity: 0; transition: opacity 150ms ease-out;
}
${LIVE} [data-fx~="tilt"][data-fx-hover] > .fx-tilt-glare { opacity: 1; }
`);

export function magnetic(el, { gsap }) {
  const strength = Math.min(1, Math.max(0, parseFloat(el.dataset.fxStrength ?? '0.3') || 0.3));
  const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
  let centre = null;
  // Untransformed centre, measured once per hover: the pull never feeds back on itself.
  const measure = () => {
    const r = el.getBoundingClientRect();
    centre = [r.left + r.width / 2 - (gsap.getProperty(el, 'x') || 0), r.top + r.height / 2 - (gsap.getProperty(el, 'y') || 0)];
  };
  const enter = () => measure();
  const move = (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!centre) measure();
    xTo((e.clientX - centre[0]) * strength);
    yTo((e.clientY - centre[1]) * strength);
  };
  const leave = () => { centre = null; xTo(0); yTo(0); };
  el.addEventListener('pointerenter', enter);
  el.addEventListener('pointermove', move, { passive: true });
  el.addEventListener('pointerleave', leave);
  const onScroll = () => { centre = null; };
  addEventListener('scroll', onScroll, { passive: true });
  return () => {
    el.removeEventListener('pointerenter', enter);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    removeEventListener('scroll', onScroll);
    gsap.set(el, { clearProps: 'transform' });
  };
}

const MAX = 6;

export function tilt(el, { gsap }) {
  gsap.set(el, { transformPerspective: 900, transformOrigin: '50% 50%' });
  const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' });
  const ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' });
  let glare = null;
  if (getComputedStyle(el).position !== 'static') {
    glare = document.createElement('span');
    glare.className = 'fx-tilt-glare';
    glare.setAttribute('aria-hidden', 'true');
    el.append(glare);
  }
  let rect = null;
  const enter = () => { rect = el.getBoundingClientRect(); el.dataset.fxHover = ''; };
  const move = (e) => {
    if (e.pointerType !== 'mouse') return;
    rect ??= el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;  // 0..1
    const ny = (e.clientY - rect.top) / rect.height;
    ry((nx - 0.5) * 2 * MAX);
    rx(-(ny - 0.5) * 2 * MAX);
    if (glare) {
      el.style.setProperty('--fx-gx', `${(nx * 100).toFixed(1)}%`);
      el.style.setProperty('--fx-gy', `${(ny * 100).toFixed(1)}%`);
    }
  };
  const leave = () => { rect = null; delete el.dataset.fxHover; rx(0); ry(0); };
  const onScroll = () => { rect = null; };
  el.addEventListener('pointerenter', enter);
  el.addEventListener('pointermove', move, { passive: true });
  el.addEventListener('pointerleave', leave);
  addEventListener('scroll', onScroll, { passive: true });
  return () => {
    el.removeEventListener('pointerenter', enter);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    removeEventListener('scroll', onScroll);
    glare?.remove();
    delete el.dataset.fxHover;
    el.style.removeProperty('--fx-gx');
    el.style.removeProperty('--fx-gy');
    gsap.set(el, { clearProps: 'transform' });
  };
}
