// hscroll – the #work gallery pins and its [data-fx-track] scrubs horizontally with
// vertical scroll. The next card always peeks. Keyboard focus moving into an off-screen
// card scrolls the page to the position that shows it, so Tab order and the visual stay
// in step. Wide viewports only (≥ 48rem); otherwise the track stays B's normal grid.

import { css, LIVE } from './styles.js';

// Layout while bound comes from B: #work[data-hscroll="on"] (flex track, card widths,
// gutters). This only adds the progress meter and makes the viewport unscrollable by focus.
css('hscroll', `
${LIVE} [data-hscroll="on"] .work__viewport, ${LIVE} [data-hscroll="on"] .fx-hs-viewport { overflow: clip; }
${LIVE} .fx-hs-meter {
  display: flex; align-items: center; gap: 12px; margin-block-start: 20px;
  margin-inline: max(var(--gutter, 16px), (100vw - var(--page-max, 80rem)) / 2 + var(--gutter, 16px));
  font: 11px/1 var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums;
  color: var(--color-text-tertiary, #5d6673); letter-spacing: 0.08em; text-transform: uppercase;
}
${LIVE} .fx-hs-meter b { font-weight: 400; color: var(--color-text, #e8edf3); }
${LIVE} .fx-hs-bar { position: relative; flex: 0 1 240px; height: 1px; background: var(--color-border-strong, #334); overflow: hidden; }
${LIVE} .fx-hs-bar i { position: absolute; inset: 0; background: var(--color-accent, #6ef); transform-origin: 0 50%; transform: scaleX(0); }
`);

export function hscroll(section, ctx) {
  const { gsap, ScrollTrigger } = ctx;
  const track = section.querySelector('[data-fx-track]');
  if (!track) return undefined;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 48rem)', () => {
    section.dataset.hscroll = 'on';
    const viewport = track.parentElement;
    viewport.classList.add('fx-hs-viewport');
    const cards = [...track.children];
    const meter = document.createElement('div');
    meter.className = 'fx-hs-meter';
    meter.setAttribute('aria-hidden', 'true');
    meter.innerHTML = `<span><b>01</b> / ${String(cards.length).padStart(2, '0')}</span><span class="fx-hs-bar"><i></i></span><span>scroll</span>`;
    viewport.after(meter);
    const count = meter.querySelector('b');
    const fill = meter.querySelector('i');

    // Distance: the track's own inline padding mirrors the gutter at the far end.
    const dist = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

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
      viewport.scrollLeft = 0; // clip should prevent it, but never let focus scroll the box
      const d = dist();
      if (!d) return;
      const viewW = viewport.clientWidth;
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
      delete section.dataset.hscroll;
      viewport.classList.remove('fx-hs-viewport');
      gsap.set(track, { clearProps: 'transform' });
    };
  });
  return () => mm.revert();
}
