// distort – WebGL hover distortion on <figure><img>. ONE shared WebGL2 context and canvas
// for the whole site: on hover the canvas moves over the hovered image, uploads its
// texture (cached, LRU of 6), and renders on the shared ticker only while hovered or
// easing out. The real <img> stays underneath and untouched; at rest the canvas is
// transparent to the eye (identity distortion) and hidden.

import { css } from '../fx/styles.js';

css('distort', `
canvas.fx-distort { position: absolute; pointer-events: none; opacity: 0; transition: opacity 150ms ease-out; z-index: 1; }
canvas.fx-distort[data-on] { opacity: 1; }
`);

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(aPos, 0.0, 1.0); }`;

let R = null;       // shared renderer
let fragSrc = null;

async function renderer() {
  if (R) return R;
  fragSrc ??= fetch(new URL('../../shaders/distort.frag.glsl', import.meta.url)).then((r) => (r.ok ? r.text() : Promise.reject(new Error('distort.frag.glsl'))));
  const frag = await fragSrc;
  if (R) return R;
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-distort';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, antialias: false, alpha: true });
  if (!gl) throw new Error('no webgl2');
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(['uTex', 'uPointer', 'uVel', 'uHover', 'uTime', 'uCover'].map((n) => [n, gl.getUniformLocation(prog, n)]));
  gl.uniform1i(u.uTex, 0);
  R = { canvas, gl, u, textures: new Map(), owner: null };
  return R;
}

function texture(img) {
  const { gl, textures } = R;
  if (textures.has(img)) {
    const t = textures.get(img);
    textures.delete(img); textures.set(img, t); // LRU touch
    gl.bindTexture(gl.TEXTURE_2D, t);
    return t;
  }
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); // throws if tainted
  textures.set(img, t);
  while (textures.size > 6) {
    const [k, v] = textures.entries().next().value;
    gl.deleteTexture(v);
    textures.delete(k);
  }
  return t;
}

export function distort(figure, { gsap }) {
  const img = figure.querySelector('img');
  if (!img) return undefined;
  const st = { hover: 0, px: 0.5, py: 0.5, vx: 0, vy: 0, t: 0 };
  let active = false;
  let lastX = 0, lastY = 0, lastT = 0;
  let box = null;
  let tween = null;

  const frame = (_t, dtMs) => {
    if (!R || R.owner !== figure) return;
    const { gl, u } = R;
    st.t += dtMs / 1000;
    st.vx *= 0.9; st.vy *= 0.9;
    gl.uniform2f(u.uPointer, st.px, st.py);
    gl.uniform2f(u.uVel, st.vx, st.vy);
    gl.uniform1f(u.uHover, st.hover);
    gl.uniform1f(u.uTime, st.t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const place = () => {
    const fr = figure.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    box = ir;
    const { canvas, gl, u } = R;
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(ir.width * dpr));
    canvas.height = Math.max(1, Math.round(ir.height * dpr));
    Object.assign(canvas.style, {
      left: `${ir.left - fr.left - figure.clientLeft}px`, top: `${ir.top - fr.top - figure.clientTop}px`,
      width: `${ir.width}px`, height: `${ir.height}px`, borderRadius: getComputedStyle(img).borderRadius,
    });
    gl.viewport(0, 0, canvas.width, canvas.height);
    // object-fit: cover → crop UVs to the box aspect.
    const fit = getComputedStyle(img).objectFit;
    const ia = img.naturalWidth / img.naturalHeight;
    const ba = ir.width / ir.height;
    let sx = 1, sy = 1;
    if (fit === 'cover') { if (ia > ba) sx = ba / ia; else sy = ia / ba; }
    gl.uniform2f(u.uCover, sx, sy);
  };

  const enter = async (e) => {
    if (e.pointerType !== 'mouse' || !img.complete || !img.naturalWidth) return;
    try { await renderer(); } catch (err) { console.warn('[fx] distort disabled:', err); return; }
    if (!figure.matches(':hover')) return;
    if (getComputedStyle(figure).position === 'static') figure.style.position = 'relative';
    try { texture(img); } catch { return; } // cross-origin image without CORS: skip
    if (R.owner && R.owner !== figure) R.release?.();
    R.owner = figure;
    R.release = release;
    figure.append(R.canvas);
    place();
    if (!active) { active = true; gsap.ticker.add(frame); }
    R.canvas.dataset.on = '';
    tween?.kill();
    tween = gsap.to(st, { hover: 1, duration: 0.5, ease: 'vd-out' });
  };
  const move = (e) => {
    if (!box) return;
    const now = performance.now();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    const dt = Math.max(8, now - lastT) / 1000;
    if (lastT) { st.vx = (x - lastX) / dt; st.vy = (y - lastY) / dt; }
    lastX = x; lastY = y; lastT = now;
    gsap.to(st, { px: x, py: y, duration: 0.25, ease: 'power3.out', overwrite: 'auto' });
  };
  const release = () => {
    tween?.kill();
    if (active) { active = false; gsap.ticker.remove(frame); }
    st.hover = 0;
    if (R?.owner === figure) { delete R.canvas.dataset.on; R.owner = null; }
  };
  const leave = () => {
    box = null; lastT = 0;
    tween?.kill();
    tween = gsap.to(st, { hover: 0, duration: 0.3, ease: 'vd-out', onComplete: release });
  };
  const onScroll = () => { if (box && R?.owner === figure) box = img.getBoundingClientRect(); };

  figure.addEventListener('pointerenter', enter);
  figure.addEventListener('pointermove', move, { passive: true });
  figure.addEventListener('pointerleave', leave);
  addEventListener('scroll', onScroll, { passive: true });
  return () => {
    figure.removeEventListener('pointerenter', enter);
    figure.removeEventListener('pointermove', move);
    figure.removeEventListener('pointerleave', leave);
    removeEventListener('scroll', onScroll);
    release();
    if (R && R.canvas.parentNode === figure) R.canvas.remove();
    if (R?.textures.has(img)) { R.gl.deleteTexture(R.textures.get(img)); R.textures.delete(img); }
    gsap.killTweensOf(st);
  };
}
