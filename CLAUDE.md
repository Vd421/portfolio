# CLAUDE.md

Portfolio of Vaibhav Dhir ("vd"): B.Tech EEE, VIT Chennai '25, at HCLTech on the MetLife account,
targeting Forward Deployed / Solutions Engineer and Full Stack AI roles. GitHub: Vd421.

The repo holds two independent sites:

| Site | Path | Stack |
| --- | --- | --- |
| Main site (deployed) | repo root | Python 3.12, FastAPI, Jinja2, HTMX, Tailwind standalone CLI, vanilla ES modules (Three.js, GSAP, Lenis via import map) |
| Open World prototype | `prototypes/open-world/` | React 18, Motion, GSAP + ScrollTrigger + SplitText, Lenis, Three.js (CDN), Lottie, Parcel; intro reel in Remotion (`reel/`) |

Never mix their toolchains. The main site has **no Node, no npm, no bundler, no package.json**.

## Ground rules (both sites)

1. **Never invent facts.** No made-up metrics, dates, job titles, links or quotes. Unknowns stay as
   strings starting with `TODO` and render as visible placeholders. Claims carried over from the old
   site are `verified: false` and render with an "unverified" marker until Vaibhav confirms them.
2. **Original art only.** The open-world look is inspired by the genre; never reproduce a real game's
   logo, fonts (e.g. Pricedown), art, screens ("Mission Passed", "Wasted"), names or places.
3. **Quality bar = Jakub Krehel's skills** in `.claude/skills/better-*` (accessibility, layout, writing,
   typography, colors, ui). Their exact values are exact (press scale 0.96 / 150 ms ease-out, stagger
   100 ms with opacity + 12 px rise over 300 ms, exits 150 ms, never `transition: all`). Run each
   skill's "Before you finish" table on UI you touch. `interface-review` and `variant` are user-invoked.
4. **Progressive enhancement.** Main site: every page complete and navigable with JS off.
5. **Motion rules.**
   - Animate only `transform` and `opacity`. No animated `filter`/blur, `clip-path`, `stroke-dashoffset`,
     colors, sizes or `backdrop-filter`.
   - `prefers-reduced-motion: reduce` → no intro, no 3D, no smooth scroll, no pinning, no parallax, no
     ambient loops; transforms become opacity fades. Keep an on-page pause control for anything that
     moves on its own for more than 5 s (WCAG 2.2.2).
   - Effects never make content visible: an element must look finished if its effect never runs.
6. **Performance.** Lighthouse ≥ 90 mobile and desktop. Lazy-load anything heavy (3D, GSAP, Lottie,
   Motion features) after first paint; 3D only on capable desktops, with a 2D or poster fallback and
   adaptive DPR. Pause rendering off-screen and in hidden tabs.
7. **Accessibility.** Visible focus, 44 px touch targets, keyboard paths for everything, focus moved to
   the new `h1` after client-side navigation and returned to the trigger after dialogs, no horizontal
   scroll at 320 px or 200 % zoom, measured contrast (≥ 4.5:1 text).

## Main site

### Commands

```bash
uv sync
scripts/tailwind.sh watch          # Tailwind v4 standalone binary → static/dist/app.css
uv run uvicorn app.main:app --reload --port 8000
```

```bash
uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest
```

```bash
uv run python scripts/todos.py      # every TODO and unverified claim in /content
uv run python scripts/importmap.py  # regenerate app/importmap.json (pins + SRI) after adding a CDN import
uv run python scripts/build_assets.py   # hashed asset tree for prod
```

CI (`.github/workflows/ci.yml`) runs ruff, ruff format, strict mypy, pytest and the asset build.

### Layout

- `CONTRACTS.md` is binding: routes, template context, `data-fx` effect API, page events
  (`vd:page`, `vd:page-leave`, `vd:motion`, ...), token names, CDN pins. Change it before changing a contract.
- `content/*.yaml` → `app/content.py` (Pydantic, validated at startup; a bad file stops the app).
- `app/main.py` `create_app()`: routes, per-request CSP nonce, security headers, 404 page.
- `app/ask.py`: `POST /api/ask`, Claude over SSE, grounded only in `/content` (TODOs stripped),
  per-IP + global rate limits, offline when `ANTHROPIC_API_KEY` is unset.
- `templates/`: Jinja pages and macros, server-rendered. `static/js/core/` (motion gate, htmx nav,
  palette), `static/js/fx/` and `static/js/webgl/` (effects), `static/shaders/`.

### Gotchas

- Hashing copies the whole static tree into `static/dist/<hash>/` so relative module imports and
  `import.meta.url` shader fetches keep working. Use `asset('path')` in templates; never hard-code `/static/dist/...`.
- Any inline executable `<script>` needs `nonce="{{ csp_nonce }}"`.
- CDN versions are pinned and must be at least two weeks old when added; postprocessing 6.39.x needs
  three `< 0.187`.
- Rate limiting keys on the **last** `X-Forwarded-For` entry (the one Render's proxy appends); earlier
  entries are client-controlled.
- Ask model defaults to `claude-opus-5-5` at `effort: low`, with server-side refusal fallback. Read the
  `claude-api` skill before touching `app/ask.py`; never guess SDK parameters.
- Tests must not depend on live content values (assert the rule, not today's data).

### Deploy

Render Blueprint (`render.yaml`, Docker). Set `ANTHROPIC_API_KEY` in the Render dashboard; never commit it.

## Open World prototype (`prototypes/open-world/`)

```bash
cd prototypes/open-world
pnpm install
pnpm exec parcel build index.html --dist-dir dist --no-source-maps --public-url ./
```

Ship `dist/*` + `intro.mp4` + `intro-poster.jpg` together (`site/` holds the current build).
Reel: `cd reel && npm install && npx remotion render src/index.ts Intro out/intro.mp4 --codec=h264 --crf=26`
(`IntroHD` for 1080p), then re-encode for the web at about CRF 33 (target ≤ 3 MB).

- `src/world.ts`: the single animation clock (GSAP ticker), lazy loading (`loadFx`, `upgradeTo3D`),
  render-on-demand, adaptive quality, 2D↔3D fallback.
- `src/city.ts`: 2D canvas city; skyline layers cached per night level, one re-cache per frame.
- `src/three-city.ts`: shared by the site (Three.js injected from jsDelivr) and the Remotion reel (npm).
- `src/data.ts`: content; same honesty rules as `/content`.

Keep these, or the bundle and Lighthouse regress:

- React **18.3.1** (React 19's react-dom is ~80 KB larger).
- Import `m` from `motion/react-m` and load features with `LazyMotion features={() => import('./motion-features')}`;
  don't use `useAnimate` (it pulls the full engine eagerly).
- GSAP, Lenis and both cities stay behind dynamic imports; first-load JS ≈ 75 KB gzipped.
- In GSAP-pinned horizontal sections, a `focusin` handler must scroll the run so the focused card is visible.
- Shared-layout cards (`layoutId`) unmount while their expanded view is open; restore focus to the
  remounted trigger afterwards.

## Working style

- Verify UI in a real browser (Playwright; Chromium is preinstalled) at 1440, 390 and 320 px, JS on and
  off, with reduced motion, keyboard only. Read the screenshots; don't claim a visual result you didn't see.
- Report what wasn't verified (real-GPU frame rate, screen readers, Safari/Firefox).
- Commit with clear messages; never commit secrets, `bin/`, `static/dist/` or `node_modules/`.
