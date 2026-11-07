// Boot sequence: a terminal cold-boot that decodes real page data, then hands off to the
// interface, which assembles piece by piece. ~2.2 s, skippable by any key, any click or
// the Skip button. Decorative: #boot is aria-hidden and the page underneath is already
// in the DOM and reachable; focus is never moved or trapped.
//
// Runs on its own short rAF loop on purpose: it must start before the CDN libraries
// arrive (GSAP is not loaded yet on a cold first visit). It stops for good when done.

import { css } from './styles.js';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>[]{}=+*#%&_-';
const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.4, 0, 0.2, 1)';

const text = (sel) => document.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() || '';

function collect() {
  let data = {};
  try { data = JSON.parse(document.getElementById('vd-data')?.textContent || '{}'); } catch { /* none */ }
  const site = data.site ?? {};
  const name = site.name
    || text('[data-boot="name"]')
    || document.querySelector('meta[name="author"]')?.content
    || text('#site-header [data-brand]')
    || text('#main h1');
  let roles = Array.isArray(site.roles) ? site.roles.slice() : [];
  if (!roles.length) roles = [...document.querySelectorAll('[data-boot="role"]')].map((n) => n.textContent.trim()).filter(Boolean);
  if (!roles.length) roles = [...document.querySelectorAll('[data-roles] li')].map((n) => n.textContent.trim()).filter(Boolean);
  const build = text('[data-hud="build"]');
  const region = text('[data-hud="region"]');
  const projects = (Array.isArray(data.projects) && data.projects.length) || document.querySelectorAll('#work [data-fx-track] > *').length;
  const base = site.location || '';
  let gl = 'unavailable';
  if ('WebGL2RenderingContext' in window) gl = navigator.connection?.saveData ? 'skipped (save-data)' : 'webgl2';
  const vw = `${innerWidth}×${innerHeight} @${Math.round(devicePixelRatio * 100) / 100}x`;
  return { name, roles, build, region, projects, gl, vw, base };
}

