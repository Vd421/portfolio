// Page transitions: visuals for B's htmx boost + View Transitions.
//   Motion: the old page drops back (opacity + 4px blur + −12px, 150 ms) while the new page
//   wipes in behind a scanline (clip-path sweep, 450 ms, ease-in-out). Header, HUD and
//   the fx layer get their own names so persistent chrome never flickers.
//   Shared element: clicking a project card names its title/media vt-title-{slug} /
//   vt-media-{slug}; the case-study header gets the same names after the swap, so the
//   browser morphs one into the other. Going back home morphs the other way.
//   Reduced motion / still: plain cross-fade, no shared-element morph.

import { css } from './styles.js';

css('vt', `
/* B names site-header, hud and site-footer. The fx layer (cursor) holds still too. */
#fx-layer { view-transition-name: vt-fx; }
::view-transition-group(vt-fx) { animation: none; }
::view-transition-old(vt-fx) { display: none; }
::view-transition-new(vt-fx) { animation: none; }

/* Reduced motion and still: cross-fade only. */
::view-transition-old(root) { animation: 150ms cubic-bezier(0.2, 0, 0, 1) both fx-vt-fade-out; }
::view-transition-new(root) { animation: 300ms cubic-bezier(0.2, 0, 0, 1) both fx-vt-fade-in; }
@keyframes fx-vt-fade-out { to { opacity: 0; } }
@keyframes fx-vt-fade-in { from { opacity: 0; } }

@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion="still"])::view-transition-old(root) { animation: 150ms cubic-bezier(0.2, 0, 0, 1) both fx-vt-out; }
  :root:not([data-motion="still"])::view-transition-new(root) { animation: 450ms cubic-bezier(0.4, 0, 0.2, 1) both fx-vt-wipe; }
  /* The scanline: the image pair's own background, under the clipped new page and
     uncovered once the old page has faded. It travels exactly with the wipe edge. */
  :root:not([data-motion="still"])::view-transition-image-pair(root) {
    background:
      linear-gradient(to bottom, var(--color-accent, #6ef) 0 2px, color-mix(in oklab, var(--color-accent, #6ef) 28%, transparent) 2px, transparent 40px) 0 0 / 100% 40px no-repeat,
      var(--color-bg, #05070a);
    animation: 450ms cubic-bezier(0.4, 0, 0.2, 1) both fx-vt-scan;
  }
  :root:not([data-motion="still"])::view-transition-group(*.vt-shared) { animation-duration: 450ms; animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
}
@keyframes fx-vt-out { to { opacity: 0; filter: blur(4px); transform: translateY(-12px); } }
@keyframes fx-vt-wipe {
  from { clip-path: inset(0 0 100% 0); }
  to { clip-path: inset(0 0 0 0); }
}
@keyframes fx-vt-scan {
  from { background-position: 0 0, 0 0; }
  to { background-position: 0 calc(100% + 40px), 0 0; }
}
`);

const SLUG = /^\/work\/([^/?#]+)\/?$/;

function slugOf(href) {
  try { return new URL(href, location.href).pathname.match(SLUG)?.[1] ?? null; } catch { return null; }
}

const CARD = '[data-card], .card, article';

/** Title + media of the card that links to /work/{slug}. Marked-up hooks first, heuristics second. */
function cardParts(root, slug, from = null) {
  const link = from ?? [...root.querySelectorAll('a[href]')].find((a) => slugOf(a.href) === slug && a.closest(CARD));
  const card = link?.closest(CARD);
  if (!card || card.closest('#main') === null) return {};
  return {
    title: card.querySelector('[data-vt="title"]') ?? card.querySelector('h2, h3, h4'),
    media: card.querySelector('[data-vt="media"]') ?? card.querySelector('figure, img'),
  };
}
function headerParts(main) {
  return {
    title: main.querySelector('[data-vt="title"]') ?? main.querySelector('h1'),
    media: main.querySelector('[data-vt="media"]') ?? null,
  };
}

const named = new Set();
function name(el, n) {
  if (!el) return;
  el.style.viewTransitionName = n;
  el.style.viewTransitionClass = 'vt-shared';
  named.add(el);
}
function clearNames() {
  for (const el of named) { el.style.viewTransitionName = ''; el.style.viewTransitionClass = ''; }
  named.clear();
}

export function startTransitions({ motionAllowed }) {
  if (!document.startViewTransition) return;
  let pending = null;   // slug of the clicked card, or of the case study we are leaving

  // Card click → name the source elements before htmx starts the transition.
  document.addEventListener('click', (e) => {
    if (!motionAllowed() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest?.('a[href]');
    const slug = a && slugOf(a.href);
    if (!slug || slugOf(location.href) === slug) return;
    clearNames();
    const main = document.getElementById('main');
    if (!main) return;
    const { title, media } = cardParts(main, slug, a);
    name(title, `vt-title-${slug}`);
    name(media, `vt-media-${slug}`);
    pending = slug;
  }, true);

  // Leaving a case study by any link: name its header so home can morph back into the card.
  document.addEventListener('htmx:beforeRequest', () => {
    if (!motionAllowed()) { clearNames(); pending = null; return; }
    const slug = slugOf(location.href);
    if (slug && !pending) {
      const main = document.getElementById('main');
      if (main) {
        const { title, media } = headerParts(main);
        name(title, `vt-title-${slug}`);
        name(media, `vt-media-${slug}`);
        pending = slug;
      }
    }
  });

  // Inside the transition's update callback: name the matching elements on the new page.
  document.addEventListener('htmx:afterSwap', (e) => {
    if (!pending) return;
    const slug = pending;
    pending = null;
    clearNames();
    if (!motionAllowed()) return;
    const main = document.getElementById('main');
    if (!main) return;
    const onCase = slugOf(location.href) === slug || main.dataset.page === 'work';
    const parts = onCase ? headerParts(main) : cardParts(main, slug);
    // Morph back only into something on screen; a far-off card would fly out of view.
    const onScreen = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
    if (onCase || onScreen(parts.title)) name(parts.title, `vt-title-${slug}`);
    if (onCase || onScreen(parts.media)) name(parts.media, `vt-media-${slug}`);
    // Names only matter for this one transition.
    setTimeout(clearNames, 900);
    void e;
  });

}
