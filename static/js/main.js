// VD portfolio — single module entry (Engineer C).
//
// Lifecycle
//   1. Decide on the boot sequence synchronously and show it before anything else loads.
//   2. Attach page lifecycle listeners, then import and init B's core/* modules.
//   3. On every `vd:page`, bind effects inside `detail.root`; on `vd:page-leave`, tear
//      every one of them down (ScrollTriggers, SplitText, observers, listeners, WebGL).
//   4. Effects load lazily: only the modules for data-fx tokens present on the page, and
//      only when motion is allowed. The site is complete without any of this.
//   5. `vd:motion` re-evaluates everything live: motion off reverts all movement and
//      stops every loop; motion on rebinds without replaying entrances.

// B's modules, in init order (motion first: everything else asks it). Keep in sync with static/js/core/.
const CORE = ['motion', 'nav', 'palette'];

/* ---------- motion gate (B's core/motion.js; local fallback until it exists) ---------- */

const rm = matchMedia('(prefers-reduced-motion: reduce)');
const storedStill = () => {
  try { return ['still', 'off', 'false', '0'].includes(localStorage.getItem('vd:motion')); } catch { return false; }
};
let motion = {
  motionAllowed: () => !rm.matches && document.documentElement.dataset.motion !== 'still' && !storedStill(),
  onMotionChange: (cb) => {
    const h = () => cb(motion.motionAllowed());
    rm.addEventListener('change', h);
    return () => rm.removeEventListener('change', h);
  },
};

/* ---------- boot (decided before any other await so it covers the first paint) ---------- */

const bootDone = (async () => {
  const boot = document.getElementById('boot');
  let seen = false;
  try { seen = sessionStorage.getItem('vd:booted') === '1'; } catch { seen = true; }
  if (!boot || seen || !motion.motionAllowed() || matchMedia('print').matches) {
    document.documentElement.removeAttribute('data-boot');
    document.dispatchEvent(new CustomEvent('vd:boot-done', { detail: {} }));
    return;
  }
  try {
    const { runBoot } = await import('./fx/boot.js');
    await runBoot(boot);
  } catch (err) {
    console.warn('[fx] boot skipped:', err);
    boot.hidden = true;
  }
  try { sessionStorage.setItem('vd:booted', '1'); } catch { /* private mode */ }
  document.documentElement.removeAttribute('data-boot');
  document.dispatchEvent(new CustomEvent('vd:boot-done', { detail: {} }));
})();

/* ---------- effect registry: token -> lazy module + export ---------- */

const FX = {
  hscroll: [() => import('./fx/hscroll.js'), 'hscroll'],
  split: [() => import('./fx/text.js'), 'split'],
  scramble: [() => import('./fx/text.js'), 'scramble'],
  kinetic: [() => import('./fx/text.js'), 'kinetic'],
  reveal: [() => import('./fx/reveal.js'), 'reveal'],
  parallax: [() => import('./fx/parallax.js'), 'parallax'],
  magnetic: [() => import('./fx/pointer.js'), 'magnetic', 'fine'],
  tilt: [() => import('./fx/pointer.js'), 'tilt', 'fine'],
  distort: [() => import('./webgl/distort.js'), 'distort', 'fine'],
};
const ORDER = Object.keys(FX); // hscroll first: its pin spacing shifts every trigger below it

const logged = new Set();
const warn = (key, err) => {
  if (logged.has(key)) return;
  logged.add(key);
  console.warn(`[fx] ${key} disabled:`, err);
};
const safe = (key, fn) => {
  try { return fn(); } catch (err) { warn(key, err); return undefined; }
};

/* ---------- page binding ---------- */

const state = { page: null, rt: null, persistent: new Map(), seenPage: false, first: true };

function unbindPage() {
  const page = state.page;
  if (!page) return;
  page.dead = true;
  state.page = null;
  for (const fn of page.cleanups.reverse()) safe('cleanup', fn);
  page.cleanups.length = 0;
}

