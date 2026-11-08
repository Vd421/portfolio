/* eslint-disable @typescript-eslint/no-explicit-any */
// A 3D city fly-over in Three.js: ~1,100 instanced towers (one draw call) with a shader that
// lights windows as night falls, a sky dome with the sun, a ground grid and GPU-driven traffic.
// Three.js is passed in, so the page can lazy-load it from the CDN and the Remotion reel can
// import it from npm. Four draw calls per frame.

export type City3DState = { t: number; night: number; pan: number; px?: number; py?: number }

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const SKY_FRAG = /* glsl */ `
uniform float uNight; uniform vec3 uSun; uniform float uTime;
varying vec3 vDir;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
void main() {
  float y = clamp(vDir.y, -0.2, 1.0);
  vec3 duskTop = vec3(0.10,0.14,0.25), duskMid = vec3(0.43,0.21,0.31), duskLow = vec3(1.0,0.62,0.33);
  vec3 nightTop = vec3(0.01,0.02,0.04), nightMid = vec3(0.04,0.07,0.14), nightLow = vec3(0.20,0.12,0.20);
  vec3 top = mix(duskTop, nightTop, uNight), mid = mix(duskMid, nightMid, uNight), low = mix(duskLow, nightLow, uNight);
  vec3 col = mix(low, mid, smoothstep(0.0, 0.18, y));
  col = mix(col, top, smoothstep(0.18, 0.7, y));
  float s = max(dot(normalize(vDir), normalize(uSun)), 0.0);
  col += vec3(1.0,0.75,0.45) * pow(s, 18.0) * 0.6 * (1.0 - uNight);
  col += vec3(1.0,0.93,0.78) * smoothstep(0.9965, 0.998, s) * (1.0 - uNight);
  if (uNight > 0.35 && y > 0.08) {
    vec3 c = floor(vDir * 420.0);
    float st = step(0.9965, hash(c));
    col += st * (uNight - 0.35) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(c + 1.0) * 6.28));
  }
  gl_FragColor = vec4(col, 1.0);
}`

const TOWER_VERT = /* glsl */ `
attribute float aSeed;
varying vec3 vWorld; varying vec3 vNormal; varying float vSeed; varying float vDepth; varying vec3 vScale;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normal;
  vSeed = aSeed;
  vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec4 mv = viewMatrix * wp;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const TOWER_FRAG = /* glsl */ `
