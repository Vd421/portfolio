// Backdrop: the page background token with a faint accent haze on the horizon line,
// so the field sits in atmosphere instead of on a flat fill.
precision highp float;
uniform vec3 uColorBg;
uniform vec3 uColorAccent;
uniform float uHorizon;   // screen-space y of the horizon (0 bottom .. 1 top)
uniform float uScroll;
varying vec2 vUv;

void main() {
  float d = vUv.y - uHorizon;
  // Linear light: tiny values read clearly once encoded to sRGB.
  float haze = exp(-d * d * 60.0) * 0.010 + exp(-max(d, 0.0) * 4.0) * 0.0015;
  float floorGlow = exp(-pow(vUv.y + 0.2, 2.0) * 3.0) * 0.003;
  vec3 col = uColorBg + uColorAccent * (haze + floorGlow) * (1.0 - uScroll * 0.6);
  gl_FragColor = vec4(col, 1.0);
}
