// Hero: a GPU neural field. A jittered grid of points and the edges between neighbours,
// displaced on the GPU by simplex terrain + curl drift + idle breathing, a pointer lens
// and a click shock ring; signal pulses travel along ~12% of the edges; a scan band sweeps
// the depth axis. Bloom + chromatic aberration + vignette + grain via postprocessing.
// Colors come from CSS tokens. Everything per frame happens in the vertex shader: the CPU
// only writes a handful of uniforms.
//
// Budget: 2 scene draws + post (mid/high: bloom mip chain + 1 effect pass; low: 1 pass).
// Adaptive: DPR steps 1.75 → 1 by measured frame time, then quality tier steps down.
// Paused off-screen and in hidden tabs. Fully disposed on unmount (context released).

import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, ChromaticAberrationEffect,
  VignetteEffect, NoiseEffect, BlendFunction,
} from 'postprocessing';
import { token, cssColor } from '../fx/runtime.js';
import { css } from '../fx/styles.js';

css('field', `
#hero-stage > canvas.fx-field { position: absolute; inset: 0; width: 100%; height: 100%; display: block; opacity: 0; }
#hero-stage .fx-field-debug {
  position: absolute; inset-inline-start: 12px; inset-block-start: 12px; margin: 0; pointer-events: none;
  font: 10px/1.6 var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums; white-space: pre;
  color: var(--color-accent-text, var(--color-accent, #6ef));
  background: color-mix(in oklab, var(--color-bg, #000) 70%, transparent); padding: 6px 8px; border-radius: 4px;
  border: 1px solid color-mix(in oklab, var(--color-accent, #6ef) 40%, transparent);
}
`);

export const TIERS = [
  { name: 'low', nx: 84, nz: 52, link: 0.42, diag: 0.06, bloom: false, ca: false, size: 1.5 },
  { name: 'mid', nx: 128, nz: 78, link: 0.48, diag: 0.08, bloom: true, ca: true, size: 1.25 },
  { name: 'high', nx: 172, nz: 104, link: 0.52, diag: 0.1, bloom: true, ca: true, size: 1.05 },
];
const X = 9;            // half-width of the field
const Z0 = -16, Z1 = 4; // depth range
const DPR_MAX = Math.min(1.75, window.devicePixelRatio || 1);

/* ---------- shaders (editable .glsl files, fetched once and HTTP-cached) ---------- */

