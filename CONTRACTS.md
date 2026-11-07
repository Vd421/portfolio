# Contracts

The interfaces between the three workstreams. Change this file before changing a contract, and say so in your report.

## Ownership

| Area | Owner | Paths |
| --- | --- | --- |
| Platform | Engineer A | `app/`, `content/`, `tests/`, `scripts/` (except `tailwind.sh` usage), `pyproject.toml`, `Dockerfile`, `render.yaml`, `.github/` |
| Interface system | Engineer B | `templates/`, `static/css/`, `static/js/core/`, `static/img/` |
| Motion and WebGL | Engineer C | `static/js/fx/`, `static/js/webgl/`, `static/js/main.js`, `static/shaders/` |

Never edit another owner's files. If you need a change there, describe it in your final report.

## Non-negotiables

1. **Server-rendered first.** Every page is complete, readable and navigable with JavaScript disabled. JS only enhances.
2. **Jakub Krehel's skills are the quality bar.** `.claude/skills/better-*/SKILL.md`. Exact values in `better-ui` are exact.
3. **Never invent facts.** Content comes only from `/content`. Unknowns stay as `TODO…` strings and render as visible placeholders.
4. **Motion is opt-in.** Movement, scale, blur and parallax run only when motion is allowed (see Motion gate). Reduced motion gets opacity cross-fades.
5. **No Node, no bundler, no package.json.**

## Routes (A)

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/` | `pages/home.html`, `page="home"` |
| GET | `/work/{slug}` | `pages/replay.html` when the project has a `case_study`, else `pages/work.html`; `page="work"` |
| GET | `/api/status` | JSON, see below |
| POST | `/api/ask` | `text/event-stream`, see below |
| GET | `/healthz` | `{"ok": true}` |
| any 404 | | `pages/404.html`, `page="404"`, status 404 |

### Template context (A provides, B consumes)

Every page gets `site: Site`, `content: Content`, `page: str`, `status: StatusSnapshot` (initial HUD values, so the HUD is correct without JS), `ask_enabled: bool`, and the global functions `asset(path) -> str` (hashed URL) and `import_map() -> Markup` (the `<script type="importmap">` tag). Work pages also get `project: Project`. Models are in `app/content.py`. Jinja test `is todo` marks placeholders: `{% if value is todo %}`.

### `GET /api/status`

```json
{ "status": "nominal", "uptime_s": 1234, "build": "a1b2c3d", "region": "oregon",
  "python": "3.12.8", "server_time": "2026-11-07T10:00:00Z", "ask": "online" }
```

`status` is `"nominal" | "degraded"`. `ask` is `"online" | "offline"`. `build` and `region` come from env (`RENDER_GIT_COMMIT`, `RENDER_REGION`), else `"local"`.

### `POST /api/ask`

Request JSON: `{ "question": str (1–500 chars), "history": [{"role": "user"|"assistant", "content": str}] (max 6) }`.

Response: `text/event-stream`. Events, in order:

```
event: token
data: {"text": "partial answer"}

event: done
data: {"stop_reason": "end_turn"}
```

On failure, a single `event: error` with `data: {"code": "offline"|"rate_limited"|"invalid"|"upstream", "message": "..."}` and then the stream ends. `offline` when no API key. Rate limit also answers `429` before streaming starts, with the same JSON body. Answers are grounded only in `/content`.

## Page structure (B)

`templates/base.html` renders, in order:

1. `<a class="skip-link" href="#main">Skip to content</a>`
2. `<header id="site-header">` with nav (links to `/#work`, `/#experience`, `/#about`, `/#contact`, and a button that opens the palette).
3. `<aside id="hud" aria-label="System status">`, see HUD.
4. `<main id="main" tabindex="-1" data-page="{{ page }}">`
5. `<footer>`
6. `<dialog id="palette">`, see Palette.
7. `<div id="boot" hidden>`, empty boot overlay; C fills and shows it.
8. `<div id="announcer" role="status" aria-live="polite" class="sr-only"></div>`, rendered empty.
9. `<div id="fx-layer" aria-hidden="true">` for the cursor and transition canvas. Decorative only, `pointer-events: none`.

`<body hx-boost="true">`. Boosted navigation swaps `#main` only (`hx-select="#main" hx-target="#main" hx-swap="outerHTML transition:true"`). The header, HUD, palette and fx layer persist across navigations.

### Motion gate (B implements `static/js/core/motion.js`)

```js
export function motionAllowed(): boolean       // false if prefers-reduced-motion: reduce OR the user chose "still"
export function onMotionChange(cb): () => void  // cb(allowed); returns unsubscribe
```

It sets `<html data-motion="live|still">` and dispatches `vd:motion` with `detail: { allowed }`. The HUD toggle is `<button id="motion-toggle" aria-pressed="true|false">` (label "Motion"), and the choice persists in `localStorage` (`vd:motion`), wrapped in try/catch.

