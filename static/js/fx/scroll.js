// Smooth scroll: Lenis driven by gsap.ticker (one rAF loop), feeding ScrollTrigger.
// Persistent across boosted navigations. Only started when motion is allowed.
// Same-page anchor links (and the skip link) scroll with Lenis and still move focus,
// so keyboard and screen-reader behaviour matches native anchors.

let lenis = null;
let off = [];

export function getLenis() {
  return lenis;
}

/** Scroll to a y position or element. Works with or without Lenis. */
export function scrollToY(y, { immediate = false, duration } = {}) {
  if (lenis) lenis.scrollTo(y, { immediate, duration, force: true, lock: false });
  else window.scrollTo({ top: typeof y === 'number' ? y : 0, behavior: 'instant' });
}

export async function startScroll({ gsap, ScrollTrigger }) {
  if (lenis) return lenis;
  const { default: Lenis } = await import('lenis');
  lenis = new Lenis({
    autoRaf: false,
    lerp: 0.11,
    smoothWheel: true,
    syncTouch: false,      // native touch scrolling stays native
    anchors: false,        // handled below, with focus management
    stopInertiaOnNavigate: true,
    // Never hijack wheel inside dialogs, the palette, or anything that opts out.
    prevent: (node) => !!node.closest?.('dialog, [data-lenis-prevent], textarea, select'),
  });
  document.documentElement.classList.add('fx-lenis');

  const onScroll = () => ScrollTrigger.update();
  lenis.on('scroll', onScroll);
  const raf = (time) => lenis?.raf(time * 1000);
  gsap.ticker.add(raf);

  // Same-page hash links: smooth scroll, update the URL, move focus like a native anchor.
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.('a[href*="#"]');
    if (!a || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    e.stopPropagation(); // htmx boost must not treat a same-page anchor as a navigation
    if (location.hash !== url.hash) history.pushState(history.state, '', url.hash);
    jumpTo(target);
  };
  document.addEventListener('click', onClick, true);

  // Palette open: freeze smooth scroll so the page behind does not drift.
  const onPalette = (e) => (e.detail?.open ? lenis?.stop() : lenis?.start());
  document.addEventListener('vd:palette', onPalette);

  const onPop = () => {
    if (!location.hash) return;
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) jumpTo(t, true);
  };
  window.addEventListener('popstate', onPop);

  off = [
    () => document.removeEventListener('click', onClick, true),
    () => document.removeEventListener('vd:palette', onPalette),
    () => window.removeEventListener('popstate', onPop),
    () => gsap.ticker.remove(raf),
    () => lenis?.off?.('scroll', onScroll),
  ];
  return lenis;
}

/** Scroll an element into view with Lenis and give it focus without a second jump. */
export function jumpTo(target, immediate = false) {
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const focus = () => {
    if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  if (lenis) {
    lenis.scrollTo(target, { offset: -margin, immediate, onComplete: focus, force: true });
    if (immediate) focus();
  } else {
    target.scrollIntoView({ block: 'start' });
    focus();
  }
}

export function stopScroll() {
  off.forEach((f) => f());
  off = [];
  lenis?.destroy();
  lenis = null;
  document.documentElement.classList.remove('fx-lenis');
}
