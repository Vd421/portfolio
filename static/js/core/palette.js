// Command palette (CONTRACTS.md › Palette).
//
// <dialog id="palette"> opened with showModal() by Cmd/Ctrl+K, by "/" (unless the
// visitor is typing in a field) and by #palette-open. Escape or a backdrop click
// closes it and focus returns to whatever opened it.
//
// Built-in commands run locally from #vd-data (rendered from /content; TODO values are
// null there). Anything else streams from POST /api/ask as server-sent events:
//   token { text }  → appended to the answer as it arrives
//   done  { }       → the full answer is announced once through #announcer
//   error { code, message } → plain-language error for that code
// Stop aborts the stream. The last 6 messages go back as `history`.
// Up/Down in the input recall earlier commands.
//
// Exports: init(), openPalette(), closePalette(), run(text).

import { announce, navigate } from './nav.js';
import { motionAllowed, setMotion } from './motion.js';

const MAX_HISTORY = 6;
const MAX_QUESTION = 500;

let dialog, form, input, log, runBtn, stopBtn, trigger;
let data = { site: {}, projects: [], experience: [], skills: [], ask: false };
let controller = null; // AbortController of the stream in flight
const asked = []; // [{ role, content }] for /api/ask history
const recall = []; // commands the visitor entered, oldest first
let recallAt = -1;
let draft = '';
let started = false;

/* ---------- DOM helpers ---------- */

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const code = (t) => h('code', {}, t);

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function nearBottom() {
  return log.scrollHeight - log.scrollTop - log.clientHeight < 48;
}

function push(entry, { speak = true } = {}) {
  log.append(entry);
  log.scrollTop = log.scrollHeight;
  if (speak) announce(entry.textContent.replace(/\s+/g, ' ').trim());
  return entry;
}

function out(...children) {
  return push(h('li', { class: 'log-entry' }, ...children));
}

function notice(text, kind = 'notice') {
  if (kind === 'error') {
    return push(h('li', { class: 'log-entry log-entry--error' }, h('p', { class: 'log-entry__title' }, icon('error'), text)));
  }
  return push(h('li', { class: `log-entry log-entry--${kind}` }, h('p', {}, text)));
}

function echo(text) {
  push(h('li', { class: 'log-entry log-entry--input', 'data-prompt': `${data.site.handle ?? 'vd'} ›` }, text), { speak: false });
}

