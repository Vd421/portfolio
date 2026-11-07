// ↑↑↓↓←→←→BA: toggles the hero's debug render (wireframe + instrumentation) and writes a
// HUD log line. Harmless and reversible: enter it again to switch back.
// Ignored while typing in a field. The log line is decorative; the state change is also
// announced through B's #announcer so it is never conveyed by visuals alone.

import { css } from './styles.js';

const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

css('konami', `
.fx-log {
  position: fixed; inset-inline-start: 16px; inset-block-end: 16px; z-index: var(--z-fx, 60);
  margin: 0; padding: 8px 12px; list-style: none; pointer-events: none;
  font: 11px/1.6 var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums;
  color: var(--color-accent-text, var(--color-accent, #6ef));
  background: color-mix(in oklab, var(--color-bg, #05070a) 82%, transparent);
  border: 1px solid var(--color-border-strong, #334); border-radius: 6px;
  backdrop-filter: blur(8px);
  transition: opacity 150ms ease-out;
}
.fx-log[data-hidden] { opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion="still"]) .fx-log { transition-property: opacity, translate; }
  :root:not([data-motion="still"]) .fx-log[data-hidden] { translate: 0 -12px; }
}
.fx-log li::before { content: "› "; color: var(--color-text-tertiary, #5d6673); }
`);

export function startKonami() {
  let i = 0;
  let on = false;
  let log = null;
  let hideTimer = 0;
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t?.closest?.('input, textarea, select, [contenteditable], dialog')) { i = 0; return; }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    i = k === SEQ[i] ? i + 1 : (k === SEQ[0] ? 1 : 0);
    if (i < SEQ.length) return;
    i = 0;
    on = !on;
    document.documentElement.toggleAttribute('data-debug-render', on);
    document.dispatchEvent(new CustomEvent('vd:konami', { detail: {} }));

    const stamp = new Date().toISOString().slice(11, 19);
    const msg = on ? 'debug render: on — wireframe, raw buffers' : 'debug render: off';
    log ??= Object.assign(document.createElement('ol'), { className: 'fx-log' });
    log.setAttribute('aria-hidden', 'true');
    (document.getElementById('fx-layer') ?? document.body).append(log);
    const li = document.createElement('li');
    li.textContent = `${stamp}  konami  ${msg}`;
    log.append(li);
    while (log.children.length > 3) log.firstElementChild.remove();
    delete log.dataset.hidden;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { log.dataset.hidden = ''; }, 6000);

    const ann = document.getElementById('announcer');
    if (ann) ann.textContent = on ? 'Debug render on. Enter the code again to turn it off.' : 'Debug render off.';
  });
}
