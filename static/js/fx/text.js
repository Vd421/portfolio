// Text effects.
//   split    – SplitText reveal when scrolled in (lines|words|chars). Accessible name stays
//              the original text via SplitText's `aria` option where aria-label is allowed.
//   scramble – decode on hover/focus, rendered in an aria-hidden overlay; the real text is
//              never touched.
//   kinetic  – section titles: Mona Sans wdth/wght scrubbed with scroll, landing exactly on
//              the authored style. Height is locked so the scrub never shifts layout.

import { css, LIVE } from './styles.js';

let splitText;
const loadSplit = (gsap) => (splitText ??= import('gsap/SplitText.js').then((m) => {
  gsap.registerPlugin(m.SplitText);
  return m.SplitText;
}));

css('text', `
${LIVE} .fx-scr { position: relative; }
${LIVE} .fx-scr-o {
  position: absolute; inset: 0; pointer-events: none; white-space: pre;
  color: var(--fx-scr-color, currentColor); font: inherit; letter-spacing: inherit; text-transform: inherit;
  display: flex; align-items: center; justify-content: inherit;
  opacity: 0;
}
${LIVE} .fx-scr[data-scrambling] { color: transparent !important; -webkit-text-fill-color: transparent; }
${LIVE} .fx-scr[data-scrambling] > .fx-scr-o { opacity: 1; -webkit-text-fill-color: var(--fx-scr-color, currentColor); }
${LIVE} .fx-split-mask { padding-block: 0.08em; margin-block: -0.08em; }
`);

/* ---------- split ---------- */

const LABEL_OK = 'h1, h2, h3, h4, h5, h6, a, button, [role]';

export async function split(el, ctx) {
  if (!ctx.entrances) return undefined; // motion re-enabled mid-page: content is already shown
  const { gsap, ScrollTrigger } = ctx;
  const SplitText = await loadSplit(gsap);
  if (ctx.isDead()) return undefined;
  const mode = ['lines', 'words', 'chars'].includes(el.dataset.fxSplit) ? el.dataset.fxSplit : 'words';
  let instance;
  ctx.run(() => {
    instance = SplitText.create(el, {
      type: mode === 'chars' ? 'words,chars' : mode,
      mask: mode === 'lines' ? 'lines' : undefined,
      linesClass: 'fx-split-line',
      aria: el.matches(LABEL_OK) ? 'auto' : 'none',
      autoSplit: mode === 'lines',
      onSplit(self) {
        const parts = mode === 'lines' ? self.lines : mode === 'chars' ? self.chars : self.words;
        const from = mode === 'lines'
          ? { yPercent: 100, opacity: 0 }
          : { y: 12, opacity: 0, filter: 'blur(4px)' };
        return gsap.from(parts, {
          ...from,
          duration: 0.3,
          ease: 'vd-out',
          stagger: mode === 'chars' ? 0.018 : mode === 'words' ? 0.08 : 0.1,
          clearProps: 'filter',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      },
    });
  });
  return () => instance?.revert();
}

/* ---------- scramble ---------- */

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_-+=*#';

export function scramble(el, { gsap }) {
  const real = el.textContent.replace(/\s+/g, ' ').trim();
  if (!real || real.length > 64) return undefined;
  el.classList.add('fx-scr');
  const o = document.createElement('span');
  o.className = 'fx-scr-o';
  o.setAttribute('aria-hidden', 'true');
  el.append(o);
  let running = false;
  let tween = null;

  const run = () => {
    if (running) return;
    // Single-line labels only: an overlay cannot follow a wrapped inline box.
    if (el.getClientRects().length > 1) return;
    running = true;
    el.style.setProperty('--fx-scr-color', getComputedStyle(el).color);
    el.dataset.scrambling = '';
    const st = { p: 0 };
    let last = -1;
    tween = gsap.to(st, {
      p: 1,
      duration: Math.min(0.45, 0.18 + real.length * 0.012),
      ease: 'none',
      onUpdate() {
        const frame = Math.floor(st.p * 24); // ~step the glyph churn, not every frame
        if (frame === last) return;
        last = frame;
        const n = Math.floor(real.length * st.p);
        let s = real.slice(0, n);
        for (let i = n; i < real.length; i++) s += real[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        o.textContent = s;
      },
      onComplete() {
        delete el.dataset.scrambling;
        o.textContent = '';
        running = false;
      },
    });
  };
  el.addEventListener('pointerenter', run);
  el.addEventListener('focus', run);
  return () => {
    el.removeEventListener('pointerenter', run);
    el.removeEventListener('focus', run);
    tween?.kill();
    o.remove();
    el.classList.remove('fx-scr');
    delete el.dataset.scrambling;
    el.style.removeProperty('--fx-scr-color');
  };
}

/* ---------- kinetic ---------- */

export function kinetic(el, { gsap, ScrollTrigger }) {
  const cs = getComputedStyle(el);
  // Authored end state: font-variation-settings wins over font-stretch/font-weight.
  const fvs = cs.fontVariationSettings || '';
  const axis = (tag) => { const m = fvs.match(new RegExp(`"${tag}"\\s+(-?[\\d.]+)`)); return m ? parseFloat(m[1]) : NaN; };
  const endW = Number.isFinite(axis('wdth')) ? axis('wdth') : parseFloat(cs.fontStretch) || 100;
  const endG = Number.isFinite(axis('wght')) ? axis('wght') : parseFloat(cs.fontWeight) || 600;
  const prevFVS = el.style.fontVariationSettings;
  const apply = (w, g) => { el.style.fontVariationSettings = `"wdth" ${w.toFixed(1)}, "wght" ${g.toFixed(0)}`; };

  // Start state: condensed and heavy — unless that would need more lines than the
  // authored style (then fall back to lighter). min-height holds the authored height,
  // so a state needing fewer lines cannot pull content up either.
  let startW = 75, startG = 900;
  let h0 = 0;
  const measure = () => {
    el.style.minHeight = '';
    el.style.fontVariationSettings = prevFVS;
    h0 = el.getBoundingClientRect().height;
    for (const [w, g] of [[75, 900], [75, 700], [75, endG], [endW, endG]]) {
      apply(w, g);
      if (el.getBoundingClientRect().height <= h0 + 0.5) { startW = w; startG = g; break; }
    }
    el.style.minHeight = `${h0}px`;
  };
  measure();

  const st = { p: 0 };
  const draw = () => {
    const e = st.p;
    apply(startW + (endW - startW) * e, startG + (endG - startG) * e);
  };
  draw();
  const tween = gsap.to(st, {
    p: 1,
    ease: 'none',
    onUpdate: draw,
    scrollTrigger: {
      trigger: el,
      start: 'top bottom',
      end: 'top 45%',
      scrub: 0.4,
      onRefreshInit: () => { el.style.fontVariationSettings = prevFVS; el.style.minHeight = ''; },
      onRefresh: () => { measure(); draw(); },
    },
  });
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    el.style.fontVariationSettings = prevFVS;
    el.style.minHeight = '';
  };
}