CSS motion uses: `@media (prefers-reduced-motion: no-preference) { :root:not([data-motion="still"]) … }`.

### Page lifecycle events (B dispatches on `document`, C listens)

| Event | When | `detail` |
| --- | --- | --- |
| `vd:page-leave` | Before a boosted swap | `{ from: page }` |
| `vd:page` | After a page is ready: initial load and after every swap settles | `{ page, root: HTMLElement }` (`root` is the new `#main`) |
| `vd:motion` | Motion preference changed | `{ allowed }` |
| `vd:palette` | Palette opened or closed | `{ open }` |
| `vd:boot-done` | Boot sequence finished or skipped (C dispatches) | `{}` |
| `vd:konami` | Konami code entered (C dispatches) | `{}` |

After a swap B updates `document.title`, moves focus to the new `h1` (`tabindex="-1"`), and writes "Navigated to {title}" into `#announcer`.

### Effects API (B writes markup, C implements)

Declare with `data-fx`, space-separated. C binds on every `vd:page` within `detail.root`, and unbinds on `vd:page-leave`. Every effect is a no-op when motion is not allowed, and the element must look finished without it.

| Token | On | Behavior |
| --- | --- | --- |
| `split` | Headings, short text | Reveal by `data-fx-split="lines|words|chars"` (default `words`) when scrolled in. Uses SplitText with its `aria` option, so the accessible name stays the original text. |
| `scramble` | Links, labels, short text | Decode effect on hover and focus. Real text stays in the DOM; the scramble renders in an `aria-hidden` overlay. |
| `kinetic` | Section titles (`h2`) | Width and weight axes scrub with scroll (`font-stretch`, `font-weight`; Mona Sans `wdth` 75–125, `wght` 200–900). |
| `magnetic` | Buttons and button-like links | Pulled toward the pointer, `data-fx-strength` (default `0.3`). Fine pointers only. |
| `tilt` | Cards | 3D tilt toward the pointer, max 6°. Fine pointers only. |
| `distort` | `<figure>` containing an `<img>` | WebGL hover distortion over the image. Fine pointers only. |
| `parallax` | Decorative layers | Translate by `data-depth` (−1 to 1) on scroll. Disabled under reduced motion. |
| `reveal` | Containers | Children with `data-fx-item` stagger in, 100 ms apart (better-ui values). |
| `hscroll` | `#work` gallery section | Pinned horizontal scroll of its `[data-fx-track]`. Without it, the track is a normal grid. |

Other hooks:

- **Hero:** `<div id="hero-stage" data-webgl="field" aria-hidden="true">` containing a static CSS poster. C mounts a canvas inside and fades the poster out once the first frame renders.
- **HUD:** elements with `data-hud="clock|uptime|build|region|ask|fps"`, server-rendered with initial values from `status`. C updates them live (polling `/api/status` every 30 s while visible). `fps` stays empty until C fills it.
- **Cursor:** C owns it entirely, inside `#fx-layer`, only for `(hover: hover) and (pointer: fine)`. Never hide the native cursor on elements where text entry or selection happens, never cover focus rings.
- **Replay player:** see below.

### Replay case study (B markup, C choreography)

```html
<section id="replay" data-replay data-duration="180">
  <div class="player" data-replay-player>
    <label for="replay-scrub">Playhead</label>
    <input id="replay-scrub" type="range" min="0" max="180" step="1" value="0"
           aria-valuetext="00:00, Session start">
    <output data-replay-time>00:00</output>
    <ol data-replay-markers>…one <li><a href="#chapter-{id}"> per chapter, positioned by `at`…</ol>
  </div>
  <article id="chapter-{id}" data-chapter data-at="{at}">…</article>
  <aside class="flag" data-flag data-at="{at}" data-severity="error|warning">…</aside>
</section>
```

Without JS: chapters read top to bottom, flags are visible callouts, marker links jump to chapters. With JS (C): scroll position drives the playhead (ScrollTrigger scrub), dragging or arrowing the range scrolls to the matching position, flags pop in as the playhead passes them, and a ghost cursor replays a path across the stage. Flags never use live regions (no announcement spam). They are content.

### Palette (B, `static/js/core/palette.js`)

`<dialog id="palette" aria-label="Command palette">` opened with `showModal()` by Cmd/Ctrl+K, by `/`, and by the header button. It contains `<form>` with `<label>` + `<input id="palette-input">` (16 px on mobile) and a log `<ol id="palette-log">`. Built-ins run locally: `help`, `whoami`, `projects`, `open <slug>`, `experience`, `contact`, `hire vd`, `motion on|off`, `clear`. Anything else streams from `POST /api/ask`. When `ask_enabled` is false, unknown input answers with the offline message and suggests `help`.

## Visual tokens (B defines in `static/css/tokens.css`, C reads)

