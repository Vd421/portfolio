#version 300 es
// Hover distortion for images: a pointer-centred lens ripple with RGB split that follows
// pointer velocity. One shared WebGL2 context, moved between figures.
precision highp float;
uniform sampler2D uTex;
uniform vec2 uPointer;   // 0..1 in element space
uniform vec2 uVel;       // pointer velocity, element units / s (smoothed)
uniform float uHover;    // 0..1 eased
uniform float uTime;
uniform vec2 uCover;     // object-fit: cover scale
in vec2 vUv;
out vec4 outColor;

vec2 cover(vec2 uv) { return (uv - 0.5) * uCover + 0.5; }

void main() {
  vec2 uv = vUv;
  vec2 d = uv - uPointer;
  float r = length(d);
  float lens = exp(-r * r * 18.0) * uHover;
  float wave = sin(r * 38.0 - uTime * 6.0) * 0.004 * lens;
  vec2 dir = r > 0.0001 ? d / r : vec2(0.0);
  uv -= d * lens * 0.18;          // magnify under the pointer
  uv += dir * wave;
  vec2 split = uVel * 0.012 * uHover + dir * lens * 0.004;
  float cr = texture(uTex, cover(uv + split)).r;
  vec4 cg = texture(uTex, cover(uv));
  float cb = texture(uTex, cover(uv - split)).b;
  vec3 col = vec3(cr, cg.g, cb);
  // faint scanlines inside the lens, operator-display feel
  col *= 1.0 - lens * 0.06 * step(0.5, fract(vUv.y * 180.0));
  outColor = vec4(col, cg.a);
}
