# vd: Open World

An open-world game styled take on the portfolio: an intro reel, a 3D city hero, a scroll-driven
landing page and a character-profile About page. Original art and type, not assets from any game.

| Layer | Tool | Where |
| --- | --- | --- |
| Loading screen | Remotion (`reel/`, `Poster`) | Text-free 3D city still → `src/assets/loading.{webp,jpg}` with a Ken Burns move, real-fact tips, ~3 s, skippable |
| Intro reel | Remotion (`reel/`, `Intro`) | 8 s showcase video for LinkedIn (not used on the page) |
| 3D hero | Three.js (`src/three-city.ts`) | Instanced towers, window and sky shaders, GPU traffic. Desktop only, loaded from jsDelivr after the intro |
| 2D city | Canvas 2D (`src/city.ts`) | Phones, reduced motion and the fallback when 3D is slow |
| Scroll | GSAP + ScrollTrigger + SplitText, Lenis | Pinned missions run, scrubbed titles, route line, night falling |
| UI motion | Motion (`motion/react-m` + `LazyMotion`) | Page transitions, hover/tap, staggered reveals, mission briefing layout animation |
| Icons | Lottie (`src/lottie.ts`) | Hand-written badge and mission ping, player loaded lazily |

## Design tokens

Every color, font, size, timing and ease lives in `src/motion-config.ts`. `applyTokens()` writes them to CSS
custom properties before the first render; GSAP (via CustomEase), Motion, Lottie and both city renderers
import the same object. Fonts are self-hosted (fontsource, Latin only) with metric-matched local fallbacks,
so the font swap causes no layout shift.

## Performance rules

- First load is React + page content only (about 75 KB gzipped JS). GSAP, Lenis, Motion's features,
  both cities and Three.js load after first paint.
- Animations change only `transform` and `opacity`.
- `prefers-reduced-motion`: no intro, no 3D, no smooth scroll or pinning, no ambient motion; Motion
  swaps transforms for fades. The HUD's Motion button pauses ambient motion for everyone else.
- Lighthouse (local, gzip): mobile 100 / 100 / 96, desktop 100 / 100 / 96 (performance / accessibility /
  best practices), CLS 0.001. The 96 is a CDN request the test sandbox could not reach.

## Build

```bash
pnpm install
pnpm exec parcel build index.html --dist-dir dist --no-source-maps --public-url ./
```

Serve `dist/` (the committed `site/` folder is the current build). To re-render the reel:

```bash
cd reel && npm install
npx remotion render src/index.ts Intro out/intro.mp4 --codec=h264 --crf=26
```

`IntroHD` renders the same reel at 1920×1080.
