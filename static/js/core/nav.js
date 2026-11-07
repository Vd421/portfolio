// Page lifecycle and navigation (CONTRACTS.md › Page structure, Page lifecycle events).
//
// htmx boosts every same-origin link and swaps #main only (attributes on <body>).
// This module adds what htmx leaves out:
//   - `vd:page-leave` { from } before every swap of #main, `vd:page` { page, root } after
//     it settles, and once for the initial page.
//   - document.title and the page's description/canonical/og tags follow the new page.
//   - Focus moves to the new h1 (or the #hash target) and #announcer says
//     "Navigated to {title}".
//   - Back/forward: htmx's DOM snapshots are disabled (they would swap the whole
//     <body>), so a history miss re-fetches the page into #main and restores the
//     scroll position recorded for that URL.
//   - Same-page hash links (/#work while on /) scroll natively instead of re-fetching.
//   - Errors (5xx, network) fall back to a full page load so the browser reports them.
//   - The mobile nav disclosure opens, closes on Escape/outside click, and closes on navigation.
//
// Exports: init(), navigate(url), currentPage().

const HEAD_SELECTORS = [
  'meta[name="description"]',
  'link[rel="canonical"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:url"]',
  'meta[property="og:type"]',
  'meta[name="robots"]',
];

const scrollMap = new Map(); // path -> scrollY
let renderedPath = pathOf(location.href);
let restoring = false; // between a popstate and the swap that answers it
let pending = null; // { head, restorePath } for the swap in flight
let started = false;

function pathOf(href) {
  const u = new URL(href, location.href);
  return u.pathname + u.search;
}

function main() {
  return document.getElementById('main');
}

export function currentPage() {
  const root = main();
  return { page: root?.dataset.page ?? null, root };
}

function dispatch(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

/* ---------- announcements ---------- */

let announceTimer = 0;
export function announce(text) {
  const region = document.getElementById('announcer');
  if (!region) return;
  // Clear first so the same text twice is still announced.
  region.textContent = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { region.textContent = text; }, 60);
}

/* ---------- mobile nav ---------- */

function navToggle() {
  return document.getElementById('nav-toggle');
}

function setNav(open, { restoreFocus = false } = {}) {
  const btn = navToggle();
  if (!btn) return;
  btn.setAttribute('aria-expanded', String(open));
  if (!open && restoreFocus) btn.focus();
}

function initNav() {
  const btn = navToggle();
  if (!btn) return;
  btn.addEventListener('click', () => setNav(btn.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || btn.getAttribute('aria-expanded') !== 'true') return;
    if (document.querySelector('dialog[open]')) return;
    setNav(false, { restoreFocus: true });
  });
  document.addEventListener('click', (e) => {
    if (btn.getAttribute('aria-expanded') !== 'true') return;
    const nav = btn.closest('nav');
    if (nav && !nav.contains(e.target)) setNav(false);
  });
  document.getElementById('nav-list')?.addEventListener('click', (e) => {
    if (e.target.closest('a')) setNav(false);
  });
}

/* ---------- head ---------- */

function readHead(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tags = {};
    for (const sel of HEAD_SELECTORS) tags[sel] = doc.head.querySelector(sel);
    return { title: doc.title, tags };
  } catch {
    return null;
  }
}

function applyHead(head) {
  if (!head) return;
  if (head.title) document.title = head.title;
  for (const [sel, next] of Object.entries(head.tags)) {
    const cur = document.head.querySelector(sel);
    if (next && cur) {
      for (const attr of ['content', 'href']) if (next.hasAttribute(attr)) cur.setAttribute(attr, next.getAttribute(attr));
    } else if (next && !cur) {
      document.head.append(document.importNode(next, true));
    } else if (!next && cur) {
      cur.remove();
    }
  }
}

/* ---------- scroll ---------- */

let scrollQueued = false;
function recordScroll() {
  if (restoring || pending || scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    scrollQueued = false;
    if (!restoring && !pending) scrollMap.set(renderedPath, scrollY);
  });
}

function jump(top) {
  scrollTo({ top, left: 0, behavior: 'instant' });
}

function hashTarget(href) {
  const hash = new URL(href, location.href).hash;
  if (!hash || hash.length < 2) return null;
  try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return null; }
}

/* ---------- navigation ---------- */

