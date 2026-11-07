// Points of the neural field. The noise chunk is spliced in by field.js.
attribute vec3 aRest;
attribute float aSeed;
uniform float uPixelRatio;
uniform float uSize;
uniform float uScanZ;
uniform float uDebug;
varying float vAlpha;
varying float vHeat;
varying float vNode;

#include <noise>

void main() {
  float lens;
  vec3 q = displace(aRest, lens);
  vec4 mv = modelViewMatrix * vec4(q, 1.0);
  gl_Position = projectionMatrix * mv;

  float node = step(0.986, aSeed);                 // ~1.4% are brighter hub nodes
  float scan = exp(-pow((aRest.z - uScanZ) * 1.6, 2.0));
  float depth = clamp(-mv.z, 0.1, 40.0);
  vHeat = clamp(lens * 1.2 + scan * 0.55 + q.y * 0.35, 0.0, 1.6);
  vNode = node;
  // Edge and distance fade, so the field dissolves instead of ending.
  float edge = smoothstep(1.0, 0.72, abs(aRest.x) / 9.0) * smoothstep(-16.0, -9.0, aRest.z) * smoothstep(4.5, 2.0, aRest.z);
  vAlpha = edge * (0.35 + 0.65 * smoothstep(18.0, 2.0, depth)) * mix(safeFade(gl_Position), 1.0, lens);
  float size = uSize * (1.0 + node * 1.8 + lens * 1.4 + scan * 0.6);
  gl_PointSize = mix(size * uPixelRatio * (6.0 / depth), 2.0 * uPixelRatio, uDebug);
}
