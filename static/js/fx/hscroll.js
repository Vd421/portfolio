// hscroll – the #work gallery pins and its [data-fx-track] scrubs horizontally with
// vertical scroll. The next card always peeks. Keyboard focus moving into an off-screen
// card scrolls the page to the position that shows it, so Tab order and the visual stay
// in step. Wide viewports only (≥ 48rem); otherwise the track stays B's normal grid.

import { css, LIVE } from './styles.js';

css('hscroll', `
@media (min-width: 48rem) {
  ${LIVE} .fx-hs { overflow: clip; }
  ${LIVE} .fx-hs [data-fx-track] {
    display: flex !important; flex-wrap: nowrap !important; gap: clamp(16px, 2vw, 32px);
    width: max-content; max-width: none; grid-template-columns: none;
  }
  ${LIVE} .fx-hs [data-fx-track] > * { flex: 0 0 clamp(18rem, 34vw, 32rem); width: auto; }
  ${LIVE} .fx-hs-meter {
    display: flex; align-items: center; gap: 12px; margin-block-start: 24px;
    font: 11px/1 var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums;
    color: var(--color-text-tertiary, #5d6673); letter-spacing: 0.08em; text-transform: uppercase;
  }
  ${LIVE} .fx-hs-meter b { font-weight: 400; color: var(--color-text, #e8edf3); }
  ${LIVE} .fx-hs-bar { position: relative; flex: 0 1 240px; height: 1px; background: var(--color-border-strong, #334); overflow: hidden; }
  ${LIVE} .fx-hs-bar i { position: absolute; inset: 0; background: var(--color-accent, #6ef); transform-origin: 0 50%; transform: scaleX(0); }
}
`);

export function hscroll(section, ctx) {
  const { gsap, ScrollTrigger } = ctx;
  const track = section.querySelector('[data-fx-track]');
  if (!track) return undefined;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 48rem)', () => {
    section.classList.add('fx-hs');
    const cards = [...track.children];
    const meter = document.createElement('div');
    meter.className = 'fx-hs-meter';
    meter.setAttribute('aria-hidden', 'true');
    meter.innerHTML = `<span><b>01</b> / ${String(cards.length).padStart(2, '0')}</span><span class="fx-hs-bar"><i></i></span><span>scroll</span>`;
    track.after(meter);
    const count = meter.querySelector('b');
    const fill = meter.querySelector('i');

    // Distance: the last card's right edge lands on the track's own left inset mirrored.
    const inset = () => track.getBoundingClientRect().left - section.getBoundingClientRect().left;
    const dist = () => Math.max(0, track.scrollWidth - (section.clientWidth - inset() * 2));

    const tween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${dist()}`,
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          fill.style.transform = `scaleX(${self.progress.toFixed(4)})`;
          const i = Math.min(cards.length, 1 + Math.round(self.progress * (cards.length - 1)));
          const s = String(i).padStart(2, '0');
          if (count.textContent !== s) count.textContent = s;
        },
      },
    });
    const st = tween.scrollTrigger;

    // Focus inside the track: bring the focused card into view by scrolling the page.
    const onFocus = (e) => {
      const card = cards.find((c) => c.contains(e.target));
      if (!card || !st) return;
      section.scrollLeft = 0; // clip should prevent it, but never let focus scroll the box
      const d = dist();
      if (!d) return;
      const viewW = section.clientWidth - inset() * 2;
      const x = gsap.getProperty(track, 'x');
      const left = card.offsetLeft + x;
      if (left >= 0 && left + card.offsetWidth <= viewW) return; // already fully visible
      const want = Math.min(d, Math.max(0, card.offsetLeft - (viewW - card.offsetWidth) / 2));
      const y = st.start + (want / d) * (st.end - st.start);
      import('./scroll.js').then((s) => s.scrollToY(y, { duration: 0.6 }));
    };
    track.addEventListener('focusin', onFocus);

    return () => {
      track.removeEventListener('focusin', onFocus);
      meter.remove();
      section.classList.remove('fx-hs');
      gsap.set(track, { clearProps: 'transform' });
    };
  });
  return () => mm.revert();
}
