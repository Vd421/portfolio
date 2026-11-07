// Live HUD. Server-rendered values stay correct without JS; this keeps them live.
//   clock  – ticks every second while motion is allowed; every minute (HH:MM) when still
//   uptime – counts from the last /api/status uptime_s
//   fps    – from the shared gsap.ticker (empty when motion is off: nothing is animating)
//   build/region/ask/status – refreshed by polling /api/status every 30 s while visible
// The motion toggle is the pause control for everything that updates on its own (WCAG 2.2.2).

import { frames } from './runtime.js';

const POLL = 30_000;
const pad = (n) => String(n).padStart(2, '0');

function fmtUptime(s) {
  s = Math.max(0, Math.floor(s));
  const d = Math.floor(s / 86400);
  const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return d ? `${d}d ${hms}` : hms;
}

export function startHud({ motionAllowed, getRuntime }) {
  const q = (k) => [...document.querySelectorAll(`[data-hud="${k}"]`)];
  const set = (k, v) => {
    for (const el of q(k)) if (el.textContent !== v) el.textContent = v;
  };

  // Clock format follows what the server rendered: UTC if it says so, else local.
  const clockEl = q('clock')[0];
  const utc = clockEl ? /utc|z$/i.test(clockEl.textContent) || clockEl.dataset.tz === 'utc' : true;
  const suffix = clockEl && /utc/i.test(clockEl.textContent) ? ' UTC' : '';
  const clock = (withSeconds) => {
    const d = new Date();
    const h = utc ? d.getUTCHours() : d.getHours();
    const m = utc ? d.getUTCMinutes() : d.getMinutes();
    const s = utc ? d.getUTCSeconds() : d.getSeconds();
    const v = withSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}${suffix}` : `${pad(h)}:${pad(m)}${suffix}`;
    for (const el of q('clock')) {
      if (el.textContent !== v) el.textContent = v;
      if (el.tagName === 'TIME') el.dateTime = d.toISOString();
    }
  };

  // Uptime baseline: server value at render, refreshed by polls.
  const upEl = q('uptime')[0];
  let upBase = upEl ? Number(upEl.dataset.value ?? NaN) : NaN;
  if (!Number.isFinite(upBase) && upEl) {
    const m = upEl.textContent.match(/(?:(\d+)d\s*)?(\d+):(\d+):(\d+)/);
    if (m) upBase = (+m[1] || 0) * 86400 + +m[2] * 3600 + +m[3] * 60 + +m[4];
    else if (/^\s*\d+\s*s?\s*$/.test(upEl.textContent)) upBase = parseInt(upEl.textContent, 10);
  }
  let upAt = performance.now();

  let timer = 0;
  let pollTimer = 0;
  let lastPoll = 0;
  let live = null;

  const tick = () => {
    const allowed = motionAllowed();
    clock(allowed);
    if (allowed && Number.isFinite(upBase)) set('uptime', fmtUptime(upBase + (performance.now() - upAt) / 1000));
    const rt = getRuntime();
    if (allowed && rt) { if (frames.fps) set('fps', String(frames.fps)); } else set('fps', '');
  };

  const schedule = () => {
    clearTimeout(timer);
    if (document.hidden) return;
    const allowed = motionAllowed();
    const now = Date.now();
    const wait = allowed ? 1000 - (now % 1000) : 60_000 - (now % 60_000);
    timer = setTimeout(() => { tick(); schedule(); }, wait + 5);
    if (live !== allowed) { live = allowed; tick(); }
  };

  const poll = async () => {
    clearTimeout(pollTimer);
    if (document.hidden) return;
    lastPoll = Date.now();
    try {
      const r = await fetch('/api/status', { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (Number.isFinite(j.uptime_s)) { upBase = j.uptime_s; upAt = performance.now(); }
        if (j.build) set('build', String(j.build));
        if (j.region) set('region', String(j.region));
        if (j.ask) set('ask', String(j.ask));
        if (j.status) set('status', String(j.status));
        if (!motionAllowed() && Number.isFinite(upBase)) set('uptime', fmtUptime(upBase));
        for (const el of q('ask')) el.dataset.state = j.ask;
        for (const el of q('status')) el.dataset.state = j.status;
      }
    } catch { /* keep the last good values */ }
    pollTimer = setTimeout(poll, POLL);
  };

  const onVis = () => {
    if (document.hidden) { clearTimeout(timer); clearTimeout(pollTimer); return; }
    live = null;
    schedule();
    if (Date.now() - lastPoll >= POLL) poll();
    else pollTimer = setTimeout(poll, POLL - (Date.now() - lastPoll));
  };
  document.addEventListener('visibilitychange', onVis);
  document.addEventListener('vd:motion', () => { live = null; schedule(); });

  schedule();
  lastPoll = Date.now(); // the server-rendered values are fresh; first poll in 30 s
  pollTimer = setTimeout(poll, POLL);
  // fps updates faster than the clock while motion is on.
  setInterval(() => {
    if (document.hidden || !motionAllowed() || !getRuntime()) return;
    if (frames.fps) set('fps', String(frames.fps));
  }, 500);
}
