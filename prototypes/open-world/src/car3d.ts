/* eslint-disable @typescript-eslint/no-explicit-any */
// Low-poly 3D build of the original hypercar in car-shape.ts. Three.js is passed in (loaded from the CDN).
// Flat-shaded extrusions from the shared side profile, tapered toward the nose; sunset lighting;
// a slow turntable and a periodic headlight glint. When the hero scrolls away the car turns side-on
// to drive out (the drive itself is a CSS transform on the container).
import { BODY, CANOPY, FIN, HEADLIGHT, INTAKE, TAILLIGHT, WHEELS, type Pt } from './car-shape'
import { colors, time } from './motion-config'

export class Car3D {
  private renderer: any
  private scene: any
  private camera: any
  private car: any
  private glints: any[] = []
  private yaw = -0.6

  constructor(THREE: any, canvas: HTMLCanvasElement, dpr = 1) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(dpr)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60)
    this.camera.position.set(6.2, 2.1, 6.6)
    this.camera.lookAt(0, 0.45, 0)

    // Sunset lighting from the palette
    this.scene.add(new THREE.HemisphereLight(colors.pink, colors.base, 0.55))
    const key = new THREE.DirectionalLight(colors.dusk, 3.2); key.position.set(4, 2.2, 3.5); this.scene.add(key)
    const rim = new THREE.DirectionalLight(colors.pink, 2.6); rim.position.set(-4.5, 2.4, -3); this.scene.add(rim)
    const fill = new THREE.DirectionalLight('#3a6a78', 0.7); fill.position.set(0, 3, 5); this.scene.add(fill)

    const body = new THREE.MeshStandardMaterial({ color: '#161c26', metalness: 0.55, roughness: 0.32, flatShading: true })
    const glass = new THREE.MeshStandardMaterial({ color: '#0a0e13', metalness: 0.9, roughness: 0.12, flatShading: true })
    const dark = new THREE.MeshStandardMaterial({ color: '#06080b', metalness: 0.2, roughness: 0.8, flatShading: true })
    const tire = new THREE.MeshStandardMaterial({ color: '#0b0c0f', roughness: 0.9, flatShading: true })
    const head = new THREE.MeshBasicMaterial({ color: colors.hud })
    const tail = new THREE.MeshBasicMaterial({ color: colors.pink })
    const rimMat = new THREE.MeshBasicMaterial({ color: colors.dusk })

    // Width tapers toward the nose and slightly at the tail: reads as a wedge from above.
    const taper = (x: number) => (x > 1.3 ? 1 - ((x - 1.3) / 1.25) * 0.42 : x < -2.0 ? 1 - ((-2.0 - x) / 0.55) * 0.12 : 1)
    const extrude = (pts: Pt[], depth: number, mat: any, tapered = true, bevel = 0.05) => {
      const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 1, curveSegments: 1, steps: 1 })
      geo.translate(0, 0, -depth / 2)
      if (tapered) {
        const p = geo.attributes.position
        for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * taper(p.getX(i)))
        geo.computeVertexNormals()
      }
      return new THREE.Mesh(geo, mat)
    }

    this.car = new THREE.Group()
    this.car.add(extrude(BODY, 1.9, body))
    this.car.add(extrude(CANOPY, 0.62, glass))
    this.car.add(extrude(FIN, 0.05, body, false, 0.01))
    for (const side of [1, -1]) {
      const intake = extrude(INTAKE, 0.04, dark, false, 0)
      intake.position.z = side * 0.97
      this.car.add(intake)
      // Headlight strip and wheel arches
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.05), head)
      const [[x1, y1], [x2, y2]] = HEADLIGHT
      hl.position.set((x1 + x2) / 2, (y1 + y2) / 2, side * 0.62)
      hl.rotation.z = Math.atan2(y2 - y1, x2 - x1)
      this.car.add(hl)
      for (const wx of [WHEELS.front, WHEELS.rear]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(WHEELS.radius, WHEELS.radius, 0.34, 14), tire)
        wheel.rotation.x = Math.PI / 2
        wheel.position.set(wx, WHEELS.y, side * 0.86)
        this.car.add(wheel)
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 4, 18), rimMat)
        ring.position.set(wx, WHEELS.y, side * 1.035)
        this.car.add(ring)
      }
    }
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 1.5), tail)
    tl.position.set(TAILLIGHT[0][0] + 0.02, (TAILLIGHT[0][1] + TAILLIGHT[1][1]) / 2, 0)
    this.car.add(tl)

    // Soft contact shadow
    const sh = document.createElement('canvas'); sh.width = sh.height = 64
    const g = sh.getContext('2d')!
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(0,0,0,0.65)'); grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64)
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.0), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }))
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.005
    this.car.add(shadow)

    // Headlight glints: additive sprites that flare every few seconds
    const gl = document.createElement('canvas'); gl.width = gl.height = 64
    const gg = gl.getContext('2d')!
    const gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,240,220,0.6)'); gr.addColorStop(1, 'rgba(255,240,220,0)')
    gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64)
    const glintTex = new THREE.CanvasTexture(gl)
    for (const side of [1, -1]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }))
      sp.position.set(2.3, 0.38, side * 0.62)
      sp.scale.setScalar(0.01)
      this.car.add(sp)
      this.glints.push(sp)
    }

    this.car.position.y = 0.02
    this.scene.add(this.car)
  }

  setSize(w: number, h: number) {
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  /**
   * t: seconds of ambient time (frozen when motion is paused); dt: seconds since last frame;
   * drive: 0..1 hero scroll-out progress. On drive the car eases to side-on, nose toward travel.
   */
  render(t: number, dt: number, drive: number) {
    if (drive > 0.02) {
      const target = Math.round(this.yaw / (Math.PI * 2)) * Math.PI * 2 // nearest side-on
      this.yaw += (target - this.yaw) * Math.min(1, dt * 6)
    } else {
      this.yaw += time.carTurn * dt
    }
    this.car.rotation.y = this.yaw
    // Glint: a 0.6 s flare every `glintEvery` seconds
    const ph = (t % time.glintEvery) / 0.6
    const k = ph < 1 ? Math.sin(ph * Math.PI) : 0
    for (const sp of this.glints) { sp.material.opacity = k; sp.scale.setScalar(0.01 + k * 1.1) }
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.scene.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.() })
    this.renderer.dispose()
    this.renderer.forceContextLoss?.()
  }
}
