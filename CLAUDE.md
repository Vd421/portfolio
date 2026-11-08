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

## Open World look & motion spec (`prototypes/open-world/`)

The prototype is an open-world-game-inspired portfolio: sunset city, game HUD, cinematic scroll. Everything
below is original art and copy under ground rule 2. No real game names, cars, logos or screens.

### Aesthetic

- **Palette** (tokens in one config file): dusk orange `#FF7A3D` → pink `#FF4F8B` sky gradient, deep teal
  shadows `#0E2A33`, near-black base `#0A0C10`, HUD white `#F4F1EA`, cash green `#3DDC84`, star gold
  `#FFC53D`. Measure contrast; text on gradients sits on a scrim.
- **Texture**: subtle film grain + soft vignette as static overlays (no animated filters). Sections read
  like painted posters: big flat shapes, hard shadows, generous negative space. One accent per screen.
- **Type**:
  - Name / display: **Anton** (self-host via `@fontsource/anton`, `font-display: swap`), uppercase,
    tight tracking (`-0.01em`), `clamp(3.5rem, 11vw, 9rem)`, text-wrap `balance`.
  - Name underline: a thick bar under the name (`0.12em` tall, cash-green or sunset gradient), drawn as a
    pseudo-element that animates `transform: scaleX(0 → 1)` from the left, 600 ms `cubic-bezier(.2,.8,.2,1)`,
    after the name lands. Static, full-width bar when reduced motion or JS is off.
  - HUD / labels: **JetBrains Mono** or **Space Mono**, uppercase, `0.08em` tracking, small sizes.
  - Body: **Inter** (or system UI), 16–18 px, 1.6 line-height, max 65ch.
  - Never Pricedown or any game font.
- Spacing on an 8 px scale; sections are full-viewport (`min-height: 100svh`) with consistent gutters.

### Loading screen (first visit per session only)

- Full-screen poster art (original illustration or my own photo) with a slow Ken Burns move:
  `transform: scale(1 → 1.08) translate(-1%, -1%)` over the whole duration, linear.
- Bottom: rotating "tips" from `src/data.ts` (`tips: string[]`, real facts about Vaibhav only; `TODO`
  entries are skipped). One tip per ~1.2 s, opacity + 8 px rise crossfade.
- Bottom-right: small spinning loader (`transform: rotate`) + mono "LOADING" label.
- ~3 s total, or until fonts + hero are ready (whichever is later, cap 4 s), then crossfade (400 ms
  opacity) into the site. **Skippable**: click, tap, Enter, Space or Esc; a visible "Skip" button.
- Content underneath is fully rendered and readable the whole time (overlay only). Store a
  `sessionStorage` flag (in try/catch) so it doesn't replay on every navigation.
- Reduced motion or JS off: no loading screen at all.

### Hero / HUD

- Name big in Anton with the underline above. Tagline below in body font, then a CTA row.
- Entrance: name reveals per word (SplitText, opacity + 24 px rise, 80 ms stagger), then underline,
  then tagline and HUD fade in. Total ≤ 1.4 s. Plays once.
- **Top-right HUD**:
  - Cash-style counter in green (`$` prefix, mono, tabular-nums) that ticks up via GSAP on a proxy
    object and writes text. Cycles labelled stats: years coding, projects shipped, GitHub commits.
    Values come from `src/data.ts`; unknown values stay `TODO` and render as a placeholder, never a
    guessed number. `aria-live="off"`; the final values exist as static text for screen readers.
  - 5 "wanted"-style stars (original SVG star) that light up one by one (opacity + scale 0.6 → 1,
    120 ms stagger) to show a skill level from `data.ts`. Label it, e.g. "SKILL LEVEL 4/5".
- **Bottom-left minimap**: circular, original stylized street grid in SVG, with a blip per section
  (Hero, About, Projects, Experience, Skills, Contact). The map rotates slightly with scroll
  (`rotate` mapped from scroll progress, ±12° max, via ScrollTrigger `scrub`). Active section's blip
  pulses once on enter. Blips are buttons that scroll to their section (keyboard + 44 px hit area).
  Mobile: minimap collapses into a bottom nav.
- Pause control for anything that loops > 5 s (counter cycling, ambient sky).

### Hypercar (hero centerpiece)

- An **original** low, wide, single-seat hypercar: long tail, central fin, narrow canopy,
  angular side intakes. Inspired by that silhouette class, not a copy of any game or real car. No
  in-game car names (don't call it "Deveste Eight" anywhere: code, copy, alt text, filenames).
- Desktop + capable GPU: low-poly Three.js model built from my own geometry (or a model I supply
  under a licence that allows it), lit for sunset, with a slow turntable and a subtle headlight glint.
  Lazy-load after first paint; pause off-screen and in hidden tabs.
- Fallback (mobile, reduced motion, no WebGL, JS off): a flat poster-style SVG/PNG of the same car.
- Scroll beat: as the hero scrolls out, the car drives across and out of frame (transform only,
  `scrub`), handing off to the next section.

### Scroll animation: one beat per section, not constant motion

- Every page/section gets **one** entrance moment when it enters the viewport (ScrollTrigger
  `start: "top 75%"`, `once: true`), not continuous per-frame effects everywhere.
- Default reveal: heading (opacity + 24 px rise, 500 ms), then children with the 100 ms stagger
  (opacity + 12 px rise over 300 ms) per the Krehel values.
- Signature beats (max one per section):
  - About ("stats"): stat bars fill via `scaleX` from the left, staggered.
  - Projects: horizontal pinned run of cards on desktop (keep the focus-scroll rule), stacked on mobile.
  - Experience: timeline line grows via `scaleY`, entries slide in alternating sides.
  - Skills: icons pop in on a radial layout (scale 0.8 → 1 + opacity).
  - Contact: a phone-style panel slides up from bottom-right.
- Lenis smooth scroll on desktop only; GSAP ticker drives Lenis (single clock in `src/world.ts`).
- All timings/eases/colors live in one config object (`src/motion-config.ts`).
- Reduced motion: no pinning, no scrub, no Lenis; every reveal becomes a 200 ms opacity fade or nothing.
- Everything must look finished if ScrollTrigger never runs (rule 5).

### Build order

1. Tokens, fonts and type scale. 2. Loading screen. 3. Hero name + underline + HUD.
4. Minimap. 5. Hypercar (2D fallback first, then 3D). 6. Section scroll beats.
Stop after step 3 for Vaibhav to review before continuing.

## Working style

- Verify UI in a real browser (Playwright; Chromium is preinstalled) at 1440, 390 and 320 px, JS on and
  off, with reduced motion, keyboard only. Read the screenshots; don't claim a visual result you didn't see.
- Report what wasn't verified (real-GPU frame rate, screen readers, Safari/Firefox).
- Commit with clear messages; never commit secrets, `bin/`, `static/dist/` or `node_modules/`.
