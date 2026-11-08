# Studio

Matte, premium redesign of the portfolio: graphite + one ember accent, Inter Variable with Instrument
Serif italic accents, a match-strike WebGL smoke intro, a staggered hero entrance and Apple-like
pill buttons (press 0.96, pointer sheen, magnetic pull). Content comes from `src/data.ts` (resume facts).

```bash
pnpm install
pnpm exec parcel build index.html --dist-dir dist --no-source-maps --public-url ./
```

- Intro: `src/Intro.tsx`. First visit per session; skipped under reduced motion, Save-Data, or WebGL
  without a real GPU (`failIfMajorPerformanceCaveat`). QA params: `?anygl` allows software WebGL,
  `?introAt=1.4` freezes the intro at that second.
- Motion is transform + opacity only; hidden entrance states exist only while JS arms them
  (`html.seq-armed`, `html.rv-armed`), with a 6 s failsafe.
- Contrast (on #141414 / #1C1C1E / #232325) is listed at the top of `src/index.css`.