C reads colors for WebGL with `getComputedStyle(document.documentElement).getPropertyValue('--color-…')`. Names are fixed:

- Color roles: `--color-bg`, `--color-bg-raised`, `--color-bg-sunken`, `--color-border`, `--color-border-strong`, `--color-text`, `--color-text-secondary`, `--color-text-tertiary`, `--color-accent`, `--color-accent-text`, `--color-accent-glow`, `--color-on-accent`, `--color-danger`, `--color-danger-text`, `--color-warning`, `--color-warning-text`, `--color-focus`.
- Easing: `--ease-out: cubic-bezier(0.2, 0, 0, 1)`, `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)`.
- Durations: `--dur-instant: 100ms`, `--dur-fast: 150ms`, `--dur-base: 300ms`, `--dur-slow: 600ms`.
- Fonts: `--font-sans: "Mona Sans", …`, `--font-mono: "Martian Mono", …`. Files in `static/fonts/` (OFL).
- Z layers: `--z-hud: 40`, `--z-header: 50`, `--z-fx: 60`, `--z-boot: 90`.

## Third-party modules (C imports, A serves the import map)

Pinned, at least two weeks old. Loaded from jsDelivr through the import map in `base.html` (`{{ import_map() }}`). The import map carries `integrity` hashes generated by `scripts/importmap.py`.

| Specifier | URL |
| --- | --- |
| `three` | `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js` |
| `three/addons/` | `https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/` |
| `postprocessing` | `https://cdn.jsdelivr.net/npm/postprocessing@6.39.5/build/index.js` |
| `gsap` | `https://cdn.jsdelivr.net/npm/gsap@3.15.0/index.js` |
| `gsap/` | `https://cdn.jsdelivr.net/npm/gsap@3.15.0/` (`gsap/ScrollTrigger.js`, `gsap/SplitText.js`) |
| `lenis` | `https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.mjs` |

htmx is a classic deferred script: `https://cdn.jsdelivr.net/npm/htmx.org@2.0.11/dist/htmx.min.js`.

Entry point: `<script type="module" src="{{ asset('js/main.js') }}">` (C). `main.js` imports `core/*` (B) eagerly and dynamically imports `fx/*` and `webgl/*` only when motion is allowed and the page uses them. Three.js loads only when the hero is near the viewport, motion is allowed, WebGL2 exists and `navigator.connection.saveData` is not true.

## Additions agreed during the build

- **Replay player:** `.player` also contains `<div data-replay-stage aria-hidden="true">` with a `[data-replay-cursor]`; each marker `<li>` carries `--span` (its chapter's share of the timeline). A flag's `data-at` is the midpoint of its chapter's span (`ui.flag_at` macro), so home and the case study agree.
- **Pending flags:** flags ahead of the playhead are dimmed to `opacity: 0.8` (not lower: their text must still pass 4.5:1, measured at 5.9:1 and above).
- **HUD:** `[data-hud="status"]` and `[data-hud="ask"]` hold lowercase values and style through `data-state`. The clock carries `data-tz="utc"`; uptime carries `data-value` (seconds).
- **Boot guard:** an inline `<script nonce>` in `<head>` sets `html[data-boot="pending"]` on a first visit when motion is allowed. CSS covers the page with `--color-bg` until `boot.js` takes over, with a 3.5 s CSS failsafe that uncovers it if JS fails.
- **Shared-element morph:** `data-vt="title|media"` marks card titles, project and case-study `h1`s and media figures. `transitions.js` sets `view-transition-name: vt-title-{slug}` / `vt-media-{slug}` on the clicked card and its target.
- **Back/forward:** htmx history snapshots are off (they would replace `<body>`); `nav.js` re-fetches into `#main` and restores the saved scroll position.
- **Ask errors:** a refusal after partial tokens sends `event: error` with `code: "upstream"`, and the client discards the partial answer. Invalid input returns 422 (413 if over 16 KB) with a single SSE `error`/`invalid` event.
- **Core modules:** `main.js` loads `core/{motion,nav,palette}` by name (the `CORE` list). Add new core modules there.

## Performance budget

- 60 fps on the hero at 4× CPU throttle in Chrome. One shared rAF loop (the GSAP ticker).
- Adaptive DPR between 1 and 1.75, stepped by measured frame time. Pause scenes off-screen and when the tab is hidden.
- First load before idle: HTML + CSS + fonts + `main.js` + `core/*` under 250 KB transferred, excluding the CDN libraries.
- No layout shift from fonts (`font-display: swap` plus metric-matched fallbacks) or from effects.

## Local testing

- Run: `uv run uvicorn app.main:app --reload --port 8000` after `scripts/tailwind.sh`.
- This sandbox cannot reach jsDelivr. A Playwright helper serves the pinned libraries from local copies; its path is given in your brief. Real visitors use the CDN.
