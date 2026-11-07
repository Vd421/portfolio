// Connection lines: each vertex knows its own rest position and its partner's, runs the
// same displacement on both, and fades by stretched length. Pulses travel along them.
attribute vec3 aRest;
attribute vec3 aOther;
attribute float aEnd;     // 0 at the start vertex, 1 at the end
attribute float aSeed;
uniform float uDebug;
varying float vAlpha;
varying float vT;
varying float vHead;
varying float vCarry;
varying float vHeat;

#include <noise>

void main() {
  float lensA, lensB;
  vec3 a = displace(aRest, lensA);
  vec3 b = displace(aOther, lensB);
  vec4 mv = modelViewMatrix * vec4(a, 1.0);
  gl_Position = projectionMatrix * mv;
  float rest = length(aOther - aRest);
  float stretch = length(b - a) / max(rest, 1e-3);
  float depth = clamp(-mv.z, 0.1, 40.0);
  float edge = smoothstep(1.0, 0.7, abs(aRest.x) / 9.0) * smoothstep(-15.0, -8.0, aRest.z) * smoothstep(4.0, 1.8, aRest.z);
  vHeat = clamp(max(lensA, lensB) * 1.4, 0.0, 1.0);
  vAlpha = edge * smoothstep(1.9, 1.0, stretch) * smoothstep(16.0, 3.0, depth) * (0.16 + 0.5 * vHeat);
  vAlpha *= mix(safeFade(gl_Position), 1.0, vHeat);
  vAlpha = mix(vAlpha, edge * 0.5, uDebug);
  // A pulse position travelling 0 → 1 along this edge, at a per-edge rate.
  float speed = 0.08 + fract(aSeed * 7.31) * 0.12;
  vHead = fract(uTime * speed + aSeed) * 1.4 - 0.2;
  vCarry = 1.0 - step(0.12, fract(aSeed * 13.7));   // ~12% of edges carry signal
  vT = aEnd;
}