function table(rows) {
  return h('dl', { class: 'log-table' }, rows.filter(Boolean).map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
}

function link(href, text) {
  return h('a', { href }, text);
}

/* ---------- built-in commands ---------- */

const firstName = () => (data.site.name ?? '').split(' ')[0] || 'Vaibhav';
const missing = (what) => h('span', { class: 'log-muted' }, `${what} not listed yet`);

function contactRows() {
  const s = data.site;
  return [
    ['email', link(`mailto:${s.email}`, s.email)],
    ...(s.links ?? []).filter((l) => l.kind !== 'mail').map((l) => [l.label.toLowerCase(), link(l.href, l.href.replace(/^https?:\/\//, ''))]),
    ['resume', s.resume ? link(s.resume, 'Download (PDF)') : missing('Resume')],
    ['based in', s.location],
  ];
}

const COMMANDS = {
  help: {
    about: 'List these commands',
    run() {
      out(
        h('p', { class: 'log-entry__title' }, 'Commands'),
        table(Object.entries(COMMANDS).map(([name, c]) => [c.usage ?? name, typeof c.about === 'function' ? c.about() : c.about])),
        h('p', { class: 'log-muted' }, data.ask
          ? `Anything else is sent as a question to an AI that answers from ${firstName()}’s portfolio.`
          : 'AI answers are offline right now, so only these commands work.'),
      );
    },
  },
  whoami: {
    about: () => `Who ${firstName()} is`,
    run() {
      const s = data.site;
      const edu = (s.education ?? [])[0];
      const now = (data.experience ?? []).find((r) => r.end === 'present');
      out(
        h('p', { class: 'log-entry__title' }, `${s.name} (${s.handle})`),
        h('p', {}, s.tagline),
        table([
          ['roles', s.roles.join(', ')],
          now && ['now', `${now.title ?? 'Role'} at ${now.company}${now.client ? `, client ${now.client}` : ''}`],
          edu && ['education', `${edu.degree}${edu.field ? ` in ${edu.field}` : ''}, ${edu.institution}${edu.end ? ` (${edu.end})` : ''}`],
          ['based in', s.location],
          s.availability && ['availability', s.availability],
        ]),
      );
    },
  },
  projects: {
    about: 'List every project',
    run() {
      out(
        h('p', { class: 'log-entry__title' }, `${data.projects.length} projects`),
        h('ul', { class: 'log-list' }, data.projects.map((p) => h('li', {},
          link(`/work/${p.slug}`, p.title), ' ', h('span', { class: 'log-muted' }, `${p.slug} · ${p.kicker}`)))),
        h('p', { class: 'log-muted' }, 'Type ', code('open <name>'), ' to open one, for example ', code(`open ${data.featured ?? data.projects[0]?.slug ?? 'replay'}`), '.'),
      );
    },
  },
  open: {
    usage: 'open <name>',
    about: 'Open a project page',
    run(arg) {
      if (!arg) {
        notice(`Type a project name after open, for example: open ${data.featured ?? 'replay'}`);
        return;
      }
      const q = arg.toLowerCase();
      const p = data.projects.find((x) => x.slug === q)
        ?? data.projects.find((x) => x.title.toLowerCase() === q)
        ?? data.projects.find((x) => x.slug.startsWith(q) || x.title.toLowerCase().startsWith(q));
      if (!p) {
        notice(`No project called “${arg}”. Type projects to see the list.`);
        return;
      }
      out(h('p', {}, `Opening ${p.title}…`));
      closePalette({ restoreFocus: false });
      navigate(`/work/${p.slug}`);
    },
  },
  experience: {
    about: 'Roles and internships',
    run() {
      out(
        h('p', { class: 'log-entry__title' }, 'Experience'),
        h('ul', { class: 'log-list' }, data.experience.map((r) => h('li', {},
          h('span', {}, `${r.title ?? 'Title not listed yet'} · ${r.company}${r.client ? ` (client ${r.client})` : ''}`), ' ',
          h('span', { class: 'log-muted' }, dates(r))))),
      );
    },
  },
  contact: {
    about: () => `How to reach ${firstName()}`,
    run() {
      out(h('p', { class: 'log-entry__title' }, 'Contact'), table(contactRows()));
    },
  },
  'hire vd': {
    about: 'Start a conversation about a role',
    run() {
      const s = data.site;
      out(
        h('p', { class: 'log-entry__title' }, 'Good call.'),
        h('p', {}, `${firstName()} is targeting ${s.roles.join(', ')} roles. Email is the fastest route: `, link(`mailto:${s.email}?subject=${encodeURIComponent('Role for vd')}`, s.email), '.'),
        s.availability ? h('p', {}, s.availability) : null,
        h('p', { class: 'log-muted' }, 'Or ', link('/#contact', 'jump to the contact section'), '.'),
      );
    },
  },
  motion: {
    usage: 'motion on|off',
    about: 'Turn animation on or off',
    run(arg) {
      const system = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (arg !== 'on' && arg !== 'off') {
        out(h('p', {}, `Motion is ${motionAllowed() ? 'on' : 'off'}. Type `, code('motion on'), ' or ', code('motion off'), ' to change it.'));
        return;
      }
      if (system) {
        notice('Your system asks for reduced motion, so motion stays off. Change it in your operating system’s accessibility settings.');
        return;
      }
      setMotion(arg === 'on');
      out(h('p', {}, arg === 'on' ? 'Motion is on.' : 'Motion is off. Everything still works; nothing moves on its own.'));
    },
  },
  clear: {
    about: 'Clear this log',
    run() {
      log.replaceChildren();
      announce('Log cleared');
    },
  },
};

function dates(r) {
  const start = r.start ?? 'start date not listed';
  const end = r.end === 'present' ? 'present' : r.end ?? 'end date not listed';
  return `${start} – ${end}`;
}

/* ---------- ask (SSE) ---------- */

const ERRORS = {
  offline: () => 'AI answers are offline right now. Type help to see the built-in commands.',
  rate_limited: () => 'That’s a lot of questions in a short time. Wait a few minutes, then ask again.',
  invalid: () => `Questions can be 1 to ${MAX_QUESTION} characters. Shorten it and try again.`,
  upstream: () => 'Unable to get an answer from the AI service. Try again in a moment, or type help for built-in commands.',
  network: () => 'Unable to reach the server. Check your connection and try again.',
  interrupted: () => 'The answer stopped before it finished. Ask again to get the rest.',
};

function setStreaming(on) {
  runBtn.hidden = on;
  stopBtn.hidden = !on;
  input.readOnly = on;
  if (on) stopBtn.focus({ preventScroll: true });
  else if (dialog.open) input.focus({ preventScroll: true });
}

/** Parse a text/event-stream body into { event, data } objects. */
async function* events(body, signal) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let cut;
      while ((cut = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const block = buffer.slice(0, cut);
        buffer = buffer.slice(cut).replace(/^\r?\n\r?\n/, '');
        const ev = parseBlock(block);
        if (ev) yield ev;
      }
      if (signal.aborted) break;
    }
    buffer += decoder.decode();
    const ev = parseBlock(buffer);
    if (ev) yield ev;
  } finally {
    reader.releaseLock();
  }
}

function parseBlock(block) {
  let event = 'message';
  const lines = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue;
    const i = line.indexOf(':');
    const field = i === -1 ? line : line.slice(0, i);
    const value = i === -1 ? '' : line.slice(i + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') lines.push(value);
  }
  if (!lines.length) return null;
  let payload = lines.join('\n');
  try { payload = JSON.parse(payload); } catch { /* plain text data */ }
  return { event, data: payload };
}

async function ask(question) {
  if (!data.ask) {
    notice(ERRORS.offline());
    return;
  }
  if (question.length > MAX_QUESTION) {
    notice(ERRORS.invalid());
    return;
  }
  if (!navigator.onLine) {
    notice(ERRORS.network(), 'error');
    return;
  }

  const answerText = h('span');
  const entry = h('li', { class: 'log-entry log-entry--answer', 'aria-busy': 'true' }, answerText);
  push(entry, { speak: false });
  announce('Answering…');

  controller = new AbortController();
  const { signal } = controller;
  setStreaming(true);
  let text = '';
  let outcome = 'interrupted';

  const fail = (codeName, message) => {
    entry.remove();
    const fn = ERRORS[codeName] ?? ERRORS.upstream;
    notice(fn(message), codeName === 'offline' || codeName === 'rate_limited' || codeName === 'invalid' ? 'notice' : 'error');
  };

  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify({ question, history: asked.slice(-MAX_HISTORY) }),
      signal,
    });
    if (!res.ok || !res.body) {
      let codeName = res.status === 429 ? 'rate_limited' : res.status === 422 || res.status === 400 ? 'invalid' : 'upstream';
      try { const j = await res.json(); if (j?.code && ERRORS[j.code]) codeName = j.code; } catch { /* not JSON */ }
      outcome = 'error';
      fail(codeName);
      return;
    }
    for await (const ev of events(res.body, signal)) {
      if (ev.event === 'token') {
        const piece = typeof ev.data === 'string' ? ev.data : ev.data?.text ?? '';
        text += piece;
        const stick = nearBottom();
        answerText.textContent = text;
        if (stick) log.scrollTop = log.scrollHeight;
      } else if (ev.event === 'done') {
        outcome = 'done';
        break;
      } else if (ev.event === 'error') {
        outcome = 'error';
        fail(ev.data?.code ?? 'upstream', ev.data?.message);
        return;
      }
    }
  } catch (err) {
    if (signal.aborted) {
      outcome = 'aborted';
    } else {
      outcome = 'error';
      fail(navigator.onLine ? 'upstream' : 'network');
      return;
    }
  } finally {
    controller = null;
    entry.removeAttribute('aria-busy');
    setStreaming(false);
  }

  if (outcome === 'done') {
    if (!text.trim()) {
      entry.remove();
      notice(ERRORS.upstream(), 'error');
      return;
    }
    asked.push({ role: 'user', content: question }, { role: 'assistant', content: text });
    while (asked.length > MAX_HISTORY) asked.shift();
    announce(text);
  } else if (outcome === 'aborted') {
    if (!text) entry.remove();
    notice('Stopped.', 'notice');
  } else if (outcome === 'interrupted') {
    if (!text) entry.remove();
    notice(ERRORS.interrupted(), 'error');
  }
}

