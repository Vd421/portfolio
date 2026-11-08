import { BODY, CANOPY, FIN, HEADLIGHT, INTAKE, TAILLIGHT, WHEELS, svgPath } from './car-shape'
import { colors } from './motion-config'

// Shared by the site (HeroCar) and the Remotion intro reel. No hooks, no app imports.
// Poster view: 1 unit = 110 px, origin at the ground under the car's centre.
const S = 110, OX = 300, OY = 214

/** Flat poster-style side view of the hypercar: the fallback and the first paint. */
export function CarPoster({ className = 'car-poster', style }: { className?: string; style?: import('react').CSSProperties }) {
  const wheel = (x: number) => (
    <g key={x}>
      <circle cx={OX + x * S} cy={OY - WHEELS.y * S} r={WHEELS.radius * S} fill="#0b0c0f" />
      <circle cx={OX + x * S} cy={OY - WHEELS.y * S} r={WHEELS.radius * S * 0.62} fill="none" stroke={colors.dusk} strokeWidth="3" />
      <circle cx={OX + x * S} cy={OY - WHEELS.y * S} r={WHEELS.radius * S * 0.16} fill="#1c222c" />
    </g>
  )
  const [[hx1, hy1], [hx2, hy2]] = HEADLIGHT
  const [[tx1, ty1], [tx2, ty2]] = TAILLIGHT
  return (
    <svg className={className} style={style} viewBox="0 0 600 260" aria-hidden="true">
      <defs>
        <linearGradient id="car-rim" x1="0" x2="1"><stop offset="0" stopColor={colors.pink} /><stop offset="1" stopColor={colors.dusk} /></linearGradient>
      </defs>
      <ellipse cx={OX} cy={OY + 4} rx="280" ry="16" fill="rgb(0 0 0 / 0.55)" />
      <path d={svgPath(FIN, S, OX, OY)} fill="#161c26" />
      <path d={svgPath(BODY, S, OX, OY)} fill="#161c26" />
      <path d={svgPath(INTAKE, S, OX, OY)} fill="#06080b" />
      <path d={svgPath(CANOPY, S, OX, OY)} fill="#0a0e13" />
      {/* Sunset rim light along the roofline */}
      <path d={BODY.slice(1, 9).map(([x, y], i) => `${i ? 'L' : 'M'}${(OX + x * S).toFixed(1)} ${(OY - y * S).toFixed(1)}`).join(' ')}
        fill="none" stroke="url(#car-rim)" strokeWidth="3" strokeLinejoin="round" />
      <path d={`M${OX + 0.55 * S} ${OY - 0.86 * S} L${OX - 0.15 * S} ${OY - 0.97 * S}`} stroke={colors.pink} strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
      {wheel(WHEELS.front)}{wheel(WHEELS.rear)}
      <line x1={OX + hx1 * S} y1={OY - hy1 * S} x2={OX + hx2 * S} y2={OY - hy2 * S} stroke={colors.hud} strokeWidth="5" strokeLinecap="round" />
      <line x1={OX + tx1 * S} y1={OY - ty1 * S} x2={OX + tx2 * S} y2={OY - ty2 * S} stroke={colors.pink} strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