uniform float uNight; uniform vec3 uSunDir; uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
varying vec3 vWorld; varying vec3 vNormal; varying float vSeed; varying float vDepth; varying vec3 vScale;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
void main() {
  vec3 dusk = vec3(0.16,0.12,0.17), night = vec3(0.025,0.035,0.06);
  vec3 col = mix(dusk, night, uNight);
  // Sunset rim on faces that look toward the sun
  float rim = max(dot(normalize(vNormal), normalize(uSunDir)), 0.0);
  col += vec3(0.9,0.42,0.22) * rim * 0.32 * (1.0 - uNight);
  // Windows on the side faces: a grid in world units, lit by a per-window threshold
  if (abs(vNormal.y) < 0.5) {
    float u = abs(vNormal.x) > 0.5 ? vWorld.z : vWorld.x;
    vec2 g = vec2(u * 1.4, vWorld.y * 1.1);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float win = step(0.18, f.x) * step(f.x, 0.72) * step(0.22, f.y) * step(f.y, 0.78);
    float th = hash(cell + vSeed * 91.0);
    float lit = step(th, uNight * 1.05 + 0.04) * step(1.2, vWorld.y);
    vec3 warm = vec3(1.0,0.77,0.42), cool = vec3(0.75,0.91,1.0);
    vec3 wc = mix(warm, cool, step(0.8, hash(cell * 1.7 + vSeed)));
    col = mix(col, wc * (0.75 + 0.5 * hash(cell + 3.0)), win * lit);
  } else {
    col *= 0.7; // roofs
  }
  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
}`

const CAR_VERT = /* glsl */ `
attribute float aLane; attribute float aOff; attribute float aSpeed; attribute float aX;
uniform float uTime; uniform float uPixel;
varying float vLane; varying float vDepth;
void main() {
  float dir = aLane < 0.5 ? 1.0 : -1.0;
  float z = mod(aOff + uTime * aSpeed * dir, 520.0) - 470.0;
  vec4 mv = viewMatrix * vec4(aX + (aLane < 0.5 ? -0.6 : 0.6), 0.25, z, 1.0);
  vLane = aLane; vDepth = -mv.z;
  gl_PointSize = clamp(90.0 / vDepth, 1.5, 7.0) * uPixel;
  gl_Position = projectionMatrix * mv;
}`
const CAR_FRAG = /* glsl */ `
uniform float uNight; varying float vLane; varying float vDepth;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  vec3 c = vLane < 0.5 ? vec3(1.0,0.95,0.82) : vec3(1.0,0.28,0.2);
  gl_FragColor = vec4(c * a * (0.45 + 0.75 * uNight) * smoothstep(420.0, 60.0, vDepth), 1.0);
}`

export class City3D {
  renderer: any
  private scene: any
  private camera: any
  private sky: any
  private towers: any
  private cars: any
  private ground: any
  private w = 1
  private h = 1

  constructor(private T: any, canvas: HTMLCanvasElement | OffscreenCanvas, opts: { dpr?: number; width?: number; height?: number; preserve?: boolean } = {}) {
    const THREE = T
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false, preserveDrawingBuffer: !!opts.preserve })
    this.renderer.setPixelRatio(opts.dpr ?? 1)
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 900)

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(600, 32, 16),
      new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false,
        uniforms: { uNight: { value: 0 }, uSun: { value: new THREE.Vector3(0.25, 0.06, -1) }, uTime: { value: 0 } } }),
    )
    this.scene.add(this.sky)

    // Ground with a faint street grid
    const gridCanvas = document.createElement('canvas')
    gridCanvas.width = gridCanvas.height = 128
    const g = gridCanvas.getContext('2d')!
    g.fillStyle = '#07080c'; g.fillRect(0, 0, 128, 128)
    g.fillStyle = '#100f10'; g.fillRect(0, 62, 128, 4); g.fillRect(62, 0, 4, 128)
    const tex = new THREE.CanvasTexture(gridCanvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(60, 60)
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshBasicMaterial({ map: tex, fog: false }))
    this.ground.rotation.x = -Math.PI / 2
    this.ground.position.z = -300
    this.scene.add(this.ground)

    // Towers on city blocks, avenues every 4 lots, taller toward the center line
    const R = mulberry(421)
    const lots: { x: number; z: number; w: number; d: number; h: number }[] = []
    for (let bz = 0; bz < 34; bz++) {
      for (let bx = -6; bx <= 6; bx++) {
        if (bx === 0) continue // the central avenue the camera flies along
        for (let k = 0; k < 4; k++) {
          if (R() < 0.12) continue
          const x = bx * 22 + (k % 2) * 9 - 4.5 + (bx > 0 ? 3 : -3)
          const z = -bz * 22 - Math.floor(k / 2) * 9 + 4.5
          const center = 1 - Math.min(1, Math.abs(bx) / 6)
          const tall = R() < 0.08 + center * 0.12
          const h = tall ? 30 + R() * 55 : 5 + Math.pow(R(), 1.6) * (14 + center * 18)
          lots.push({ x, z, w: 5 + R() * 3, d: 5 + R() * 3, h })
        }
      }
    }
    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, 0.5, 0)
    const towerMat = new THREE.ShaderMaterial({
      vertexShader: TOWER_VERT, fragmentShader: TOWER_FRAG,
      uniforms: { uNight: { value: 0 }, uSunDir: { value: new THREE.Vector3(0.3, 0.2, -1) }, uFog: { value: new THREE.Color() }, uFogNear: { value: 80 }, uFogFar: { value: 520 } },
    })
    this.towers = new THREE.InstancedMesh(box, towerMat, lots.length)
    const m = new THREE.Matrix4()
    const seeds = new Float32Array(lots.length)
    lots.forEach((l, i) => {
      m.makeScale(l.w, l.h, l.d); m.setPosition(l.x, 0, l.z)
      this.towers.setMatrixAt(i, m)
      seeds[i] = R()
    })
    box.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
    this.towers.frustumCulled = false
    this.scene.add(this.towers)

    // Traffic as GPU points: positions computed in the vertex shader from time
    const N = 900
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(N * 3)
    const lane = new Float32Array(N), off = new Float32Array(N), speed = new Float32Array(N), ax = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      lane[i] = i % 2; off[i] = R() * 520; speed[i] = 14 + R() * 18
      ax[i] = R() < 0.3 ? 0 : (Math.floor(R() * 12) - 6) * 22 + 11 // center avenue, or the avenues between blocks
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aLane', new THREE.BufferAttribute(lane, 1))
    geo.setAttribute('aOff', new THREE.BufferAttribute(off, 1))
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
    geo.setAttribute('aX', new THREE.BufferAttribute(ax, 1))
    this.cars = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: CAR_VERT, fragmentShader: CAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uPixel: { value: opts.dpr ?? 1 } },
    }))
    this.cars.frustumCulled = false
    this.scene.add(this.cars)

    if (opts.width && opts.height) this.setSize(opts.width, opts.height)
  }

  setSize(w: number, h: number) {
    this.w = w; this.h = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  setDpr(d: number) { this.renderer.setPixelRatio(d); this.cars.material.uniforms.uPixel.value = d; this.setSize(this.w, this.h) }

  render(s: City3DState) {
    const n = Math.min(1, Math.max(0, s.night))
    const T = this.T
    const fog = new T.Color().setRGB(0.32 * (1 - n) + 0.04 * n, 0.17 * (1 - n) + 0.05 * n, 0.2 * (1 - n) + 0.09 * n)
    this.sky.material.uniforms.uNight.value = n
    this.sky.material.uniforms.uTime.value = s.t
    this.sky.material.uniforms.uSun.value.set(0.25, 0.08 - n * 0.2, -1)
    this.towers.material.uniforms.uNight.value = n
    this.towers.material.uniforms.uFog.value.copy(fog)
    this.cars.material.uniforms.uTime.value = s.t
    this.cars.material.uniforms.uNight.value = n
    // Camera glides down the central avenue, rising as the night goes on
    const z = 30 - s.pan * 520
    const y = 14 + s.pan * 26 + Math.sin(s.t * 0.3) * 0.6
    this.camera.position.set((s.px ?? 0) * 4 + Math.sin(s.t * 0.12) * 2, y + (s.py ?? 0) * 2, z)
    this.camera.lookAt((s.px ?? 0) * 8, y * 0.55, z - 90)
    this.sky.position.copy(this.camera.position)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.scene.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.() })
    this.renderer.dispose()
    this.renderer.forceContextLoss?.()
  }
}

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Load Three.js from jsDelivr at runtime, so it never weighs on first load. */
export function loadThree(): Promise<any> {
  const w = window as any
  if (w.__three) return Promise.resolve(w.__three)
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.type = 'module'
    s.textContent = `import * as T from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js'; window.__three = T; dispatchEvent(new Event('vd:three'))`
    const timer = setTimeout(() => reject(new Error('three timeout')), 15000)
    addEventListener('vd:three', () => { clearTimeout(timer); resolve(w.__three) }, { once: true })
    s.onerror = () => { clearTimeout(timer); reject(new Error('three failed')) }
    document.head.appendChild(s)
  })
}
