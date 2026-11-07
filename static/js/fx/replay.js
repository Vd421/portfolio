// Replay case study: the page plays like a session replay.
//
// Function (both modes, no motion needed):
//   scroll position ⇄ playhead. Each chapter's data-at is pinned to the moment the chapter
//   crosses the reading line, so the mapping is piecewise-linear and markers mean what
//   they say. Dragging or arrowing the range scrolls to the matching position. While the
//   user drives the range, scroll never writes back to it (no feedback loop).
//   Markers get data-state (passed|current|upcoming) and aria-current on the current one.
//
// Choreography (motion only):
//   a "recorded viewport" stage inside the player (aria-hidden): ghost cursor replaying a
//   path, click ripples, rage-click and AI-scan moments at the flags' data-at, REC dot,
//   SMPTE-style timecode, a timeline with chapter ticks and flag marks, an event stream.
//   Flags ahead of the playhead wait dimmed and pop in (opacity + 4px blur + 12px, 300 ms)
//   as the playhead crosses them; scrubbing back sends them out (150 ms).
//   Every stage visual is a pure function of t, so scrubbing is exact in both directions.

import { css, LIVE } from './styles.js';

const READ = 0.45; // reading line, fraction of the viewport height
const pad = (n) => String(Math.floor(n)).padStart(2, '0');
const mmss = (t) => `${pad(t / 60)}:${pad(t % 60)}`;
const smooth = (u) => u * u * (3 - 2 * u);
const easeIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