css('boot', `
#boot.fx-boot {
  position: fixed; inset: 0; z-index: var(--z-boot, 90);
  display: block; pointer-events: auto;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px; line-height: 1.75; letter-spacing: 0.01em;
  color: var(--color-text-secondary, #9aa4b2);
  font-variant-numeric: tabular-nums;
  contain: strict;
}
#boot .fx-boot-panel {
  position: absolute; inset: 0;
  background:
    linear-gradient(to bottom, transparent 0 calc(100% - 1px), color-mix(in oklab, var(--color-border, #223) 55%, transparent) 0) 0 0 / 100% 32px,
    linear-gradient(to right, transparent 0 calc(100% - 1px), color-mix(in oklab, var(--color-border, #223) 35%, transparent) 0) 0 0 / 32px 100%,
    radial-gradient(120% 80% at 80% 10%, color-mix(in oklab, var(--color-accent, #6ef) 9%, transparent), transparent 60%),
    var(--color-bg, #05070a);
  clip-path: inset(0 0 0 0);
  display: grid;
  grid-template: "mark meta" auto "log log" 1fr "bar skip" auto / 1fr auto;
  gap: 16px 24px;
  padding: clamp(16px, 4vw, 48px);
}
#boot .fx-boot-panel::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(to bottom, oklch(1 0 0 / 0.025) 0 1px, transparent 1px 3px);
}
#boot .fx-boot-mark { grid-area: mark; color: var(--color-text, #e8edf3); letter-spacing: 0.2em; text-transform: uppercase; }
#boot .fx-boot-mark b { color: var(--color-accent-text, var(--color-accent, #6ef)); font-weight: 500; }
#boot .fx-boot-meta { grid-area: meta; text-align: end; color: var(--color-text-tertiary, #5d6673); }
#boot .fx-boot-log { grid-area: log; align-self: end; margin: 0; padding: 0; list-style: none; max-width: 92ch; }
#boot .fx-boot-log li { display: grid; grid-template-columns: 9ch 14ch 1fr; gap: 0 1ch; white-space: pre; overflow: hidden; text-overflow: ellipsis; opacity: 0; }
#boot .fx-boot-log li[data-on] { opacity: 1; }
#boot .fx-boot-log .t { color: var(--color-text-tertiary, #5d6673); }
#boot .fx-boot-log .k { color: var(--color-text-tertiary, #5d6673); }
#boot .fx-boot-log .v { color: var(--color-text, #e8edf3); overflow: hidden; text-overflow: ellipsis; }
#boot .fx-boot-log .ok { color: var(--color-accent-text, var(--color-accent, #6ef)); }
#boot .fx-boot-log li:last-child .v { color: var(--color-accent-text, var(--color-accent, #6ef)); }
#boot .fx-boot-bar { grid-area: bar; align-self: center; display: grid; grid-template-columns: repeat(32, 1fr); gap: 3px; max-width: 420px; height: 6px; }
#boot .fx-boot-bar i { background: color-mix(in oklab, var(--color-border-strong, #334) 70%, transparent); transition: background-color 100ms ease-out; }
#boot .fx-boot-bar i[data-on] { background: var(--color-accent, #6ef); box-shadow: 0 0 8px var(--color-accent-glow, transparent); }
#boot .fx-boot-skip {
  grid-area: skip; justify-self: end; position: relative;
  font: inherit; color: var(--color-text-secondary, #9aa4b2);
  background: transparent; border: 1px solid var(--color-border-strong, #334); border-radius: 6px;
  min-height: 32px; padding: 0 12px; cursor: pointer;
  transition-property: scale, color, border-color; transition-duration: 150ms; transition-timing-function: ease-out;
}
#boot .fx-boot-skip::after { content: ""; position: absolute; inset: -6px; }
#boot .fx-boot-skip kbd { font: inherit; color: var(--color-text-tertiary, #5d6673); margin-inline-start: 8px; }
@media (hover: hover) { #boot .fx-boot-skip:hover { color: var(--color-text, #e8edf3); border-color: var(--color-accent, #6ef); } }
#boot .fx-boot-skip:active { scale: 0.96; }
#boot .fx-boot-edge {
  position: absolute; left: 0; right: 0; top: 0; height: 1px; opacity: 0;
  background: var(--color-accent, #6ef);
  box-shadow: 0 0 12px 1px var(--color-accent-glow, var(--color-accent, #6ef));
}
@media (max-width: 40rem) {
  #boot .fx-boot-log li { grid-template-columns: 8ch 1fr; }
  #boot .fx-boot-log .k { display: none; }
}
`);

function scrambleInto(node, final, p) {
  if (p >= 1) { node.textContent = final; return; }
  const n = Math.floor(final.length * p);
  let out = final.slice(0, n);
  for (let i = n; i < final.length; i++) {
    const c = final[i];
    out += c === ' ' || c === '.' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
  }
  node.textContent = out;
}

