/* eslint-disable @typescript-eslint/no-explicit-any */
/** Load Three.js from jsDelivr at runtime, so it never weighs on first load. */
export function loadThree(): Promise<any> {
  const w = window as any
  if (w.__three) return Promise.resolve(w.__three)
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.type = 'module'
    s.textContent = `import * as T from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js'; window.__three = T; dispatchEvent(new Event('vd:three'))`
    const timer = setTimeout(() => reject(new Error('three timeout')), 15000)
    addEventListener('vd:three', () => { clearTimeout(timer); resolve(w.__three) }, { once: true })
    s.onerror = () => { clearTimeout(timer); reject(new Error('three failed')) }
    document.head.appendChild(s)
  })
}