css('replay', `
${LIVE} .fx-replay [data-flag] { transform-origin: 0 50%; }
${LIVE} .fx-replay [data-flag][data-pending] { opacity: 0.8; filter: saturate(0.35); }
.fx-replay [data-replay-markers] li[data-state="current"] > a { font-weight: 600; }

.fx-rp { --rp-line: color-mix(in oklab, var(--color-border-strong, #334) 80%, transparent);
  display: grid; gap: 10px; margin-block-start: 16px;
  font: 11px/1.4 var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums;
  color: var(--color-text-tertiary, #5d6673); letter-spacing: 0.04em; }
.fx-rp-top { display: flex; align-items: center; gap: 12px; text-transform: uppercase; }
.fx-rp-rec { display: inline-flex; align-items: center; gap: 6px; color: var(--color-danger-text, var(--color-danger, #f55)); }
.fx-rp-rec i { width: 7px; height: 7px; border-radius: 50%; background: var(--color-danger, #f55); box-shadow: 0 0 8px var(--color-danger, #f55); }
@media (prefers-reduced-motion: no-preference) { ${LIVE} .fx-rp-rec i { animation: fx-rec 1.2s steps(1, end) infinite; } }
@keyframes fx-rec { 50% { opacity: 0.25; } }
.fx-rp-tc { color: var(--color-text, #e8edf3); font-size: 13px; letter-spacing: 0.06em; }
.fx-rp-meta { margin-inline-start: auto; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.fx-rp-view { position: relative; aspect-ratio: 16 / 10; max-height: 36vh; width: 100%; overflow: hidden; contain: strict;
  border-radius: 10px; border: 1px solid var(--rp-line);
  background:
    linear-gradient(to bottom, transparent 0 calc(100% - 1px), oklch(1 0 0 / 0.03) 0) 0 0 / 100% 16px,
    var(--color-bg-sunken, #030406);
  box-shadow: inset 0 0 0 1px oklch(1 0 0 / 0.02), 0 24px 64px -24px oklch(0 0 0 / 0.6); }
.fx-rp-app { position: absolute; inset: 7% 6%; display: grid; grid-template-rows: auto 1fr auto; gap: 7%; }
.fx-rp-nav { display: flex; gap: 4%; align-items: center; }
.fx-rp-nav i, .fx-rp-cards i, .fx-rp-row i, .fx-rp-btn, .fx-rp-field { display: block; border-radius: 4px; background: oklch(1 0 0 / 0.06); transition: background-color 150ms ease-out, box-shadow 150ms ease-out; }
.fx-rp-nav i { height: 7px; width: 12%; } .fx-rp-nav i:first-child { width: 7%; height: 10px; background: oklch(1 0 0 / 0.12); margin-inline-end: auto; }
.fx-rp-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5%; }
.fx-rp-cards i { border-radius: 6px; }
.fx-rp-row { display: grid; grid-template-columns: 1fr auto; gap: 4%; align-items: center; }
.fx-rp-field { height: 18px; }
.fx-rp-btn { height: 18px; width: 22%; min-width: 48px; background: color-mix(in oklab, var(--color-accent, #6ef) 35%, transparent); }
.fx-rp [data-hot] { background: color-mix(in oklab, var(--color-accent, #6ef) 22%, transparent); box-shadow: 0 0 0 1px color-mix(in oklab, var(--color-accent, #6ef) 60%, transparent); }
.fx-rp-btn[data-hot] { background: color-mix(in oklab, var(--color-accent, #6ef) 70%, transparent); }
.fx-rp-ghost { position: absolute; left: 0; top: 0; width: 16px; height: 20px; margin: -2px 0 0 -2px; filter: drop-shadow(0 2px 6px oklch(0 0 0 / 0.6)); will-change: transform; }
.fx-rp-ghost path { fill: var(--color-text, #e8edf3); stroke: var(--color-bg, #05070a); stroke-width: 1.2; }
.fx-rp-trail { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.fx-rp-trail polyline { fill: none; stroke: var(--color-accent, #6ef); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.55; }
.fx-rp-rip { position: absolute; left: 0; top: 0; width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 50%; border: 1.5px solid var(--color-accent, #6ef); opacity: 0; }
.fx-rp-rip[data-sev="warning"] { border-color: var(--color-warning, #fb3); }
.fx-rp-scan { position: absolute; top: 0; bottom: 0; left: 0; width: 30%; opacity: 0;
  background: linear-gradient(to right, transparent, color-mix(in oklab, var(--color-accent, #6ef) 22%, transparent) 85%, var(--color-accent, #6ef) 99%, transparent); }
.fx-rp-err { position: absolute; display: grid; align-content: end; padding: 6px; opacity: 0; border-radius: 6px;
  border: 1.5px solid var(--color-danger, #f55); background: color-mix(in oklab, var(--color-danger, #f55) 12%, transparent);
  box-shadow: 0 0 24px -4px var(--color-danger, #f55); }
.fx-rp-err span { justify-self: start; padding: 3px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--color-bg, #05070a); background: var(--color-danger, #f55); white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.fx-rp-warn { position: absolute; padding: 3px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0; white-space: nowrap;
  color: var(--color-bg, #05070a); background: var(--color-warning, #fb3); }
.fx-rp-tl { position: relative; height: 22px; }
.fx-rp-tl > b { position: absolute; left: 0; right: 0; top: 10px; height: 2px; border-radius: 1px; background: var(--rp-line); overflow: hidden; }
.fx-rp-tl > b i { position: absolute; inset: 0; background: var(--color-accent, #6ef); transform-origin: 0 50%; transform: scaleX(0); }
.fx-rp-tl .tick { position: absolute; top: 6px; width: 1px; height: 10px; background: var(--color-border-strong, #445); }
.fx-rp-tl .tick[data-on] { background: var(--color-accent, #6ef); }
.fx-rp-tl .fl { position: absolute; top: 5px; width: 8px; height: 8px; margin-left: -4px; rotate: 45deg; border-radius: 1px; background: var(--color-warning, #fb3); scale: 0.6; opacity: 0.45; transition-property: scale, opacity; transition-duration: 300ms; transition-timing-function: cubic-bezier(0.2, 0, 0, 1); }
.fx-rp-tl .fl[data-sev="error"] { background: var(--color-danger, #f55); }
.fx-rp-tl .fl[data-on] { scale: 1; opacity: 1; box-shadow: 0 0 10px currentColor; }
.fx-rp-tl .ph { position: absolute; left: 0; top: 0; width: 1px; height: 22px; background: var(--color-text, #e8edf3); will-change: transform; }
.fx-rp-tl .ph::after { content: ""; position: absolute; left: -3px; top: -2px; width: 7px; height: 7px; border-radius: 50%; background: var(--color-text, #e8edf3); }
.fx-rp-ev { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; min-height: calc(4 * 1.4em + 6px); }
.fx-rp-ev li { display: grid; grid-template-columns: 7ch 9ch 1fr; gap: 1ch; white-space: nowrap; overflow: hidden; }
.fx-rp-ev li:last-child { color: var(--color-text-secondary, #9aa4b2); }
.fx-rp-ev li[data-sev="warning"] { color: var(--color-warning-text, var(--color-warning, #fb3)); }
.fx-rp-ev li[data-sev="error"] { color: var(--color-danger-text, var(--color-danger, #f55)); }
/* Adopted into B's player stage */
.fx-rp-layers { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
.player__chrome .fx-rp-tc { font-family: var(--font-mono, ui-monospace, monospace); font-size: var(--text-label, 11px); font-variant-numeric: tabular-nums; color: var(--color-text, #e8edf3); letter-spacing: 0.06em; }
.fx-rp-ev--over { position: absolute; inset-inline: 0; inset-block-end: 0; z-index: 3; min-height: 0; padding: 18px 16px 8px;
  font: 10px/1.5 var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums; color: var(--color-text-tertiary, #5d6673);
  background: linear-gradient(to bottom, transparent, color-mix(in oklab, var(--color-bg-sunken, #030406) 92%, transparent) 16px); }
.fx-rp-ev--over li { grid-template-columns: 8ch 10ch 1fr; }
.fx-rp-ev--over li:nth-last-child(n + 3) { display: none; }
.fx-rp-ev--over:empty { display: none; }
.player__rail .fx-rp-fill { position: absolute; inset: 0; border-radius: inherit; background: var(--color-accent, #6ef); transform-origin: 0 50%; transform: scaleX(0); box-shadow: 0 0 8px var(--color-accent-glow, transparent); }
.player__rail .fx-rp-ph { position: absolute; left: 0; top: 50%; width: 1px; height: 14px; margin-top: -7px; background: var(--color-text, #e8edf3); will-change: transform; }
${LIVE} .player__rail .player__flag { transition-property: scale, box-shadow; transition-duration: 300ms; transition-timing-function: cubic-bezier(0.2, 0, 0, 1); scale: 0.7; z-index: 1; }
${LIVE} .player__rail .player__flag[data-on] { scale: 1.25; box-shadow: 0 0 12px currentColor; }
.player__rail .player__flag--error { color: var(--color-danger, #f55); }
.player__rail .player__flag--warning { color: var(--color-warning, #fb3); }
.fx-rp-layers .fx-rp-ghost { z-index: 3; }
.player__screen [data-hot] { box-shadow: 0 0 0 1px color-mix(in oklab, var(--color-accent, #6ef) 70%, transparent), 0 0 16px -4px var(--color-accent, #6ef); }
@media (max-width: 40rem) { .fx-rp-view { max-height: 22vh; } .fx-rp-ev, .fx-rp-meta { display: none; } }
`);

