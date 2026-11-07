precision highp float;
uniform vec3 uColorLine;
uniform vec3 uColorAccent;
uniform float uDebug;
varying float vAlpha;
varying float vT;
varying float vHead;
varying float vCarry;
varying float vHeat;

void main() {
  float vPulse = vCarry * exp(-pow((vT - vHead) * 7.0, 2.0));
  vec3 col = mix(uColorLine, uColorAccent, vHeat);
  float a = vAlpha;
  col += uColorAccent * vPulse * 2.4;   // > 1.0: blooms
  a = max(a, vPulse * 0.9 * step(0.001, vAlpha));
  if (uDebug > 0.5) { col = uColorAccent * 0.8; }
  gl_FragColor = vec4(col * a, a);
}
