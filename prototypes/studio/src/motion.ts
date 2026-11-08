// One place for timings, eases and the motion gate. CSS mirrors these as custom properties.

export const ease = {
  out: 'cubic-bezier(0.2, 0, 0, 1)', // Krehel ease-out
  spring: 'cubic-bezier(0.2, 0.9, 0.3, 1.25)', // gentle overshoot for the magnetic settle
}

/** Seconds. The intro timeline: strike → flame → thin plume → billow → clear. */
export const intro = {
  strike: 0.35,
  flameFull: 0.6,
  plumeEnd: 1.6,
  billowEnd: 2.6,
  coverGone: 3.2,
  clearEnd: 3.9,
  revealAt: 2.9, // page entrance starts while the smoke is still clearing
  fadeSkip: 0.3,
}

export const prefersReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches

export function session() {
  try { return window.sessionStorage } catch { return null }
}

export const saveData = () => !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
