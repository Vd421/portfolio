// The hero hypercar: an original design (low, wide, single seat, long tail, central fin, narrow canopy,
// angular side intakes). Not modelled on any game or production car. One set of side-profile points
// feeds both the flat SVG poster and the low-poly 3D model, so the two always match.
// Units: x along the car (nose at +x), y up. Length ~5, wheelbase 3.1.

export type Pt = [number, number]

/** Main body side profile, clockwise from the nose tip. */
export const BODY: Pt[] = [
  [2.5, 0.2], [2.38, 0.34], [1.6, 0.48], [0.95, 0.6], [0.2, 0.7], [-0.7, 0.74],
  [-1.7, 0.66], [-2.35, 0.6], [-2.55, 0.5], [-2.5, 0.28], [-2.25, 0.14], [-1.2, 0.12], [1.2, 0.12], [2.1, 0.14],
]

/** Narrow canopy, sitting on the body. */
export const CANOPY: Pt[] = [[1.05, 0.6], [0.55, 0.88], [-0.15, 1.0], [-0.75, 0.96], [-1.15, 0.72], [-0.7, 0.72], [0.2, 0.68]]

/** Central fin running from the canopy back over the tail. */
export const FIN: Pt[] = [[-0.6, 0.94], [-1.8, 1.22], [-2.32, 1.24], [-2.36, 0.62], [-1.2, 0.72]]

/** Angular side intake (drawn dark on the flank). */
export const INTAKE: Pt[] = [[0.1, 0.5], [-0.75, 0.62], [-1.15, 0.42], [-0.35, 0.3]]

export const WHEELS = { front: 1.55, rear: -1.55, radius: 0.36, y: 0.36 }
export const HEADLIGHT: Pt[] = [[2.32, 0.36], [1.85, 0.44]]
export const TAILLIGHT: Pt[] = [[-2.52, 0.5], [-2.4, 0.56]]

/** SVG path data for a profile, mapped into a viewBox where 1 unit = `s` px and y is flipped. */
export function svgPath(pts: Pt[], s: number, ox: number, oy: number) {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(ox + x * s).toFixed(1)} ${(oy - y * s).toFixed(1)}`).join(' ') + ' Z'
}