async function bindPage(root, { entrances = true } = {}) {
  if (!root) return;
  if (state.page && state.page.root === root && !state.page.dead && entrances) return; // duplicate vd:page
  unbindPage();
  const page = { root, dead: false, cleanups: [] };
  state.page = page;
  const add = (fn) => {
    if (typeof fn !== 'function') return;
    if (page.dead) safe('cleanup', fn);
    else page.cleanups.push(fn);
  };
  const allowed = motion.motionAllowed();
  document.documentElement.classList.toggle('fx-live', allowed);

  let rt = null;
  if (allowed) {
    try {
      rt = state.rt ??= await import('./fx/runtime.js').then(async (m) => ({ ...(await m.loadRuntime()), finePointer: m.finePointer }));
      await ensurePersistent(true);
    } catch (err) {
      warn('runtime', err);
      rt = null;
    }
    if (page.dead) return;
  }

  // gsap.context collects every tween, ScrollTrigger and SplitText created by effects.
  const gctx = rt ? rt.gsap.context(() => {}, root) : null;
  if (gctx) add(() => gctx.revert());
  const ctx = {
    ...(rt ?? {}),
    motion: !!rt,
    root,
    entrances,
    fine: rt ? rt.finePointer() : false,
    add,
    // Run fn inside the page's gsap.context (so its tweens/triggers revert with the page).
    // The return value is passed through; it is NOT registered with the context, because
    // cleanups go through add() exactly once.
    run: (fn) => {
      if (!gctx) return fn();
      let out;
      gctx.add(() => { out = fn(); });
      return out;
    },
    isDead: () => page.dead,
  };

  const jobs = [];
  const bindOne = async (key, fn) => {
    if (page.dead) return;
    try {
      let r = ctx.run(fn);
      if (r instanceof Promise) r = await r;
      add(r);
    } catch (err) { warn(key, err); }
  };

  // Replay works in both modes: the playhead sync is function, the choreography is motion.
  for (const el of root.querySelectorAll('[data-replay]')) {
    jobs.push(import('./fx/replay.js').then((m) => bindOne('replay', () => m.replay(el, ctx))).catch((e) => warn('replay', e)));
  }

  if (rt) {
    // Hero scene: lazy, near-viewport, WebGL2 only, not on save-data.
    const stage = root.querySelector('#hero-stage[data-webgl="field"]');
    if (stage) safe('field', () => add(lazyField(stage, ctx)));

    const groups = new Map();
    for (const el of root.querySelectorAll('[data-fx]')) {
      for (const t of el.dataset.fx.split(/\s+/)) {
        if (!FX[t]) continue;
        if (!groups.has(t)) groups.set(t, []);
        groups.get(t).push(el);
      }
    }
    for (const t of ORDER) {
      const els = groups.get(t);
      if (!els) continue;
      const [load, name, needs] = FX[t];
      if (needs === 'fine' && !ctx.fine) continue;
      // Sequential per token keeps creation order = page order for ScrollTrigger.
      jobs.push(load().then(async (m) => {
        for (const el of els) await bindOne(t, () => m[name](el, ctx));
      }).catch((e) => warn(t, e)));
    }
  }

  await Promise.all(jobs);
  if (page.dead) return;
  if (rt) {
    rt.ScrollTrigger.sort();
    rt.ScrollTrigger.refresh();
  }
  // Initial hash target: pins have changed the layout, so land on it again.
  if (state.first && location.hash) {
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t && rt) import('./fx/scroll.js').then((s) => s.jumpTo(t, true));
  }
  state.first = false;
  document.dispatchEvent(new CustomEvent('vd:fx-ready', { detail: { root } }));
}

/* ---------- lazy hero ---------- */

function lazyField(stage, ctx) {
  const conn = navigator.connection;
  if (conn?.saveData) return undefined;
  if (!('WebGL2RenderingContext' in window)) return undefined;
  let dispose = null;
  let cancelled = false;
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    import('./webgl/field.js')
      .then((m) => {
        if (cancelled || ctx.isDead()) return;
        dispose = m.mount(stage, ctx);
      })
      .catch((err) => warn('field', err));
  }, { rootMargin: '300px 0px' });
  io.observe(stage);
  return () => {
    cancelled = true;
    io.disconnect();
    dispose?.();
  };
}

/* ---------- persistent pieces (survive boosted navigation) ---------- */

