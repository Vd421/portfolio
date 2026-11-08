# vd: Open World (prototype)

An open-world game styled take on the portfolio: a cinematic city intro, a scroll-driven
landing page and a character-profile About page. React + GSAP (ScrollTrigger, SplitText) + Lenis,
with the city drawn procedurally on a Canvas 2D (`src/city.ts`). Original artwork and type,
not assets from any existing game.

- `vd-open-world.html` is the built, self-contained page (open it in a browser).
- Content lives in `src/data.ts`. Unknown facts render as visible TODO chips.

## Rebuild

Uses the web-artifacts-builder toolchain (pnpm, Parcel, html-inline):

```bash
pnpm install
pnpm exec parcel build index.html --dist-dir dist --no-source-maps
pnpm exec html-inline dist/index.html > vd-open-world.html
```