export function stop() {
  controller?.abort();
}

/* ---------- running input ---------- */

export function run(raw) {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return;
  if (recall.at(-1) !== text) recall.push(text);
  recallAt = -1;
  echo(text);
  const lower = text.toLowerCase();
  const handle = (data.site.handle ?? 'vd').toLowerCase();
  if (lower === `hire ${handle}` || lower === 'hire vd') return COMMANDS['hire vd'].run();
  const [name, ...rest] = lower.split(' ');
  const cmd = COMMANDS[name];
  if (cmd && name !== 'hire vd') {
    const arg = name === 'open' ? text.split(' ').slice(1).join(' ') : rest.join(' ');
    return cmd.run(arg.trim());
  }
  return ask(text);
}

/* ---------- open / close ---------- */

export function openPalette() {
  if (!dialog || dialog.open) return;
  trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.showModal();
  input.focus();
  document.dispatchEvent(new CustomEvent('vd:palette', { detail: { open: true } }));
}

let skipRestore = false;
export function closePalette({ restoreFocus = true } = {}) {
  if (!dialog?.open) return;
  skipRestore = !restoreFocus;
  dialog.close();
}

function onClose() {
  stop();
  if (!skipRestore && trigger?.isConnected) trigger.focus({ preventScroll: true });
  skipRestore = false;
  trigger = null;
  document.dispatchEvent(new CustomEvent('vd:palette', { detail: { open: false } }));
}

