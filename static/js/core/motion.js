// Motion gate (CONTRACTS.md › Motion gate).
//
//   motionAllowed()      false when the OS asks for reduced motion OR the visitor chose "still"
//   onMotionChange(cb)   cb(allowed) on every change; returns an unsubscribe function
//
// Side effects: keeps <html data-motion="live|still"> current, dispatches `vd:motion`
// with { allowed } on document, and drives the HUD toggle (#motion-toggle), whose
// choice persists in localStorage under `vd:motion`.

const KEY = 'vd:motion';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set();

function readChoice() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'still' || v === 'live' ? v : null;
  } catch {
    return null;
  }
}

function writeChoice(v) {
  try { localStorage.setItem(KEY, v); } catch { /* storage blocked: the choice lasts this page view */ }
}

let choice = readChoice();
let last = null;

export function motionAllowed() {
  return !reduce.matches && choice !== 'still';
}

export function onMotionChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The visitor's own choice, or null when they have not chosen. */
export function motionChoice() {
  return choice;
}

/** Set the visitor's choice: true (live), false (still). */
export function setMotion(allowed) {
  choice = allowed ? 'live' : 'still';
  writeChoice(choice);
  sync();
}

function sync() {
  const allowed = motionAllowed();
  document.documentElement.dataset.motion = allowed ? 'live' : 'still';
  renderToggle();
  if (allowed === last) return;
  const first = last === null;
  last = allowed;
  if (first) return; // the initial state is not a change
  for (const cb of listeners) {
    try { cb(allowed); } catch (err) { console.error(err); }
  }
  document.dispatchEvent(new CustomEvent('vd:motion', { detail: { allowed } }));
}

function renderToggle() {
  const btn = document.getElementById('motion-toggle');
  if (!btn) return;
  const state = document.getElementById('motion-state');
  const system = reduce.matches;
  btn.setAttribute('aria-pressed', String(motionAllowed()));
  // The OS setting wins; the toggle cannot override it, and says so in visible text.
  btn.disabled = system;
  if (state) state.textContent = system ? 'Still (system setting)' : motionAllowed() ? 'Live' : 'Still';
}

let started = false;

export function init() {
  if (started) return;
  started = true;
  sync();
  reduce.addEventListener('change', sync);
  // Another tab changed the choice.
  addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    choice = readChoice();
    sync();
  });
  document.getElementById('motion-toggle')?.addEventListener('click', () => {
    if (reduce.matches) return;
    setMotion(!motionAllowed());
  });
}

// Apply the stored choice as early as this module evaluates, so CSS motion that
// is gated on [data-motion] never starts for a visitor who chose "still".
document.documentElement.dataset.motion = motionAllowed() ? 'live' : 'still';