async function ensurePersistent(allowed) {
  const p = state.persistent;
  const start = async (key, loader) => {
    if (p.has(key)) return;
    p.set(key, null);
    try { p.set(key, await loader()); } catch (err) { p.delete(key); warn(key, err); }
  };
  const stop = (key) => {
    const v = p.get(key);
    p.delete(key);
    if (typeof v === 'function') safe(key, v);
  };

  if (allowed && state.rt) {
    const rt = state.rt;
    await Promise.all([
      start('scroll', async () => {
        const s = await import('./fx/scroll.js');
        await s.startScroll(rt);
        return () => s.stopScroll();
      }),
      rt.finePointer() ? start('cursor', async () => (await import('./fx/cursor.js')).startCursor(rt)) : null,
    ]);
  } else {
    stop('scroll');
    stop('cursor');
  }
}

/* ---------- always-on pieces (no motion required) ---------- */

async function startAlwaysOn() {
  const [hud, konami, vt] = await Promise.allSettled([
    import('./fx/hud.js'),
    import('./fx/konami.js'),
    import('./fx/transitions.js'),
  ]);
  if (hud.status === 'fulfilled') safe('hud', () => hud.value.startHud({ motionAllowed: () => motion.motionAllowed(), getRuntime: () => state.rt }));
  else warn('hud', hud.reason);
  if (konami.status === 'fulfilled') safe('konami', () => konami.value.startKonami());
  if (vt.status === 'fulfilled') safe('transitions', () => vt.value.startTransitions({ motionAllowed: () => motion.motionAllowed() }));
  else warn('transitions', vt.reason);
}

/* ---------- wiring ---------- */

document.addEventListener('vd:page', async (e) => {
  state.seenPage = true;
  const root = e.detail?.root ?? document.getElementById('main');
  if (state.first) await bootDone;
  bindPage(root, { entrances: true });
});
// Leaving: stop at once, but revert DOM changes only after htmx has swapped #main, so
// the View Transition's "old" snapshot shows the page exactly as the visitor left it
// (a pinned gallery reverting mid-pin would otherwise flash a different scroll spot).
document.addEventListener('vd:page-leave', () => {
  const page = state.page;
  if (!page) return;
  page.dead = true;
  state.page = null;
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    document.removeEventListener('htmx:afterSwap', run);
    for (const fn of page.cleanups.reverse()) safe('cleanup', fn);
    page.cleanups.length = 0;
  };
  document.addEventListener('htmx:afterSwap', run);
  setTimeout(run, 1500); // swap cancelled or failed: clean up anyway
});

function onMotion(allowed) {
  document.documentElement.classList.toggle('fx-live', allowed);
  const root = state.page?.root ?? document.getElementById('main');
  unbindPage();
  ensurePersistent(allowed).then(() => bindPage(root, { entrances: false }));
}

// Listen before core init: B's init may dispatch the first vd:page synchronously.
document.addEventListener('vd:motion', (e) => onMotion(e.detail?.allowed ?? motion.motionAllowed()));

const coreResults = await Promise.allSettled(CORE.map((n) => import(`./core/${n}.js`)));
coreResults.forEach((r, i) => {
  if (r.status !== 'fulfilled') return; // optional module not present
  const mod = r.value;
  if (CORE[i] === 'motion' && typeof mod.motionAllowed === 'function') {
    motion = { motionAllowed: mod.motionAllowed, onMotionChange: mod.onMotionChange ?? motion.onMotionChange };
  }
});
const coreMotion = coreResults[0].status === 'fulfilled';
if (!coreMotion) motion.onMotionChange(onMotion); // fallback gate dispatches nothing itself
for (const r of coreResults) {
  if (r.status === 'fulfilled' && typeof r.value.init === 'function') safe('core-init', () => r.value.init());
}

startAlwaysOn();

// If B's page lifecycle is absent (or already fired before we listened), bind #main ourselves.
setTimeout(async () => {
  if (state.seenPage) return;
  await bootDone;
  if (!state.seenPage) bindPage(document.getElementById('main'), { entrances: true });
}, 0);

// Diagnostics for tests (read-only counts, no behaviour).
Object.defineProperty(window, 'vdfx', {
  value: {
    get triggers() { return state.rt ? state.rt.ScrollTrigger.getAll().length : 0; },
    get canvases() { return document.querySelectorAll('canvas').length; },
    get cleanups() { return state.page ? state.page.cleanups.length : 0; },
    get persistent() { return [...state.persistent.keys()]; },
  },
});
