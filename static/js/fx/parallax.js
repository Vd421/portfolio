// parallax – decorative layers translate by data-depth (−1..1) as their section passes.
// Never bound under reduced motion (main.js gates every effect on the motion gate).

export function parallax(el, { gsap }) {
  const depth = Math.max(-1, Math.min(1, parseFloat(el.dataset.depth ?? '0.3') || 0));
  if (!depth) return undefined;
  const range = () => depth * Math.min(160, innerHeight * 0.18);
  const tween = gsap.fromTo(el, { y: () => -range() }, {
    y: () => range(),
    ease: 'none',
    scrollTrigger: {
      trigger: el.parentElement ?? el,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    gsap.set(el, { clearProps: 'transform' });
  };
}
