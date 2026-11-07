uniform vec3 uColorBase;
uniform vec3 uColorAccent;
uniform vec3 uColorHot;
uniform float uDebug;
varying float vAlpha;
varying float vHeat;
varying float vNode;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float disc = smoothstep(0.5, 0.18, d);
  float core = smoothstep(0.22, 0.0, d);
  vec3 col = mix(uColorBase, uColorAccent, clamp(vHeat, 0.0, 1.0));
  col = mix(col, uColorHot, clamp(vHeat - 1.0, 0.0, 1.0));
  // Hub nodes and hot points exceed 1.0 so only they feed the bloom threshold.
  col *= 1.0 + vNode * 1.6 + core * vHeat * 1.2;
  float a = disc * vAlpha * (0.55 + 0.45 * vNode);
  if (uDebug > 0.5) { col = uColorAccent; a = vAlpha * step(max(abs(c.x), abs(c.y)), 0.5); }
  if (a < 0.01) discard;
  gl_FragColor = vec4(col * a, a);
  #include <colorspace_fragment>
}