/** Navigate like a boosted link click; falls back to a normal page load. */
export function navigate(url) {
  const href = new URL(url, location.href);
  if (href.origin !== location.origin || !window.htmx) {
    location.assign(href.href);
    return;
  }
  if (pathOf(href.href) === renderedPath && href.hash) {
    samePageHash(href);
    return;
  }
  const a = document.createElement('a');
  a.href = href.href;
  a.hidden = true;
  document.body.append(a);
  window.htmx.process(a);
  a.click();
  a.remove();
}

function samePageHash(url) {
  const target = hashTarget(url.href);
  if (location.hash !== url.hash) history.pushState(history.state, '', url.hash);
  if (target) {
    target.scrollIntoView({ block: 'start' });
    focusTarget(target);
  }
}

function focusTarget(el) {
  if (!el) return;
  if (!el.matches('a[href], button, input, select, textarea, [tabindex]')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

function finish() {
  const root = main();
  if (!root || !pending) return;
  const { head, restorePath, href } = pending;
  pending = null;

  applyHead(head);
  renderedPath = pathOf(location.href);

  // Scroll: history restores its position, a #hash lands on its target, anything else starts at the top.
  const target = restorePath ? null : hashTarget(href ?? location.href);
  if (restorePath) jump(scrollMap.get(restorePath) ?? 0);
  else if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
  else jump(0);
  restoring = false;

  focusTarget(target ?? root.querySelector('h1') ?? root);
  setNav(false);
  announce(`Navigated to ${document.title}`);
  dispatch('vd:page', { page: root.dataset.page ?? null, root });
}

function initHtmx() {
  // Same-page hash links: no request, native scroll.
  document.addEventListener('htmx:confirm', (e) => {
    const elt = e.detail?.elt;
    if (!(elt instanceof HTMLAnchorElement) || !elt.hash) return;
    if (pathOf(elt.href) !== renderedPath) return;
    e.preventDefault();
    setNav(false);
    samePageHash(new URL(elt.href));
  });

  document.addEventListener('htmx:beforeHistorySave', () => {
    if (!restoring) scrollMap.set(renderedPath, scrollY);
  });

  // Back/forward without snapshots: fetch the page and swap #main like a boosted visit.
  document.addEventListener('htmx:historyCacheMiss', (e) => {
    e.preventDefault();
    const path = e.detail?.path ?? pathOf(location.href);
    if (pathOf(path) === renderedPath) { restoring = false; return; } // only the hash changed
    restoring = true;
    window.htmx.ajax('GET', path, {
      source: document.body,
      target: '#main',
      select: '#main',
      swap: 'outerHTML transition:true',
      headers: { 'HX-History-Restore-Request': 'true' },
    }).catch(() => location.reload());
  });

  document.addEventListener('htmx:beforeSwap', (e) => {
    const d = e.detail;
    if (!d || d.target?.id !== 'main') return;
    if (!d.shouldSwap) return;
    const restorePath = restoring ? pathOf(location.href) : null;
    pending = { head: readHead(d.serverResponse ?? d.xhr?.responseText ?? ''), restorePath, href: d.pathInfo?.responsePath ?? d.pathInfo?.finalRequestPath ?? null };
    // Anchor of the clicked link (htmx keeps it in pathInfo.anchor).
    if (d.pathInfo?.anchor) pending.href = `${pending.href ?? location.pathname}#${d.pathInfo.anchor}`;
    scrollMap.set(renderedPath, scrollY);
    dispatch('vd:page-leave', { from: main()?.dataset.page ?? null });
  });

  document.addEventListener('htmx:afterSettle', () => {
    if (pending && main()?.isConnected) finish();
  });

  // Failures: let the browser do a real navigation so the visitor sees its outcome.
  document.addEventListener('htmx:responseError', (e) => {
    if (e.detail?.target?.id !== 'main') return;
    restoring = false;
    location.assign(e.detail.pathInfo?.requestPath ?? location.href);
  });
  document.addEventListener('htmx:sendError', (e) => {
    if (e.detail?.target?.id !== 'main') return;
    restoring = false;
    location.assign(e.detail.pathInfo?.requestPath ?? location.href);
  });
}

export function init() {
  if (started) return;
  started = true;
  initNav();
  addEventListener('scroll', recordScroll, { passive: true });
  // A traversal to another page pauses scroll recording until its swap lands.
  addEventListener('popstate', () => { if (pathOf(location.href) !== renderedPath) restoring = true; });
  if (window.htmx) initHtmx();
  else addEventListener('htmx:load', initHtmx, { once: true });
  // Initial page.
  dispatch('vd:page', currentPage());
}