let shaders;
function loadShaders() {
  const base = new URL('../../shaders/', import.meta.url);
  shaders ??= Promise.all(['noise', 'field.vert', 'field.frag', 'lines.vert', 'lines.frag', 'sky.frag'].map((n) =>
    fetch(new URL(`${n}.glsl`, base)).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${n}.glsl ${r.status}`)))),
  )).then(([noise, fv, ff, lv, lf, sky]) => ({
    skyFrag: sky,
    fieldVert: fv.replace(/^#include <noise>$/m, noise),
    fieldFrag: ff,
    linesVert: lv.replace(/^#include <noise>$/m, noise),
    linesFrag: lf,
  }));
  return shaders;
}

/* ---------- deterministic geometry ---------- */

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGeometry(tier) {
  const { nx, nz } = tier;
  const r = rng(421);
  const n = nx * nz;
  const rest = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const dx = (2 * X) / (nx - 1);
  const dz = (Z1 - Z0) / (nz - 1);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      rest[k * 3] = -X + i * dx + (r() - 0.5) * dx * 0.8;
      rest[k * 3 + 1] = 0;
      rest[k * 3 + 2] = Z0 + j * dz + (r() - 0.5) * dz * 0.8;
      seed[k] = r();
    }
  }
  const points = new THREE.BufferGeometry();
  const restAttr = new THREE.BufferAttribute(rest, 3);
  points.setAttribute('position', restAttr);
  points.setAttribute('aRest', restAttr);
  points.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const segs = [];
  const link = (a, b) => segs.push(a, b);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (i < nx - 1 && r() < tier.link) link(k, k + 1);
      if (j < nz - 1 && r() < tier.link) link(k, k + nx);
      if (i < nx - 1 && j < nz - 1 && r() < tier.diag) link(k, k + nx + 1);
    }
  }
  const m = segs.length; // vertices
  const lr = new Float32Array(m * 3);
  const lo = new Float32Array(m * 3);
  const le = new Float32Array(m);
  const ls = new Float32Array(m);
  for (let v = 0; v < m; v += 2) {
    const a = segs[v], b = segs[v + 1];
    const s = r();
    for (let c = 0; c < 3; c++) {
      lr[v * 3 + c] = rest[a * 3 + c]; lo[v * 3 + c] = rest[b * 3 + c];
      lr[(v + 1) * 3 + c] = rest[b * 3 + c]; lo[(v + 1) * 3 + c] = rest[a * 3 + c];
    }
    le[v] = 0; le[v + 1] = 1;
    ls[v] = s; ls[v + 1] = s;
  }
  const lines = new THREE.BufferGeometry();
  const lrAttr = new THREE.BufferAttribute(lr, 3);
  lines.setAttribute('position', lrAttr);
  lines.setAttribute('aRest', lrAttr);
  lines.setAttribute('aOther', new THREE.BufferAttribute(lo, 3));
  lines.setAttribute('aEnd', new THREE.BufferAttribute(le, 1));
  lines.setAttribute('aSeed', new THREE.BufferAttribute(ls, 1));
  return { points, lines, pointCount: n, segmentCount: m / 2 };
}

function initialTier() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (coarse || cores <= 4 || mem <= 4) return 0;
  if (cores >= 8 && innerWidth >= 1280) return 2;
  return 1;
}

/* ---------- mount ---------- */

export function mount(stage, ctx) {
  let dead = false;
  let teardown = null;
  loadShaders()
    .then((src) => { if (!dead) teardown = start(stage, ctx, src); })
    .catch((err) => console.warn('[fx] field disabled:', err));
  return () => { dead = true; teardown?.(); };
}

function start(stage, ctx, src) {
  const { gsap } = ctx;
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-field';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('[fx] field: no WebGL2 context', err);
    return () => {};
  }
  if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
  const posters = [...stage.children];
  stage.append(canvas);

  const srgb = (name, fb) => new THREE.Color().setRGB(...cssColor(token(name), fb), THREE.SRGBColorSpace);
  const colors = {
    bg: srgb('--color-bg', '#05070a'),
    base: srgb('--color-text-tertiary', '#5d6673'),
    accent: srgb('--color-accent', '#5cf2d6'),
    line: srgb('--color-border-strong', '#2a3340'),
    hot: srgb('--color-text', '#eef3f8'),
  };
  // Clear to black (invariant under any colour-space conversion) and paint the background
  // token with a full-screen quad, whose uniform colour goes through the same pipeline
  // as the field itself, so the canvas matches the page exactly.
  renderer.setClearColor(0x000000, 1);
  renderer.info.autoReset = false; // count every pass of a frame, not just the last

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  const shared = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uPointer: { value: new THREE.Vector3(0, 0, -2) },
    uPointerOn: { value: 0 },
    uPulse: { value: 0 },
    uDebug: { value: 0 },
    uSafe: { value: new THREE.Vector4(2, 2, 2, 2) }, // off-screen until measured
  };
  const pointMat = new THREE.ShaderMaterial({
    vertexShader: src.fieldVert,
    fragmentShader: src.fieldFrag,
    uniforms: {
      ...shared,
      uPixelRatio: { value: 1 },
      uSize: { value: 1.2 },
      uScanZ: { value: 0 },
      uColorBase: { value: colors.base },
      uColorAccent: { value: colors.accent },
      uColorHot: { value: colors.hot },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
  const lineMat = new THREE.ShaderMaterial({
    vertexShader: src.linesVert,
    fragmentShader: src.linesFrag,
    uniforms: { ...shared, uColorLine: { value: colors.line }, uColorAccent: { value: colors.accent } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });

  const skyMat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: src.skyFrag,
    uniforms: { uColorBg: { value: colors.bg }, uColorAccent: { value: colors.accent }, uHorizon: { value: 0.62 }, uScroll: shared.uScroll },
    depthTest: false,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  const q = new URLSearchParams(location.search).get('fx-tier');
  const forced = q === null ? NaN : Number(q);
  let tierIdx = Number.isInteger(forced) && TIERS[forced] ? forced : initialTier();
  let geo = null;
  let pointsObj = null;
  let linesObj = null;
  const setTier = (i) => {
    tierIdx = i;
    const tier = TIERS[i];
    if (pointsObj) { scene.remove(pointsObj, linesObj); geo.points.dispose(); geo.lines.dispose(); }
    geo = buildGeometry(tier);
    pointsObj = new THREE.Points(geo.points, pointMat);
    linesObj = new THREE.LineSegments(geo.lines, lineMat);
    pointsObj.frustumCulled = false;
    linesObj.frustumCulled = false;
    linesObj.renderOrder = 0;
    pointsObj.renderOrder = 1;
    scene.add(linesObj, pointsObj);
    pointMat.uniforms.uSize.value = tier.size;
    buildPost();
  };

  /* ---------- post ---------- */
  let composer = null;
  let bloom = null;
  let ca = null;
  const buildPost = () => {
    composer?.dispose();
    composer = null;
    const tier = TIERS[tierIdx];
    const debug = shared.uDebug.value > 0.5;
    // Low tier and debug render straight to the canvas: no extra full-screen passes.
    // (The shaders end in <colorspace_fragment>, so colours match either way.)
    if (!tier.bloom || debug) { bloom = null; ca = null; resize(); return; }
    composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    composer.addPass(new RenderPass(scene, camera));
    const effects = [];
    bloom = null;
    ca = null;
    bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.9, luminanceSmoothing: 0.12, intensity: 0.85, radius: 0.6, levels: 5 });
    effects.push(bloom);
    effects.push(new VignetteEffect({ offset: 0.32, darkness: 0.62 }));
    const grain = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SCREEN });
    grain.blendMode.opacity.value = 0.18;
    effects.push(grain);
    if (tier.ca) {
      ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0005, 0.0003), radialModulation: true, modulationOffset: 0.25 });
      effects.push(ca);
    }
    composer.addPass(new EffectPass(camera, ...effects));
    resize();
  };

  /* ---------- size / DPR ---------- */
  let dpr = Math.min(DPR_MAX, 1.5);
  let w = 1, h = 1;
  const resize = () => {
    const r = stage.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer?.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the field filling the frame on portrait screens.
    camera.fov = w / h < 1 ? 58 : 42;
    camera.updateProjectionMatrix();
    pointMat.uniforms.uPixelRatio.value = dpr;
    // Text-safe zone: the hero copy box, in the stage's NDC.
    const copy = stage.parentElement?.querySelector('.hero__inner, [data-hero-copy]');
    if (copy) {
      const c = copy.getBoundingClientRect();
      const sx = (x) => ((x - r.left) / r.width) * 2 - 1;
      const sy = (y) => -(((y - r.top) / r.height) * 2 - 1);
      shared.uSafe.value.set(sx(c.left), sy(c.bottom), sx(c.right), sy(c.top));
    }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  /* ---------- input ---------- */
  const ndc = new THREE.Vector2(0, -0.2);
  const target = new THREE.Vector3(0, 0, -2);
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2);
  let pointerIn = 0;
  let lastMove = 0;
  let vel = 0;
  let rect = stage.getBoundingClientRect();
  const onMove = (e) => {
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    vel = Math.min(1, vel + Math.hypot(nx - ndc.x, ny - ndc.y) * 2);
    ndc.set(nx, ny);
    pointerIn = nx > -1 && nx < 1 && ny > -1 && ny < 1 ? 1 : 0;
    lastMove = performance.now();
  };
  const onDown = (e) => {
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
    shared.uPulse.value = 1;
  };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });

  /* ---------- debug (konami) ---------- */
  let dbg = null;
  const onKonami = () => {
    const on = document.documentElement.hasAttribute('data-debug-render');
    shared.uDebug.value = on ? 1 : 0;
    buildPost();
    if (on && !dbg) {
      dbg = document.createElement('pre');
      dbg.className = 'fx-field-debug';
      dbg.setAttribute('aria-hidden', 'true');
      stage.append(dbg);
    } else if (!on) { dbg?.remove(); dbg = null; }
  };
  document.addEventListener('vd:konami', onKonami);

  /* ---------- loop ---------- */
  let visible = true;
  let running = false;
  let first = true;
  let t = 0;
  let win = [];
  let cooldown = 90;
  let fast = 0;
  let slow = 0;
  const camPos = new THREE.Vector3(0, 2.1, 5.4);
  const look = new THREE.Vector3(0, 0, -3);
  let px = 0, py = 0;
  let scrollP = 0;

  const adapt = (dt) => {
    if (cooldown > 0) { cooldown--; return; }
    win.push(dt);
    if (win.length < 45) return;
    const avg = win.reduce((a, b) => a + b, 0) / win.length;
    win = [];
    if (avg > 21) {
      if (dpr > 1) dpr = Math.max(1, Math.round((dpr - 0.25) * 4) / 4);
      else if (tierIdx > 0) { setTier(tierIdx - 1); }
      else {
        // Floor reached. A device that still cannot hold ~25 fps gets the static poster
        // instead of a stuttering scene (unless a tier was forced for testing).
        slow = avg > 40 ? slow + 1 : 0;
        if (slow >= 3 && !Number.isInteger(forced)) retire();
        return;
      }
      resize();
      cooldown = 60;
      fast = 0;
    } else if (avg < 12.5 && dpr < DPR_MAX) {
      if (++fast >= 3) { dpr = Math.min(DPR_MAX, dpr + 0.25); resize(); cooldown = 60; fast = 0; }
    } else fast = 0;
  };

  let broken = false;
  const frame = (_time, dtMs) => {
    if (broken) return;
    try { step(dtMs); } catch (err) {
      // A failing scene must never spam or break the page: stop, show the poster.
      broken = true;
      console.warn('[fx] field stopped:', err);
      gsap.ticker.remove(frame);
      canvas.style.opacity = '0';
      for (const p of posters) p.style.opacity = '';
    }
  };
  const step = (dtMs) => {
    const dt = Math.min(dtMs, 66) / 1000;
    t += dt;
    rect = stage.getBoundingClientRect(); // the only DOM read per frame
    scrollP += (Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height))) - scrollP) * 0.12;
    const u = shared;
    u.uTime.value = t;
    u.uScroll.value = scrollP;
    pointMat.uniforms.uScanZ.value = Z1 - ((t / 7.5) % 1) * (Z1 - Z0 + 4);

    // Pointer on the ground plane, eased; lens fades out when the pointer rests or leaves.
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, target)) u.uPointer.value.lerp(target, 0.12);
    const resting = performance.now() - lastMove > 2500;
    u.uPointerOn.value += ((pointerIn && !resting ? 1 : 0.25 * pointerIn) - u.uPointerOn.value) * 0.06;
    u.uPulse.value = Math.max(0, u.uPulse.value - dt * 0.9);
    vel *= 0.92;
    if (ca) ca.offset.set(0.0005 + vel * 0.0016, 0.0003 + vel * 0.001);

    // Camera: slow orbit, pointer parallax, rises and tilts down as the hero scrolls away.
    px += (ndc.x * pointerIn - px) * 0.04;
    py += (ndc.y * pointerIn - py) * 0.04;
    camPos.set(Math.sin(t * 0.05) * 0.6 + px * 0.45, 2.1 + scrollP * 1.6 + py * 0.2, 5.4 - scrollP * 1.2);
    camera.position.copy(camPos);
    look.set(px * 0.6, -scrollP * 0.8, -3);
    camera.lookAt(look);

    renderer.info.reset();
    if (composer) composer.render(dt);
    else renderer.render(scene, camera);

    if (first) {
      first = false;
      gsap.to(canvas, { opacity: 1, duration: 0.6, ease: 'vd-out' });
      for (const p of posters) gsap.to(p, { opacity: 0, duration: 0.6, ease: 'vd-out' });
      stage.dataset.webglReady = '';
    }
    adapt(dtMs);
    if (dbg) {
      const i = renderer.info.render;
      dbg.textContent = `DEBUG RENDER\ntier    ${TIERS[tierIdx].name}\ndpr     ${dpr.toFixed(2)}\npoints  ${geo.pointCount}\nedges   ${geo.segmentCount}\ndraws   ${i.calls}\nframe   ${dtMs.toFixed(1)} ms`;
    }
  };

  const retire = () => {
    broken = true;
    gsap.ticker.remove(frame);
    gsap.to(canvas, { opacity: 0, duration: 0.6, ease: 'vd-out' });
    for (const p of posters) gsap.to(p, { opacity: 1, duration: 0.6, ease: 'vd-out', clearProps: 'opacity' });
    stage.dataset.webglState = 'poster';
  };

  const sync = () => {
    const should = visible && !document.hidden;
    if (should === running || broken) return;
    running = should;
    if (should) gsap.ticker.add(frame);
    else gsap.ticker.remove(frame);
  };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
  io.observe(stage);
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);

  const onLost = (e) => {
    e.preventDefault();
    running = true; visible = false; sync();
    canvas.style.opacity = '0';
    for (const p of posters) p.style.opacity = '';
  };
  canvas.addEventListener('webglcontextlost', onLost);

  setTier(tierIdx);
  if (document.documentElement.hasAttribute('data-debug-render')) onKonami();
  sync();

  // Expose per-frame work for diagnostics.
  stage.fxField = {
    get tier() { return TIERS[tierIdx].name; },
    get dpr() { return dpr; },
    get points() { return geo.pointCount; },
    get edges() { return geo.segmentCount; },
    get draws() { return renderer.info.render.calls; },
  };

  return () => {
    running = true; visible = false; sync();
    io.disconnect();
    ro.disconnect();
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerdown', onDown);
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('vd:konami', onKonami);
    canvas.removeEventListener('webglcontextlost', onLost);
    gsap.killTweensOf(canvas);
    for (const p of posters) { gsap.killTweensOf(p); p.style.opacity = ''; }
    delete stage.dataset.webglReady;
    delete stage.dataset.webglState;
    delete stage.fxField;
    dbg?.remove();
    composer?.dispose();
    geo?.points.dispose();
    geo?.lines.dispose();
    pointMat.dispose();
    lineMat.dispose();
    skyMat.dispose();
    sky.geometry.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
}
