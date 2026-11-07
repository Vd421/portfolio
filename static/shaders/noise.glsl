// Simplex 3D noise (Ashima Arts / Stefan Gustavson, MIT) + curl and the shared field
// displacement. Included by field.vert.glsl and lines.vert.glsl so points and their
// connection lines move as one mesh.

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Divergence-free 2D drift on the ground plane: curl of a scalar potential (∂ψ/∂z, −∂ψ/∂x).
vec2 curl2(vec3 p) {
  const float e = 0.12;
  float n1 = snoise(p + vec3(0.0, 0.0, e));
  float n2 = snoise(p - vec3(0.0, 0.0, e));
  float n3 = snoise(p + vec3(e, 0.0, 0.0));
  float n4 = snoise(p - vec3(e, 0.0, 0.0));
  return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}

uniform float uTime;
uniform float uScroll;   // 0 at the top of the hero, 1 when it has scrolled away
uniform vec3 uPointer;   // pointer on the ground plane (world)
uniform float uPointerOn;
uniform float uPulse;    // click shock, 0..1 decaying

// Shared displacement: terrain + curl drift + breathing + pointer lens.
vec3 displace(vec3 p, out float lens) {
  float t = uTime * 0.045;
  float h = snoise(vec3(p.x * 0.16, p.z * 0.16 - t, t * 0.6)) * 0.62
          + snoise(vec3(p.x * 0.48, p.z * 0.48, t * 1.9)) * 0.14;
  vec2 c = curl2(vec3(p.x * 0.22, t * 0.8, p.z * 0.22)) * 0.09;
  vec3 q = vec3(p.x + c.x, h * (1.0 + uScroll * 1.6), p.z + c.y);
  q.y += sin(uTime * 0.55 + p.z * 0.45 + p.x * 0.12) * 0.05;   // breathing
  vec2 d = q.xz - uPointer.xz;
  float r2 = dot(d, d);
  lens = exp(-r2 * 0.9) * uPointerOn;
  q.y += lens * 0.75;
  q.xz += d * lens * 0.18;
  // click shock ring
  float ring = exp(-pow(sqrt(r2) - (1.0 - uPulse) * 6.0, 2.0) * 3.0) * uPulse;
  q.y += ring * 0.35;
  return q;
}

// Legibility: soften the field behind the hero copy. uSafe = text box in NDC (x0, y0, x1, y1).
uniform vec4 uSafe;
float safeFade(vec4 clip) {
  vec2 n = clip.xy / clip.w;
  float inX = smoothstep(uSafe.x - 0.25, uSafe.x + 0.1, n.x) * (1.0 - smoothstep(uSafe.z - 0.1, uSafe.z + 0.25, n.x));
  float inY = smoothstep(uSafe.y - 0.2, uSafe.y + 0.1, n.y) * (1.0 - smoothstep(uSafe.w - 0.1, uSafe.w + 0.2, n.y));
  return 1.0 - 0.72 * inX * inY;
}
