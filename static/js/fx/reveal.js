// reveal – children marked [data-fx-item] enter 100 ms apart as they scroll in:
// opacity + 4px blur + 12px translateY over 300 ms, ease-out (better-ui, exact).
// Initial state is set from JS in the same pass that creates the trigger; nothing is
// hidden by CSS, so the content is complete if this never runs.

export function reveal(el, { gsap, ScrollTrigger, entrances }) {
  if (!entrances) return undefined;
  const items = [...el.querySelectorAll('[data-fx-item]')];
  if (!items.length) return undefined;
  gsap.set(items, { opacity: 0, y: 12, filter: 'blur(4px)' });
  const triggers = ScrollTrigger.batch(items, {
    start: 'top 92%',
    once: true,
    interval: 0.1,
    onEnter: (batch) => gsap.to(batch, {
      opacity: 1, y: 0, filter: 'blur(0px)',
      duration: 0.3, ease: 'vd-out', stagger: 0.1, overwrite: true,
      // Transform is left at its (identity) end value: tilt/magnetic on the same element
      // keep their gsap transform cache (perspective) intact.
      clearProps: 'opacity,filter',
    }),
  });
  return () => {
    triggers.forEach((t) => t.kill());
    gsap.set(items, { clearProps: 'opacity,transform,filter' });
  };
}