function typing(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) return !['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file'].includes(el.type);
  return false;
}

function onKey(e) {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (dialog.open) closePalette();
    else openPalette();
    return;
  }
  if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !dialog.open && !typing(e.target) && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    openPalette();
  }
}

function onInputKey(e) {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  if (!recall.length) return;
  e.preventDefault();
  if (recallAt === -1) draft = input.value;
  if (e.key === 'ArrowUp') recallAt = recallAt === -1 ? recall.length - 1 : Math.max(0, recallAt - 1);
  else recallAt = recallAt === -1 ? -1 : recallAt + 1;
  if (recallAt >= recall.length) recallAt = -1;
  input.value = recallAt === -1 ? draft : recall[recallAt];
  const end = input.value.length;
  input.setSelectionRange(end, end);
}

export function init() {
  if (started) return;
  dialog = document.getElementById('palette');
  if (!dialog) return;
  started = true;
  form = dialog.querySelector('form');
  input = document.getElementById('palette-input');
  log = document.getElementById('palette-log');
  runBtn = dialog.querySelector('[data-palette-run]');
  stopBtn = dialog.querySelector('[data-palette-stop]');
  try {
    data = { ...data, ...JSON.parse(document.getElementById('vd-data')?.textContent ?? '{}') };
  } catch { /* commands fall back to empty data */ }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (controller) return;
    const value = input.value;
    input.value = '';
    run(value);
  });
  input.addEventListener('keydown', onInputKey);
  stopBtn.addEventListener('click', stop);
  dialog.querySelector('[data-palette-close]')?.addEventListener('click', () => closePalette());
  dialog.addEventListener('close', onClose);
  // Backdrop click (for browsers without closedby="any").
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closePalette(); });
  // Same-origin links in the log navigate like boosted links.
  log.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    e.preventDefault();
    closePalette({ restoreFocus: false });
    navigate(url.href);
  });

  document.getElementById('palette-open')?.addEventListener('click', openPalette);
  document.addEventListener('keydown', onKey);
}