export function runBoot(boot) {
  const t0 = performance.now();
  const d = collect();
  const html = document.documentElement;
  html.dataset.boot = 'run';

  // Real uplink check, raced against the boot clock.
  let uplink = 'checking';
  const ac = new AbortController();
  fetch('/api/status', { signal: ac.signal, headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((j) => { uplink = `${j.status ?? 'ok'}  · ask ${j.ask ?? '?'}`; })
    .catch(() => { uplink = 'no response'; });
  setTimeout(() => ac.abort(), 1400);

  const lines = [
    ['sys', 'VD/OS operator interface', 'cold boot'],
    d.name && ['identity', d.name, ''],
    d.roles.length && ['roles', d.roles.join(' / '), ''],
    d.base && ['base', d.base, ''],
    (d.build || d.region) && ['build', [d.build, d.region && `region ${d.region}`].filter(Boolean).join('  · '), ''],
    d.projects && ['index', `${d.projects} projects`, 'ok'],
    ['renderer', d.gl, d.gl === 'webgl2' ? 'ok' : ''],
    ['viewport', d.vw, ''],
    ['uplink', () => uplink, ''],
    ['handoff', 'interface', ''],
  ].filter(Boolean);

  boot.setAttribute('aria-hidden', 'true');
  boot.classList.add('fx-boot');
  boot.innerHTML = `
    <div class="fx-boot-panel">
      <div class="fx-boot-mark"><b>VD</b>/OS · 2035</div>
      <div class="fx-boot-meta">boot 01 · ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC</div>
      <ol class="fx-boot-log"></ol>
      <div class="fx-boot-bar">${'<i></i>'.repeat(32)}</div>
      <button type="button" class="fx-boot-skip" tabindex="-1">Skip<kbd>any key</kbd></button>
    </div>
    <div class="fx-boot-edge"></div>`;
  const panel = boot.querySelector('.fx-boot-panel');
  const log = boot.querySelector('.fx-boot-log');
  const cells = [...boot.querySelectorAll('.fx-boot-bar i')];
  const edge = boot.querySelector('.fx-boot-edge');
  const rows = lines.map(([k, v, s]) => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="t"></span><span class="k"></span><span class="v"></span>';
    log.append(li);
    return { li, k, v, s, t: li.children[0], kk: li.children[1], vv: li.children[2], start: 0, done: false };
  });
  boot.hidden = false;

  const STEP = 150;   // line cadence
  const DECODE = 220; // per-line decode
  rows.forEach((r, i) => { r.start = 120 + i * STEP; });
  const END = rows.at(-1).start + DECODE + 220;

  return new Promise((resolve) => {
    let raf = 0;
    let finished = false;
    const assembleTargets = () => {
      const out = [document.getElementById('site-header'), document.getElementById('hud')];
      const h1 = document.querySelector('#main h1');
      if (h1 && !/\bsplit\b/.test(h1.dataset.fx || '')) out.push(h1);
      out.push(document.getElementById('hero-stage'));
      return out.filter(Boolean);
    };

    const cleanup = () => {
      cancelAnimationFrame(raf);
      removeEventListener('keydown', skip, true);
      removeEventListener('pointerdown', skip, true);
      ac.abort();
    };

    const finish = (fast) => {
      if (finished) return;
      finished = true;
      cleanup();
      // Assemble the UI as the overlay leaves (opacity + 4px blur + 12px, 300 ms, 100 ms apart).
      assembleTargets().forEach((el, i) => {
        el.animate(
          [{ opacity: 0, filter: 'blur(4px)', translate: '0 12px' }, { opacity: 1, filter: 'blur(0px)', translate: '0 0' }],
          { duration: 300, delay: (fast ? 0 : 120) + i * 100, easing: EASE, fill: 'backwards' },
        );
      });
      const exit = fast
        ? panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: EASE, fill: 'forwards' })
        : panel.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 320, easing: EASE_IN_OUT, fill: 'forwards' });
      if (!fast) {
        edge.animate(
          [{ opacity: 1, translate: '0 100vh' }, { opacity: 1, translate: '0 0', offset: 0.92 }, { opacity: 0, translate: '0 0' }],
          { duration: 320, easing: EASE_IN_OUT, fill: 'forwards' },
        );
      }
      // Let the page bind its entrances as the overlay starts to leave.
      resolve();
      exit.finished.catch(() => {}).then(() => {
        boot.hidden = true;
        boot.classList.remove('fx-boot');
        boot.replaceChildren();
        boot.removeAttribute('style');
      });
    };

    const skip = (e) => {
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      finish(true);
    };
    addEventListener('keydown', skip, true);
    addEventListener('pointerdown', skip, true);
    boot.querySelector('.fx-boot-skip').addEventListener('click', () => finish(true));

    const frame = (now) => {
      const el = now - t0;
      for (const r of rows) {
        if (r.done || el < r.start) continue;
        const p = Math.min(1, (el - r.start) / DECODE);
        if (!r.li.dataset.on) {
          r.li.dataset.on = '';
          r.t.textContent = `[${(el / 1000).toFixed(3).padStart(6, ' ')}]`;
          r.kk.textContent = r.k.padEnd(12, '.');
        }
        const v = typeof r.v === 'function' ? r.v() : r.v;
        scrambleInto(r.vv, r.s ? `${v}  [${r.s}]` : v, p);
        if (p >= 1) r.done = true;
      }
      const prog = Math.min(1, el / END);
      const on = Math.round(prog * cells.length);
      for (let i = 0; i < cells.length; i++) {
        if (i < on) cells[i].dataset.on = ''; else delete cells[i].dataset.on;
      }
      if (el >= END) { finish(false); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Hard cap: never hold the page longer than 3 s, whatever the frame rate.
    setTimeout(() => finish(true), 3000);
  });
}
