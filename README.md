# vd

Vaibhav Dhir's portfolio. Server-rendered pages that read and work with JavaScript off, then add motion, WebGL and a command palette that can answer questions about the work.

## Stack

- **Server:** Python 3.12, FastAPI, Jinja2, uvicorn. Content is typed YAML validated by Pydantic at startup.
- **Pages:** HTML first, enhanced with htmx (boosted navigation) and Tailwind CSS v4 through its standalone CLI. No Node, no bundler, no `package.json`.
- **Motion:** GSAP (ScrollTrigger, SplitText), Lenis, three.js and postprocessing, loaded as ES modules from jsDelivr through an import map with integrity hashes.
- **Ask vd:** the palette streams answers from Claude (Anthropic API), grounded only in `/content`.
- **Deploy:** Docker on Render.

`CONTRACTS.md` defines the interfaces between the server, templates and front-end code.

## Local development

You need [uv](https://docs.astral.sh/uv/). It installs Python 3.12 if you don't have it.

```bash
uv sync                      # install dependencies
scripts/tailwind.sh watch    # terminal 1: rebuild static/dist/app.css on change
uv run uvicorn app.main:app --reload --port 8000   # terminal 2
```

Open http://localhost:8000. `scripts/tailwind.sh` downloads the pinned Tailwind binary into `bin/` on first run; `scripts/tailwind.sh build` makes a one-off minified build.

To try Ask vd locally, export `ANTHROPIC_API_KEY` before starting uvicorn. Without it the palette answers with an offline message and everything else works.

Checks (CI runs the same):

```bash
uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest
```

## Editing content

Everything the site says lives in `content/`:

| File | What it holds |
| --- | --- |
| `site.yaml` | Name, roles, tagline, about, contact links, education |
| `experience.yaml` | Roles, newest first |
| `skills.yaml` | Skill groups |
| `projects/*.yaml` | One file per project; `case_study` adds the Replay-style page |

The models are in `app/content.py`. Unknown fields, bad slugs and out-of-order case-study chapters fail at startup with a message naming the field.

Unknown facts stay as strings starting with `TODO`. They render as visible placeholders and never reach Ask vd. Claims carried over from earlier material are marked `verified: false` until confirmed. To list everything still to fill in or confirm:

```bash
uv run python scripts/todos.py            # prints a checklist
uv run python scripts/todos.py --strict   # also exits 1 if anything is left
```

## Static assets and caching

In development, `asset("js/main.js")` returns `/static/js/main.js` and nothing is cached.

For production, `scripts/build_assets.py` copies `static/js`, `static/shaders`, `static/fonts`, `static/img` and the Tailwind output into one directory named after a hash of all of them, `static/dist/<hash>/`, and writes `static/dist/manifest.json`. With `ENV=prod`, `asset()` returns `/static/dist/<hash>/js/main.js`, and everything under a hashed directory is served with `Cache-Control: public, max-age=31536000, immutable`. HTML, API responses and unhashed files get `no-cache`.

The whole tree is hashed, rather than each file renamed, because the front-end code refers to files by relative URL: `main.js` imports `./core/motion.js`, effects fetch shaders relative to `import.meta.url`, and the CSS loads fonts with `url(../fonts/…)`. Inside one hashed directory those references resolve exactly as they do in development, with no rewriting and no import-map entries for our own modules. The cost is that any change produces a new hash for every file, which is fine at this size.

Tailwind writes `static/dist/app.css`; in the hashed tree it becomes `css/app.css`, so `url(../fonts/…)` points at the fonts in both modes. Templates can ask for either `asset('dist/app.css')` or `asset('css/app.css')`.

## Import map

`app/importmap.json` holds the import map for the pinned CDN modules (versions in `CONTRACTS.md` and `app/importmap.py`), plus a sha384 `integrity` entry for every module the browser can reach from each entry point, and an SRI hash for htmx. Regenerate it after changing a pin or importing a new `three/addons/…` or `gsap/…` file:

```bash
uv run python scripts/importmap.py
```

The script downloads the npm tarballs (jsDelivr serves the same bytes), follows static and literal dynamic imports through each package (three's `three.core.js`, GSAP's internals), scans `static/js` for bare imports, and fails if anything imports a specifier the map doesn't define. Commit the result.

Templates render it with `{{ import_map() }}` and htmx with `{{ cdn_script("htmx") }}`.

## Security headers

Every response carries a Content-Security-Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, `X-Frame-Options: DENY`, and HSTS in production.

Scripts may come only from this origin and `https://cdn.jsdelivr.net`. The one inline script, the import map, carries a per-request nonce: the middleware generates it, `import_map()` adds it, and the header allows `'nonce-…'`. Any other inline script must use `nonce="{{ csp_nonce }}"`. JSON data blocks (`application/json`, `application/ld+json`) don't execute and need no nonce. Styles allow `'unsafe-inline'` because templates set custom properties in `style` attributes.

## Ask vd

`POST /api/ask` takes `{"question": "…", "history": [...]}` and streams Server-Sent Events (shapes in `CONTRACTS.md`). The system prompt is built only from `/content`, with placeholders removed and unconfirmed claims labeled, and is cached between requests. Requests are rate limited per client IP (first `X-Forwarded-For` hop) and across all visitors. With no `ANTHROPIC_API_KEY`, the endpoint answers with an `offline` event.

## Deploy to Render

`render.yaml` is a Blueprint for one Docker web service with a health check on `/healthz`.

1. Push the repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Enter `ANTHROPIC_API_KEY` when asked (it is `sync: false`, so it is never stored in the repo). Leave it empty to run with Ask vd offline.

The Docker build installs dependencies with uv, downloads Tailwind, builds the CSS and the hashed assets, and runs uvicorn as a non-root user on `$PORT` with proxy headers trusted.

To build and run the image yourself:

```bash
docker build -t vd .
docker run --rm -p 8000:10000 -e ANTHROPIC_API_KEY vd
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | unset | Enables Ask vd. Never logged. |
| `ASK_MODEL` | `claude-opus-5-5` | Model for Ask vd |
| `ASK_RATE` | `8/600` | Requests per client IP per window, as `count/seconds` |
| `ASK_GLOBAL_RATE` | `200/3600` | Requests across all visitors per window |
| `ASK_MAX_TOKENS` | `2048` | Output cap per answer |
| `ENV` | `dev` (`prod` on Render) | `prod` turns on hashed assets and HSTS |
| `SITE_URL` | `RENDER_EXTERNAL_URL`, else the request URL | Public origin for canonical and Open Graph links |
| `RENDER_GIT_COMMIT` | `local` | Build shown in the HUD (set by Render) |
| `RENDER_REGION` | `local` | Region shown in the HUD (set by Render) |
| `PORT` | `10000` in Docker | Port uvicorn listens on (set by Render) |
