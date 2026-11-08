function e(e,t,i,r){Object.defineProperty(e,t,{get:i,set:r,enumerable:!0,configurable:!0})}(0,globalThis.parcelRequireccd6.register)("1Ztq6",function(t,i){e(t.exports,"City3D",()=>h),e(t.exports,"loadThree",()=>u);let r=`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,a=`
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
}`,o=`
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
}`,n=`
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
}`,s=`
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
}`,l=`
uniform float uNight; varying float vLane; varying float vDepth;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  vec3 c = vLane < 0.5 ? vec3(1.0,0.95,0.82) : vec3(1.0,0.28,0.2);
  gl_FragColor = vec4(c * a * (0.45 + 0.75 * uNight) * smoothstep(420.0, 60.0, vDepth), 1.0);
}`;class h{constructor(e,t,i={}){let h;this.T=e,this.w=1,this.h=1,this.renderer=new e.WebGLRenderer({canvas:t,antialias:!0,powerPreference:"high-performance",alpha:!1,preserveDrawingBuffer:!!i.preserve}),this.renderer.setPixelRatio(i.dpr??1),this.scene=new e.Scene,this.camera=new e.PerspectiveCamera(55,1,.5,900),this.sky=new e.Mesh(new e.SphereGeometry(600,32,16),new e.ShaderMaterial({vertexShader:r,fragmentShader:a,side:e.BackSide,depthWrite:!1,uniforms:{uNight:{value:0},uSun:{value:new e.Vector3(.25,.06,-1)},uTime:{value:0}}})),this.scene.add(this.sky);let u=document.createElement("canvas");u.width=u.height=128;let c=u.getContext("2d");c.fillStyle="#07080c",c.fillRect(0,0,128,128),c.fillStyle="#100f10",c.fillRect(0,62,128,4),c.fillRect(62,0,4,128);let v=new e.CanvasTexture(u);v.wrapS=v.wrapT=e.RepeatWrapping,v.repeat.set(60,60),this.ground=new e.Mesh(new e.PlaneGeometry(1200,1200),new e.MeshBasicMaterial({map:v,fog:!1})),this.ground.rotation.x=-Math.PI/2,this.ground.position.z=-300,this.scene.add(this.ground);let d=(h=421,()=>{h|=0;let e=Math.imul((h=h+0x6d2b79f5|0)^h>>>15,1|h);return(((e=e+Math.imul(e^e>>>7,61|e)^e)^e>>>14)>>>0)/0x100000000}),m=[];for(let e=0;e<34;e++)for(let t=-6;t<=6;t++)if(0!==t)for(let i=0;i<4;i++){if(.12>d())continue;let r=22*t+i%2*9-4.5+(t>0?3:-3),a=-(22*e)-9*Math.floor(i/2)+4.5,o=1-Math.min(1,Math.abs(t)/6),n=d()<.08+.12*o?30+55*d():5+Math.pow(d(),1.6)*(14+18*o);m.push({x:r,z:a,w:5+3*d(),d:5+3*d(),h:n})}let f=new e.BoxGeometry(1,1,1);f.translate(0,.5,0);let p=new e.ShaderMaterial({vertexShader:o,fragmentShader:n,uniforms:{uNight:{value:0},uSunDir:{value:new e.Vector3(.3,.2,-1)},uFog:{value:new e.Color},uFogNear:{value:80},uFogFar:{value:520}}});this.towers=new e.InstancedMesh(f,p,m.length);let g=new e.Matrix4,w=new Float32Array(m.length);m.forEach((e,t)=>{g.makeScale(e.w,e.h,e.d),g.setPosition(e.x,0,e.z),this.towers.setMatrixAt(t,g),w[t]=d()}),f.setAttribute("aSeed",new e.InstancedBufferAttribute(w,1)),this.towers.frustumCulled=!1,this.scene.add(this.towers);let x=new e.BufferGeometry,y=new Float32Array(2700),S=new Float32Array(900),M=new Float32Array(900),b=new Float32Array(900),N=new Float32Array(900);for(let e=0;e<900;e++)S[e]=e%2,M[e]=520*d(),b[e]=14+18*d(),N[e]=.3>d()?0:(Math.floor(12*d())-6)*22+11;x.setAttribute("position",new e.BufferAttribute(y,3)),x.setAttribute("aLane",new e.BufferAttribute(S,1)),x.setAttribute("aOff",new e.BufferAttribute(M,1)),x.setAttribute("aSpeed",new e.BufferAttribute(b,1)),x.setAttribute("aX",new e.BufferAttribute(N,1)),this.cars=new e.Points(x,new e.ShaderMaterial({vertexShader:s,fragmentShader:l,transparent:!0,depthWrite:!1,blending:e.AdditiveBlending,uniforms:{uTime:{value:0},uNight:{value:0},uPixel:{value:i.dpr??1}}})),this.cars.frustumCulled=!1,this.scene.add(this.cars),i.width&&i.height&&this.setSize(i.width,i.height)}setSize(e,t){this.w=e,this.h=t,this.renderer.setSize(e,t,!1),this.camera.aspect=e/t,this.camera.updateProjectionMatrix()}setDpr(e){this.renderer.setPixelRatio(e),this.cars.material.uniforms.uPixel.value=e,this.setSize(this.w,this.h)}render(e){let t=Math.min(1,Math.max(0,e.night)),i=new this.T.Color().setRGB(.32*(1-t)+.04*t,.17*(1-t)+.05*t,.2*(1-t)+.09*t);this.sky.material.uniforms.uNight.value=t,this.sky.material.uniforms.uTime.value=e.t,this.sky.material.uniforms.uSun.value.set(.25,.08-.2*t,-1),this.towers.material.uniforms.uNight.value=t,this.towers.material.uniforms.uFog.value.copy(i),this.cars.material.uniforms.uTime.value=e.t,this.cars.material.uniforms.uNight.value=t;let r=30-520*e.pan,a=14+26*e.pan+.6*Math.sin(.3*e.t);this.camera.position.set((e.px??0)*4+2*Math.sin(.12*e.t),a+(e.py??0)*2,r),this.camera.lookAt((e.px??0)*8,.55*a,r-90),this.sky.position.copy(this.camera.position),this.renderer.render(this.scene,this.camera)}dispose(){this.scene.traverse(e=>{e.geometry?.dispose?.(),e.material?.map?.dispose?.(),e.material?.dispose?.()}),this.renderer.dispose(),this.renderer.forceContextLoss?.()}}function u(){let e=window;return e.__three?Promise.resolve(e.__three):new Promise((t,i)=>{let r=document.createElement("script");r.type="module",r.textContent="import * as T from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js'; window.__three = T; dispatchEvent(new Event('vd:three'))";let a=setTimeout(()=>i(Error("three timeout")),15e3);addEventListener("vd:three",()=>{clearTimeout(a),t(e.__three)},{once:!0}),r.onerror=()=>{clearTimeout(a),i(Error("three failed"))},document.head.appendChild(r)})}});