export function replay(section, ctx) {
  const motion = !!ctx.motion;
  const duration = Number(section.dataset.duration) || 180;
  const player = section.querySelector('[data-replay-player]');
  const range = player?.querySelector('input[type="range"]');
  const out = player?.querySelector('[data-replay-time]');
  if (!player || !range) return undefined;
  section.classList.add('fx-replay');

  const chapters = [...section.querySelectorAll('[data-chapter]')]
    .map((el) => ({ el, at: Number(el.dataset.at) || 0, title: (el.querySelector('h2, h3')?.textContent ?? el.id).replace(/\s+/g, ' ').trim() }))
    .sort((a, b) => a.at - b.at);
  const flags = [...section.querySelectorAll('[data-flag]')].map((el) => ({
    el,
    at: Number(el.dataset.at) || 0,
    sev: el.dataset.severity === 'error' ? 'error' : 'warning',
    label: (el.querySelector('[data-flag-label], .flag__label, h2, h3, h4, strong')?.textContent ?? el.textContent).replace(/\s+/g, ' ').trim().slice(0, 48),
    hit: null,
  }));
  const markers = [...player.querySelectorAll('[data-replay-markers] li')].map((li) => {
    const a = li.querySelector('a');
    const id = a ? decodeURIComponent((a.getAttribute('href') || '').split('#')[1] || '') : '';
    return { li, a, ch: chapters.find((c) => c.el.id === id) };
  });

  /* ---------- scroll ⇄ time mapping ---------- */
  let ys = [0, 1];
  let ts = [0, duration];
  const absTop = (el) => el.getBoundingClientRect().top + scrollY;
  const measureMap = () => {
    const vh = innerHeight;
    const pts = chapters.map((c) => [absTop(c.el) - vh * READ, c.at]);
    // The session ends when the section's own end crosses the reading line.
    const endY = absTop(section) + section.offsetHeight - vh * READ;
    pts.push([Math.max(endY, (pts.at(-1)?.[0] ?? 0) + 1), duration]);
    if (!chapters.length || chapters[0].at > 0) pts.unshift([absTop(section) - vh * READ, 0]);
    // Strictly increasing in both axes.
    for (let i = 1; i < pts.length; i++) {
      if (pts[i][0] <= pts[i - 1][0]) pts[i][0] = pts[i - 1][0] + 1;
      if (pts[i][1] < pts[i - 1][1]) pts[i][1] = pts[i - 1][1];
    }
    ys = pts.map((p) => p[0]);
    ts = pts.map((p) => p[1]);
  };
  const timeAt = (y) => {
    if (y <= ys[0]) return ts[0];
    for (let i = 1; i < ys.length; i++) {
      if (y <= ys[i]) return ts[i - 1] + ((y - ys[i - 1]) / (ys[i] - ys[i - 1])) * (ts[i] - ts[i - 1]);
    }
    return ts.at(-1);
  };
  const yAt = (t) => {
    if (t <= ts[0]) return ys[0];
    for (let i = 1; i < ts.length; i++) {
      if (t <= ts[i]) return ts[i] === ts[i - 1] ? ys[i] : ys[i - 1] + ((t - ts[i - 1]) / (ts[i] - ts[i - 1])) * (ys[i] - ys[i - 1]);
    }
    return ys.at(-1);
  };

  /* ---------- stage (motion only) ---------- */
  const stage = motion ? buildStage(player, chapters, flags, duration) : null;

  /* ---------- render ---------- */
  let scrubbing = false;
  let scrubTimer = 0;
  let lastSec = -1;
  let lastChapter = -1;
  let prevT = null;

  const render = (t) => {
    t = clamp(t, 0, duration);
    const sec = Math.round(t);
    let ci = 0;
    for (let i = 0; i < chapters.length; i++) if (t >= chapters[i].at - 0.001) ci = i;
    if (sec !== lastSec || ci !== lastChapter) {
      lastSec = sec;
      if (out) out.textContent = mmss(sec);
      if (!scrubbing) range.value = String(sec);
      const cur = chapters[ci];
      range.setAttribute('aria-valuetext', `${mmss(Number(range.value))}${cur ? `, ${cur.title}` : ''}`);
    }
    if (ci !== lastChapter) {
      lastChapter = ci;
      for (const m of markers) {
        const idx = m.ch ? chapters.indexOf(m.ch) : -1;
        const s = idx < 0 ? 'upcoming' : idx < ci ? 'passed' : idx === ci ? 'current' : 'upcoming';
        if (m.li.dataset.state !== s) m.li.dataset.state = s;
        if (m.a) {
          if (s === 'current') m.a.setAttribute('aria-current', 'true');
          else m.a.removeAttribute('aria-current');
        }
      }
    }
    if (motion) {
      for (const f of flags) {
        const hit = t >= f.at;
        if (hit === f.hit) continue;
        const first = f.hit === null;
        f.hit = hit;
        flagState(f, hit, first);
      }
      stage?.draw(t, prevT);
    }
    prevT = t;
  };

  const flagState = (f, hit, first) => {
    const { gsap } = ctx;
    gsap.killTweensOf(f.el);
    if (hit) {
      delete f.el.dataset.pending;
      if (first) return;
      gsap.fromTo(f.el, { opacity: 0, y: 12, scale: 0.96, filter: 'blur(4px)' }, {
        opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.3, ease: 'vd-out',
        clearProps: 'opacity,transform,filter',
      });
    } else if (first) {
      f.el.dataset.pending = '';
    } else {
      gsap.to(f.el, {
        opacity: 0.28, y: -12, filter: 'blur(4px)', duration: 0.15, ease: 'vd-out',
        onComplete: () => { f.el.dataset.pending = ''; gsap.set(f.el, { clearProps: 'opacity,transform,filter' }); },
      });
    }
  };

  const fromScroll = () => render(timeAt(scrollY));

  /* ---------- range → scroll ---------- */
  const endScrub = () => {
    clearTimeout(scrubTimer);
    scrubTimer = setTimeout(() => { scrubbing = false; fromScroll(); }, motion ? 700 : 60);
  };
  const onInput = () => {
    scrubbing = true;
    const t = Number(range.value);
    const y = yAt(t);
    if (motion) import('./scroll.js').then((s) => s.scrollToY(y, { duration: 0.5 }));
    else window.scrollTo({ top: y, behavior: 'instant' });
    lastSec = -1;
    render(t); // readouts follow the user's value immediately
    endScrub();
  };
  range.addEventListener('input', onInput);
  range.addEventListener('change', endScrub);

  /* ---------- drive ---------- */
  const offs = [];
  if (motion) {
    const { ScrollTrigger } = ctx;
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: fromScroll,
      onRefresh: () => { measureMap(); stage?.measure(); prevT = null; fromScroll(); },
    });
    offs.push(() => st.kill());
  } else {
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fromScroll(); }); };
    const ro = new ResizeObserver(() => { measureMap(); fromScroll(); });
    ro.observe(section);
    addEventListener('scroll', onScroll, { passive: true });
    offs.push(() => { removeEventListener('scroll', onScroll); ro.disconnect(); cancelAnimationFrame(raf); });
  }
  measureMap();
  stage?.measure();
  fromScroll();

  return () => {
    offs.forEach((f) => f());
    clearTimeout(scrubTimer);
    range.removeEventListener('input', onInput);
    range.removeEventListener('change', endScrub);
    for (const f of flags) { delete f.el.dataset.pending; ctx.gsap?.set(f.el, { clearProps: 'opacity,transform,filter' }); }
    for (const m of markers) { delete m.li.dataset.state; m.a?.removeAttribute('aria-current'); }
    stage?.destroy();
    section.classList.remove('fx-replay');
  };
}

/* ====================================================================== */
/* Stage: a recorded viewport that replays a ghost session as a function of t */

const OVERLAYS = `
      <svg class="fx-rp-trail" preserveAspectRatio="none"><polyline points=""/></svg>
      <div class="fx-rp-scan"></div>
      <div class="fx-rp-err"><span></span></div>
      <div class="fx-rp-warn"></div>
      <div class="fx-rp-rips">${'<i class="fx-rp-rip"></i>'.repeat(6)}</div>`;

function buildStage(player, chapters, flags, duration) {
  const added = [];   // nodes we created, removed on destroy
  const restore = []; // inline style restores on B's nodes
  const bStage = player.querySelector('[data-replay-stage]');
  let view, tc, ghost, fill, ph, tl, ticks, fls, ev, targets, btn, field, errEl = null;

  if (bStage) {
    // Adopt B's recorded viewport: its mock app, chrome and cursor; add our layers.
    view = bStage.querySelector('.player__screen') ?? bStage;
    view.insertAdjacentHTML('beforeend', `<div class="fx-rp-layers" aria-hidden="true">${OVERLAYS}</div>`);
    added.push(view.lastElementChild);
    const layers = view.lastElementChild;
    ev = Object.assign(document.createElement('ol'), { className: 'fx-rp-ev fx-rp-ev--over' });
    view.append(ev);
    added.push(ev);
    const chrome = bStage.querySelector('.player__chrome');
    tc = Object.assign(document.createElement('span'), { className: 'fx-rp-tc', textContent: '00:00:00:00' });
    if (chrome) {
      const rec = chrome.querySelector('.console__rec');
      if (rec) rec.before(tc); else chrome.append(tc);
      added.push(tc);
    }
    ghost = bStage.querySelector('[data-replay-cursor]');
    if (ghost) {
      const prev = ghost.getAttribute('style') ?? '';
      restore.push(() => (prev ? ghost.setAttribute('style', prev) : ghost.removeAttribute('style')));
      Object.assign(ghost.style, { insetInlineStart: '0px', insetBlockStart: '0px', left: '0px', top: '0px', willChange: 'transform', zIndex: '3' });
    } else {
      layers.insertAdjacentHTML('beforeend', '<svg class="fx-rp-ghost" viewBox="0 0 16 20"><path d="M1.5 1.5v15.2l4.1-3.9 2.6 5.8 2.6-1.1-2.6-5.7h5.6z"/></svg>');
      ghost = layers.lastElementChild;
    }
    targets = [...view.querySelectorAll('.mock > span:not(.mock__row), .mock__row > i')];
    btn = view.querySelector('.mock__row > i:last-child') ?? targets.at(-1);
    field = view.querySelector('.mock__line') ?? targets.at(-2);
    errEl = view.querySelector('.mock__hero');
    const rail = player.querySelector('.player__rail');
    if (rail) {
      rail.insertAdjacentHTML('afterbegin', '<span class="fx-rp-fill"></span>');
      fill = rail.querySelector('.fx-rp-fill');
      added.push(fill);
      tl = rail;
      fls = [...rail.querySelectorAll('.player__flag')];
    }
    ticks = [];
  } else {
    const build = document.querySelector('[data-hud="build"]')?.textContent.trim();
    const root = document.createElement('div');
    root.className = 'fx-rp';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="fx-rp-top"><span class="fx-rp-rec"><i></i>REC</span><span class="fx-rp-tc">00:00:00:00</span>
        <span class="fx-rp-meta">session ${build || 'local'} · ${innerWidth}×${innerHeight}</span></div>
      <div class="fx-rp-view">
        <div class="fx-rp-app">
          <div class="fx-rp-nav"><i></i><i data-t></i><i data-t></i><i data-t></i></div>
          <div class="fx-rp-cards"><i data-t></i><i data-t></i><i data-t></i></div>
          <div class="fx-rp-row"><span class="fx-rp-field" data-t="field"></span><span class="fx-rp-btn" data-t="btn"></span></div>
        </div>
        ${OVERLAYS}
        <svg class="fx-rp-ghost" viewBox="0 0 16 20"><path d="M1.5 1.5v15.2l4.1-3.9 2.6 5.8 2.6-1.1-2.6-5.7h5.6z"/></svg>
      </div>
      <div class="fx-rp-tl"><b><i></i></b>
        ${chapters.map((c) => `<span class="tick" style="left:${(c.at / duration) * 100}%"></span>`).join('')}
        ${flags.map((f) => `<span class="fl" data-sev="${f.sev}" style="left:${(f.at / duration) * 100}%"></span>`).join('')}
        <span class="ph"></span></div>
      <ol class="fx-rp-ev"></ol>`;
    player.append(root);
    added.push(root);
    view = root.querySelector('.fx-rp-view');
    tc = root.querySelector('.fx-rp-tc');
    ghost = root.querySelector('.fx-rp-ghost');
    fill = root.querySelector('.fx-rp-tl > b i');
    ph = root.querySelector('.fx-rp-tl .ph');
    tl = root.querySelector('.fx-rp-tl');
    ticks = [...root.querySelectorAll('.fx-rp-tl .tick')];
    fls = [...root.querySelectorAll('.fx-rp-tl .fl')];
    ev = root.querySelector('.fx-rp-ev');
    targets = [...root.querySelectorAll('[data-t]')];
    btn = root.querySelector('[data-t="btn"]');
    field = root.querySelector('[data-t="field"]');
  }
  const trail = view.querySelector('.fx-rp-trail polyline');
  const scan = view.querySelector('.fx-rp-scan');
  const err = view.querySelector('.fx-rp-err');
  const warn = view.querySelector('.fx-rp-warn');
  const rips = [...view.querySelectorAll('.fx-rp-rip')];
  fls ??= [];
  const errFlag = flags.find((f) => f.sev === 'error');
  const warnFlag = flags.find((f) => f.sev === 'warning');
  err.firstElementChild.textContent = errFlag?.label || 'flag';
  warn.textContent = warnFlag?.label || 'flag';

  let W = 1, H = 1, tlW = 1;
  let boxes = new Map(); // visitable target -> {x,y,w,h} in view px
  let all = new Map();   // every measured element
  let kf = [];           // [{t, x, y}] cursor keyframes (normalized 0..1)
  let clicks = [];       // [{t, x, y, sev}]

  const centre = (el, jx = 0, jy = 0) => {
    const b = boxes.get(el);
    return b ? { x: (b.x + b.w * (0.5 + jx)) / W, y: (b.y + b.h * (0.5 + jy)) / H } : { x: 0.5, y: 0.5 };
  };

  // Deterministic "human" path: visit a target per chapter, rage-click before the warning,
  // fill the field and submit right before the error.
  const plan = () => {
    kf = [{ t: 0, x: 0.52, y: 0.62 }];
    clicks = [];
    const pool = [...boxes.keys()].filter((x) => x !== btn && x !== field);
    chapters.forEach((c, i) => {
      const tgt = pool[(i * 2 + 1) % pool.length];
      const p = centre(tgt, ((i * 37) % 7) / 30 - 0.1, ((i * 53) % 5) / 25 - 0.1);
      kf.push({ t: c.at + 3, ...p });
      clicks.push({ t: c.at + 3.6, ...p, el: tgt });
      const q = centre(pool[(i * 2 + 2) % pool.length], 0.2, -0.15);
      kf.push({ t: c.at + 12, ...q });
    });
    if (warnFlag) {
      const a = warnFlag.at;
      const p = centre(btn);
      kf.push({ t: a - 3.2, ...p });
      for (let k = 0; k < 5; k++) {
        const j = { x: p.x + Math.sin(k * 2.1) * 0.008, y: p.y + Math.cos(k * 1.7) * 0.01 };
        kf.push({ t: a - 2.6 + k * 0.5, ...j });
        clicks.push({ t: a - 2.5 + k * 0.5, ...j, el: btn, sev: 'warning' });
      }
    }
    if (errFlag) {
      const e = errFlag.at;
      const f = centre(field, -0.25);
      const b = errEl ? { x: (all.get(errEl).x + all.get(errEl).w * 0.62) / W, y: (all.get(errEl).y + all.get(errEl).h * 0.7) / H } : centre(btn);
      kf.push({ t: e - 7, ...f });
      clicks.push({ t: e - 6.5, ...f, el: field });
      kf.push({ t: e - 2.2, ...b });
      clicks.push({ t: e - 1.6, ...b, el: btn, sev: 'error' });
    }
    kf.sort((a, b) => a.t - b.t);
    clicks.sort((a, b) => a.t - b.t);
  };

  const pos = (t) => {
    if (!kf.length) return { x: 0.5, y: 0.5 };
    let i = 0;
    while (i < kf.length - 1 && kf[i + 1].t <= t) i++;
    const a = kf[i];
    const b = kf[i + 1];
    if (!b) return { x: a.x, y: a.y };
    const gap = b.t - a.t;
    const move = Math.min(gap, 1.4);
    const u = easeIO(clamp((t - (b.t - move)) / move, 0, 1));
    const dx = b.x - a.x, dy = b.y - a.y;
    const bow = Math.sin(Math.PI * u) * 0.12 * Math.hypot(dx, dy);
    // Idle drift: a hand resting on a mouse is never perfectly still.
    const drift = (1 - Math.sin(Math.PI * u)) * 0.004;
    return {
      x: a.x + dx * u - dy * bow + Math.sin(t * 1.3) * drift,
      y: a.y + dy * u + dx * bow + Math.cos(t * 1.1) * drift,
    };
  };

  const measure = () => {
    const vr = view.getBoundingClientRect();
    W = vr.width || 1;
    H = vr.height || 1;
    tlW = tl?.getBoundingClientRect().width || 1;
    all = new Map(targets.concat(errEl ?? []).map((el) => {
      const r = el.getBoundingClientRect();
      return [el, { x: r.left - vr.left, y: r.top - vr.top, w: r.width, h: r.height }];
    }));
    // Only targets fully inside the recorded viewport can be visited.
    boxes = new Map([...all].filter(([el, b]) => el !== errEl && b.w > 0 && b.y >= 0 && b.y + b.h <= H));
    plan();
    if (errFlag) {
      const b = errEl ? all.get(errEl) : (() => { const f = boxes.get(field), bb = boxes.get(btn); return f && bb && { x: f.x, y: f.y - 22, w: bb.x + bb.w - f.x, h: f.h + 22 }; })();
      if (b) Object.assign(err.style, { left: `${b.x - 6}px`, top: `${b.y - 6}px`, width: `${b.w + 12}px`, height: `${b.h + 12}px` });
    }
    if (warnFlag) {
      const bb = boxes.get(btn);
      if (bb) Object.assign(warn.style, { left: 'auto', right: `${W - bb.x - bb.w}px`, top: `${bb.y - 24}px` });
    }
  };

  let ripIdx = 0;
  let evLast = 0;
  const pushEvent = (t, kind, detail, sev) => {
    const li = document.createElement('li');
    if (sev) li.dataset.sev = sev;
    li.innerHTML = `<span></span><span></span><span></span>`;
    li.children[0].textContent = `${mmss(t)}.${Math.floor((t % 1) * 10)}`;
    li.children[1].textContent = kind;
    li.children[2].textContent = detail;
    ev.append(li);
    while (ev.children.length > 4) ev.firstElementChild.remove();
  };

  const ripple = (c) => {
    const el = rips[ripIdx++ % rips.length];
    el.dataset.sev = c.sev || '';
    el.getAnimations().forEach((a) => a.cancel());
    el.style.left = `${c.x * W}px`;
    el.style.top = `${c.y * H}px`;
    el.animate(
      [{ opacity: 0.9, transform: 'scale(0.2)' }, { opacity: 0, transform: 'scale(1.6)' }],
      { duration: 600, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    );
  };

  let lastTc = '';
  let hot = null;
  const draw = (t, prevT) => {
    // Timecode HH:MM:SS:FF (30 fps)
    const s = `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)}:${pad((t % 1) * 30)}`;
    if (s !== lastTc) { tc.textContent = s; lastTc = s; }

    const p = pos(t);
    let x = p.x * W, y = p.y * H;
    // Rage tremor around the warning.
    if (warnFlag && t > warnFlag.at - 2.8 && t < warnFlag.at + 0.2) { x += Math.sin(t * 47) * 1.5; }
    ghost.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;

    // Trail of the last ~6 s of movement.
    const pts = [];
    for (let k = 12; k >= 0; k--) {
      const tt = t - k * 0.5;
      if (tt < 0) continue;
      const q = pos(tt);
      pts.push(`${(q.x * W).toFixed(1)},${(q.y * H).toFixed(1)}`);
    }
    trail.setAttribute('points', pts.join(' '));

    // Hot target = the one the cursor is over.
    let over = null;
    for (const [el, b] of boxes) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) over = el;
    if (over !== hot) { hot?.removeAttribute('data-hot'); over?.setAttribute('data-hot', ''); hot = over; }

    // Clicks crossed going forward → ripple + event line (capped so a fast scrub stays calm).
    if (prevT !== null && t > prevT && t - prevT < 8) {
      let n = 0;
      for (const c of clicks) {
        if (c.t > prevT && c.t <= t && n++ < 3) {
          ripple(c);
          pushEvent(c.t, 'click', `${Math.round(c.x * innerWidth)},${Math.round(c.y * innerHeight)}`, c.sev === 'warning' ? 'warning' : '');
        }
      }
      for (const f of flags) {
        if (f.at > prevT && f.at <= t) pushEvent(f.at, f.sev === 'error' ? 'ai.flag' : 'heur.flag', f.label, f.sev);
      }
      evLast = t;
    } else if (prevT === null || Math.abs(t - prevT) >= 8) {
      ev.replaceChildren();
      pushEvent(t, 'seek', mmss(t));
    }

    // Warning badge: from the rage clicks to a few seconds after.
    if (warnFlag) {
      const a = warnFlag.at;
      const o = t < a - 0.6 ? 0 : t < a + 6 ? 1 : Math.max(0, 1 - (t - a - 6) / 1.5);
      warn.style.opacity = o.toFixed(3);
      warn.style.transform = `translateY(${((1 - smooth(clamp((t - a + 0.6) / 0.6, 0, 1))) * 6).toFixed(1)}px)`;
    }
    // AI scan sweeps the viewport, then the error box locks on.
    if (errFlag) {
      const e = errFlag.at;
      const u = clamp((t - (e - 1.2)) / 1.6, 0, 1);
      scan.style.opacity = u > 0 && u < 1 ? (Math.sin(Math.PI * u)).toFixed(3) : '0';
      scan.style.transform = `translateX(${((u * 1.3 - 0.3) * W).toFixed(1)}px)`;
      const o = t < e ? 0 : t < e + 14 ? Math.min(1, (t - e) / 0.4) : Math.max(0, 1 - (t - e - 14) / 1.5);
      err.style.opacity = o.toFixed(3);
      err.style.transform = `scale(${(1.04 - 0.04 * smooth(clamp((t - e) / 0.5, 0, 1))).toFixed(4)})`;
    }

    // Timeline.
    const q = t / duration;
    if (fill) fill.style.transform = `scaleX(${q.toFixed(4)})`;
    if (ph) ph.style.transform = `translateX(${(q * tlW).toFixed(1)}px)`;
    chapters.forEach((c, i) => { if (ticks[i] && (t >= c.at) !== ticks[i].hasAttribute('data-on')) ticks[i].toggleAttribute('data-on'); });
    flags.forEach((f, i) => { if (fls[i] && (t >= f.at) !== fls[i].hasAttribute('data-on')) fls[i].toggleAttribute('data-on'); });
  };

  return {
    measure,
    draw,
    destroy: () => {
      added.forEach((n) => n?.remove());
      restore.forEach((f) => f());
      hot?.removeAttribute('data-hot');
      fls.forEach((f) => f.removeAttribute('data-on'));
    },
  };
}
