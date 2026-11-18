// Neonshore shared 3D hero (Three.js r170, vendored). Reused by every page with a per-page preset.
// Everything here is procedural: no models, textures or third-party art.
import * as THREE from '../vendor/three.module.min.js';

// Per-page variations. Phase 1 ships only `community`; `shop` and `product` are tuned TODO presets.
export const PRESETS = {
  community: { seed: 1337, night: [0.0, 1.0], sunY: [150, -40], camZ: [60, 4], camY: [9, 4.5], buildings: 320, palms: 34 },
  // Shop: starts at dusk, denser skyline, three pack panels floating over the bay.
  shop:      { seed: 4242, night: [0.35, 1.0], sunY: [110, -40], camZ: [52, 8], camY: [8, 5], buildings: 380, palms: 22,
               panel: { spread: 32, y: 29, z: -30, size: 14, tilt: 0.38 } },
  // Product: deep dusk to full night, a wide arc of the pack's scenes in front of the skyline.
  product:   { seed: 9001, night: [0.55, 1.0], sunY: [70, -60], camZ: [46, 10], camY: [7, 5], buildings: 300, palms: 16,
               panel: { spread: 46, y: 29, z: -36, size: 12, tilt: 0.42 } },
};

let rand = Math.random;
const seeded = seed => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Shared colour script, interpolated by `night` (0 = golden hour, 1 = midnight)
const PAL = {
  zenith:  [new THREE.Color('#3a1a6b'), new THREE.Color('#05030f')],
  mid:     [new THREE.Color('#b83a8c'), new THREE.Color('#1a0d3a')],
  horizon: [new THREE.Color('#ffb070'), new THREE.Color('#ff3f8e')],
  fog:     [new THREE.Color('#d96a8a'), new THREE.Color('#2a1250')],
  silhouette: [new THREE.Color('#3b1a52'), new THREE.Color('#0a0616')],
  sand:    [new THREE.Color('#6d3360'), new THREE.Color('#120a24')],
};
const mixPal = (k, t, out) => out.copy(PAL[k][0]).lerp(PAL[k][1], t);

const FOG_GLSL = /* glsl */`
  uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
  vec3 applyFog(vec3 c, float d){ return mix(c, uFog, smoothstep(uFogNear, uFogFar, d)); }
`;

export function createHero3D(canvas, opts = {}) {
  const { lite = false, reduced = false, variant = 'community', panels: panelUrls = [], onAsset = () => {} } = opts;
  const P = PRESETS[variant] || PRESETS.community;
  rand = seeded(P.seed);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  const maxDpr = lite ? 1 : 1.75;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 2000);

  const U = { // uniforms shared by all custom materials
    uTime: { value: 0 }, uNight: { value: 0 },
    uFog: { value: new THREE.Color() }, uFogNear: { value: 120 }, uFogFar: { value: 900 },
    uSunDir: { value: new THREE.Vector3(0, 0.1, -1) },
  };

  // ---------------- Sky dome ----------------
  const skyU = { ...U, uZenith: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uZenith,uMid,uHorizon,uSunDir; uniform float uNight,uTime; varying vec3 vDir;
      float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      void main(){
        float y = vDir.y;
        vec3 c = mix(uHorizon, uMid, smoothstep(-0.02, 0.18, y));
        c = mix(c, uZenith, smoothstep(0.15, 0.65, y));
        float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.);
        c += vec3(1.,.45,.35) * pow(s, 18.) * (0.9 - 0.5*uNight);   // sun glow
        c += vec3(1.,.3,.6) * pow(s, 4.) * 0.18;
        // stars fade in with night
        vec2 g = floor(vec2(atan(vDir.z, vDir.x)*260., y*420.));
        float st = step(0.9965, h21(g)) * smoothstep(0.08, 0.5, y) * smoothstep(0.35, 0.9, uNight);
        st *= 0.6 + 0.4*sin(uTime*2. + h21(g+3.)*40.);
        c += vec3(st);
        // thin neon bands near the horizon
        c += vec3(1.,.4,.8) * smoothstep(0.004,0.,abs(y-0.06)) * 0.08;
        gl_FragColor = vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(sky);

  // ---------------- Retro sun ----------------
  const sunU = { ...U, uSink: { value: 0 } };
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: sunU,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      uniform float uTime,uNight; varying vec2 vUv;
      void main(){
        vec2 p = vUv*2.-1.; float r = length(p);
        float disc = smoothstep(0.5, 0.49, r);
        float y = vUv.y;
        // horizontal cuts, thicker towards the bottom, drifting downward
        float bands = 1.;
        if (y < 0.5) { float f = fract((y + uTime*0.02) * 9.); float w = mix(0.55, 0.05, y*2.); bands = step(w, f); }
        vec3 col = mix(vec3(1.,.28,.62), vec3(1.,.9,.5), smoothstep(0.1, 0.9, y));
        float glow = smoothstep(1., 0.45, r) * 0.55;
        float a = disc*bands + glow*(1.-disc*bands)*0.6;
        vec3 c = col*(disc*bands) + vec3(1.,.4,.6)*glow;
        gl_FragColor = vec4(c, a*(1.-0.15*uNight));
        #include <colorspace_fragment>
      }`,
  }));
  sun.scale.setScalar(lite ? 460 : 520);
  scene.add(sun);

  // ---------------- Sea with sun reflection + neon grid ----------------
  const seaU = { ...U, uHorizonC: skyU.uHorizon, uMidC: skyU.uMid, uSunX: { value: 0 } };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 1400, 1, 1), new THREE.ShaderMaterial({
    uniforms: seaU,
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
      ${FOG_GLSL}
      uniform vec3 uHorizonC,uMidC; uniform float uTime,uNight,uSunX; varying vec3 vW;
      void main(){
        float d = length(vW - cameraPosition);
        float far = smoothstep(20., 700., -vW.z);
        vec3 base = mix(uMidC*0.35, uHorizonC*0.75, far);
        // sun glitter column
        float col = exp(-pow((vW.x-uSunX)/(40.+ -vW.z*0.28), 2.));
        float ripple = 0.5+0.5*sin(vW.z*0.9 + uTime*1.6 + sin(vW.x*0.08+uTime)*2.);
        base += vec3(1.,.55,.5) * col * step(0.55, ripple) * (0.75 - 0.45*uNight) * far;
        // neon grid (stronger at night)
        vec2 g = abs(fract(vec2(vW.x*0.05, (vW.z + uTime*6.)*0.05)) - 0.5);
        float line = smoothstep(0.47, 0.5, max(g.x, g.y));
        base += vec3(.25,.9,.85) * line * (0.12 + 0.45*uNight) * (1.-far);
        gl_FragColor = vec4(applyFog(base, d), 1.);
        #include <colorspace_fragment>
      }`,
  }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0, -700);
  scene.add(sea);

  // ---------------- Beach (foreground) ----------------
  const sandU = { ...U, uSand: { value: new THREE.Color() } };
  const sandGeo = new THREE.PlaneGeometry(600, 120, 60, 12);
  { const p = sandGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 0.05) * 0.6 + Math.cos(y * 0.11 + x * 0.02) * 0.5 + (y + 60) * 0.03); } sandGeo.computeVertexNormals(); }
  const sand = new THREE.Mesh(sandGeo, new THREE.ShaderMaterial({
    uniforms: sandU,
    vertexShader: `varying vec3 vW; varying float vEdge; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vEdge=uv.y; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */`
      ${FOG_GLSL}
      uniform vec3 uSand; uniform float uNight,uTime; varying vec3 vW; varying float vEdge;
      void main(){
        vec3 c = uSand * (0.5 + 0.55*vEdge);
        // wet sand mirrors the sun as a soft shimmering column
        float dcam = length(vW - cameraPosition);
        float col = exp(-pow((vW.x - cameraPosition.x*0.5)/(1.5 + dcam*0.16), 2.));
        float sh = 0.55 + 0.45*sin(vW.z*1.7 - uTime*1.2 + sin(vW.x*0.2)*1.5);
        c += vec3(1.,.45,.6) * col * (0.4 + 0.6*sh) * (0.2 - 0.1*uNight) * smoothstep(0.1, 0.9, vEdge);
                // neon reflections of the city at night
        c += vec3(.25,.9,.85) * col * uNight * 0.12 * smoothstep(0.5, 1., vEdge);
        float foam = smoothstep(0.985, 1., vEdge + 0.006*sin(vW.x*0.15 + uTime*1.3));
        c += vec3(.5,1.,.95) * foam * (0.25 + 0.4*uNight);
        gl_FragColor = vec4(applyFog(c, length(vW-cameraPosition)), 1.);
        #include <colorspace_fragment>
      }`,
  }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.05, 66);
  scene.add(sand);

  // ---------------- Skyline (instanced boxes with procedural windows) ----------------
  const N = lite ? Math.round(P.buildings * 0.35) : P.buildings;
  const boxGeo = new THREE.BoxGeometry(1, 1, 1); boxGeo.translate(0, 0.5, 0);
  const cityU = { ...U, uSil: { value: new THREE.Color() } };
  const city = new THREE.InstancedMesh(boxGeo, new THREE.ShaderMaterial({
    uniforms: cityU,
    vertexShader: /* glsl */`
      varying vec3 vW; varying vec2 vUv; varying vec3 vN; varying vec3 vSize; varying float vSeed;
      void main(){
        vec4 w = modelMatrix * instanceMatrix * vec4(position,1.);
        vW = w.xyz; vUv = uv; vN = normal;
        vSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898,78.233)))*43758.5453);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      ${FOG_GLSL}
      uniform vec3 uSil; uniform float uNight,uTime; varying vec3 vW; varying vec2 vUv; varying vec3 vN; varying vec3 vSize; varying float vSeed;
      float h21(vec2 p){ p=fract(p*vec2(233.34,851.73)); p+=dot(p,p+23.45); return fract(p.x*p.y); }
      void main(){
        vec3 c = uSil * (vN.y > 0.5 ? 1.25 : (abs(vN.x) > 0.5 ? 0.85 : 1.0));
        if (vN.y < 0.5) {
          float wdt = abs(vN.x) > 0.5 ? vSize.z : vSize.x;
          vec2 cells = vec2(max(2., floor(wdt/2.2)), max(3., floor(vSize.y/2.6)));
          vec2 g = vUv * cells; vec2 id = floor(g); vec2 f = fract(g);
          float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.28, f.y) * step(f.y, 0.72);
          float on = step(1. - (0.08 + 0.55*uNight), h21(id + vSeed*91.));
          float flick = 0.85 + 0.15*sin(uTime*3. + h21(id)*50.);
          vec3 wc = mix(vec3(1.,.78,.45), mix(vec3(.35,.95,1.), vec3(1.,.4,.8), step(.5,h21(id+7.))), step(0.7, h21(id+3.)));
          c += wc * win * on * flick * (0.35 + 1.1*uNight);
          // neon crown line on some towers
          float crown = smoothstep(0.985, 0.995, vUv.y) * step(0.62, vSeed);
          c += mix(vec3(1.,.3,.7), vec3(.25,1.,.9), step(.8,vSeed)) * crown * (0.6 + 1.6*uNight);
        }
        float d = length(vW - cameraPosition);
        gl_FragColor = vec4(applyFog(c, d*0.82), 1.);
        #include <colorspace_fragment>
      }`,
  }), N);
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const x = (rand() * 2 - 1) * 520;
      const center = Math.exp(-Math.pow(x / 170, 2));          // downtown cluster in the middle
      const z = -260 - rand() * 160 - (1 - center) * 40;
      const h = 8 + Math.pow(rand(), 2.2) * 70 + center * rand() * 90;
      const w = 7 + rand() * 14;
      s.set(w, h, 7 + rand() * 14); p.set(x, 0, z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rand() - 0.5) * 0.3);
      city.setMatrixAt(i, m.compose(p, q, s));
    }
  }
  scene.add(city);
  // low far-shore strip so towers sit on land
  const shore = new THREE.Mesh(new THREE.PlaneGeometry(1400, 200), new THREE.MeshBasicMaterial({ color: 0x1a0d2e, fog: false }));
  shore.rotation.x = -Math.PI / 2; shore.position.set(0, 0.2, -350); scene.add(shore);

  // ---------------- Palm trees (procedural, instanced, wind sway) ----------------
  function palmGeometry(seed) {
    const r = (() => { let s = seed; return () => ((s = (s * 48271) % 2147483647) / 2147483647); })();
    const pos = [];
    const H = 11 + r() * 5, lean = (r() - 0.5) * 3.2;
    const P = t => new THREE.Vector3(lean * t * t * 1.6, H * t, lean * t * 0.4);
    // trunk: tapered ring segments
    const seg = 14, sides = 6;
    for (let i = 0; i < seg; i++) {
      const t0 = i / seg, t1 = (i + 1) / seg, a = P(t0), b = P(t1);
      const r0 = lerp(0.55, 0.22, t0) * (i % 2 ? 0.92 : 1), r1 = lerp(0.55, 0.22, t1);
      for (let k = 0; k < sides; k++) {
        const u0 = (k / sides) * Math.PI * 2, u1 = ((k + 1) / sides) * Math.PI * 2;
        const v = (c, rr, u) => [c.x + Math.cos(u) * rr, c.y, c.z + Math.sin(u) * rr];
        pos.push(...v(a, r0, u0), ...v(b, r1, u0), ...v(b, r1, u1), ...v(a, r0, u0), ...v(b, r1, u1), ...v(a, r0, u1));
      }
    }
    // fronds: drooping tapered blades with leaflets
    const top = P(1); const fronds = 9 + Math.floor(r() * 4);
    for (let f = 0; f < fronds; f++) {
      const ang = (f / fronds) * Math.PI * 2 + r() * 0.4;
      const len = 6 + r() * 3, droop = 0.6 + r() * 0.5, steps = 10;
      const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      const side = new THREE.Vector3(-dir.z, 0, dir.x);
      let prevL, prevR, prevC;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const c = top.clone().addScaledVector(dir, t * len); c.y += Math.sin(t * Math.PI * 0.55) * 1.6 - t * t * len * droop;
        const w = Math.sin(Math.min(1, t * 1.2) * Math.PI) * 1.25 * (i % 2 ? 1.35 : 0.7); // jagged leaflets
        const L = c.clone().addScaledVector(side, w), R = c.clone().addScaledVector(side, -w);
        L.y -= w * 0.35; R.y -= w * 0.35;
        if (i > 0) { pos.push(...prevC.toArray(), ...c.toArray(), ...L.toArray(), ...prevC.toArray(), ...prevL.toArray(), ...L.toArray(),
                              ...prevC.toArray(), ...R.toArray(), ...c.toArray(), ...prevC.toArray(), ...prevR.toArray(), ...R.toArray()); }
        prevL = L; prevR = R; prevC = c;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }
  const palmU = { ...U, uSil: cityU.uSil, uRim: { value: new THREE.Color('#ff5aa8') } };
  const palmMat = new THREE.ShaderMaterial({
    uniforms: palmU, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      uniform float uTime; varying vec3 vW; varying float vH;
      void main(){
        vec3 p = position; float k = max(p.y - 4., 0.) / 14.;
        float ph = instanceMatrix[3].x*0.13 + instanceMatrix[3].z*0.07;
        p.x += sin(uTime*0.9 + ph) * k*k * 0.9; p.z += cos(uTime*0.7 + ph) * k*k * 0.4;
        vec4 w = modelMatrix * instanceMatrix * vec4(p,1.); vW = w.xyz; vH = position.y;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      ${FOG_GLSL}
      uniform vec3 uSil,uRim; uniform float uNight; varying vec3 vW; varying float vH;
      void main(){
        vec3 c = uSil*0.55 + uRim * smoothstep(9., 16., vH) * (0.10 + 0.25*uNight);
        gl_FragColor = vec4(applyFog(c, length(vW-cameraPosition)*0.7), 1.);
        #include <colorspace_fragment>
      }`,
  });
  const palmVariants = [palmGeometry(11), palmGeometry(29), palmGeometry(57)];
  const PALMS = lite ? Math.max(6, Math.round(P.palms * 0.3)) : P.palms;
  const palmMeshes = palmVariants.map(g => new THREE.InstancedMesh(g, palmMat, PALMS));
  {
    const counts = [0, 0, 0], m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const BARS = [[-120, -130], [150, -185]];
    const onBars = lite ? 2 : 8, onBeach = PALMS - onBars;
    for (let i = 0; i < PALMS; i++) {
      let x, z;
      if (i < onBeach) {                                         // two receding rows along the beach
        const sideX = i % 2 ? 1 : -1, depth = i / onBeach;
        x = sideX * (18 + rand() * 14 + depth * 46); z = 40 - depth * 30 - rand() * 4;
      } else {                                                   // clusters on the sandbars for depth
        const b = BARS[i % 2]; x = b[0] + (rand() - 0.5) * 70; z = b[1] + (rand() - 0.5) * 18;
      }
      const sc = 0.9 + rand() * 0.6;
      p.set(x, z < -30 ? 0.4 : 0, z); s.setScalar(sc); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
      const v = i % 3; palmMeshes[v].setMatrixAt(counts[v]++, m.compose(p, q, s));
    }
    palmMeshes.forEach((pm, i) => { pm.count = counts[i]; pm.frustumCulled = false; scene.add(pm); });
  }
  // a few palms on a sandbar in the middle distance for depth
  const barMat = new THREE.MeshBasicMaterial({ color: 0x24123a });
  [[-120, -130], [150, -185]].forEach(([x, z]) => { const bar = new THREE.Mesh(new THREE.CircleGeometry(30, 24), barMat);
    bar.rotation.x = -Math.PI / 2; bar.scale.set(1.6, 0.45, 1); bar.position.set(x, 0.3, z); scene.add(bar); });

  // ---------------- Floating pack panels (shop/product): original Neonshore artwork as textures ----------------
  const panelGroups = [];
  if (panelUrls.length && P.panel) {
    const loader = new THREE.TextureLoader();
    const n = panelUrls.length, S = P.panel.size, W = S, H = S * 9 / 16;
    const frameGeo = new THREE.PlaneGeometry(W + 0.7, H + 0.7), picGeo = new THREE.PlaneGeometry(W, H), glowGeo = new THREE.PlaneGeometry(W * 1.5, H * 1.7);
    const glowMat = c => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: new THREE.Color(c) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 uC; varying vec2 vUv; void main(){ vec2 d=abs(vUv-.5)*2.; float r=max(d.x,d.y); gl_FragColor=vec4(uC, smoothstep(1.,.55,r)*.35); }' });
    panelUrls.forEach((url, i) => {
      const tex = loader.load(url, onAsset); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const c = i % 2 ? '#3fe0d0' : '#ff4fa3';
      const g = new THREE.Group();
      const glow = new THREE.Mesh(glowGeo, glowMat(c)); glow.position.z = -0.2;
      const frame = new THREE.Mesh(frameGeo, new THREE.MeshBasicMaterial({ color: c }));
      const pic = new THREE.Mesh(picGeo, new THREE.MeshBasicMaterial({ map: tex })); pic.position.z = 0.05;
      g.add(glow, frame, pic);
      const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      g.userData = { t, ph: i * 1.7 };
      g.rotation.y = -t * P.panel.tilt;
      scene.add(g); panelGroups.push(g);
    });
  }
  function placePanels(p, time) {
    panelGroups.forEach(g => {
      const { t, ph } = g.userData;
      const k = Math.min(1, camera.aspect / 1.3);                // narrow screens: tighter arc, smaller panels
      const spread = P.panel.spread * (1 + p * 0.7) * Math.max(0.42, k);
      g.scale.setScalar(Math.max(0.6, k));
      g.position.set(t * spread, P.panel.y + Math.sin(time * 0.8 + ph) * 0.6 + p * 10 - Math.abs(t) * 1.5, P.panel.z - Math.abs(t) * 10 - p * 6);
      g.rotation.x = Math.sin(time * 0.6 + ph) * 0.03;
    });
  }

  // ---------------- state & frame ----------------
  const state = { scroll: 0, mx: 0, my: 0, tmx: 0, tmy: 0 };
  const tmpC = new THREE.Color();
  function applyLook(p) {
    const night = lerp(P.night[0], P.night[1], smooth(0.05, 0.95, p));
    U.uNight.value = night;
    mixPal('zenith', night, skyU.uZenith.value); mixPal('mid', night, skyU.uMid.value); mixPal('horizon', night, skyU.uHorizon.value);
    mixPal('fog', night, U.uFog.value); mixPal('silhouette', night, cityU.uSil.value); mixPal('sand', night, sandU.uSand.value);
    renderer.setClearColor(mixPal('zenith', night, tmpC));
    // sun sinks behind the skyline
    const sy = lerp(P.sunY[0], P.sunY[1], smooth(0, 0.9, p));
    sun.position.set(0, sy, -900); U.uSunDir.value.set(0, sy / 900, -1).normalize();
    seaU.uSunX.value = 0;
    // camera dolly: from the beach towards the water line, slightly lower and tilting up
    const cx = state.mx * (reduced ? 0 : 4), cy = lerp(P.camY[0], P.camY[1], p) + state.my * (reduced ? 0 : 1.5);
    camera.position.set(cx, cy, lerp(P.camZ[0], P.camZ[1], smooth(0, 1, p)));
    camera.lookAt(state.mx * 10, lerp(30, 30, p) - state.my * 3, -400);
    if (panelGroups.length) placePanels(p, U.uTime.value);
    return night;
  }

  let w = 0, h = 0;
  function resize() {
    const r = canvas.getBoundingClientRect(); w = Math.max(1, r.width | 0); h = Math.max(1, r.height | 0);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 62 : 48; camera.updateProjectionMatrix();
  }
  resize();

  const clock = new THREE.Clock();
  let frames = 0, fpsT = 0, fps = 0, slowStreak = 0;
  function render() {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!reduced) U.uTime.value += dt;
    state.mx += (state.tmx - state.mx) * Math.min(1, dt * 3);
    state.my += (state.tmy - state.my) * Math.min(1, dt * 3);
    applyLook(state.scroll);
    renderer.render(scene, camera);
    // adaptive resolution: drop DPR if we are consistently slow
    frames++; fpsT += dt;
    if (fpsT >= 1) { fps = frames / fpsT; frames = 0; fpsT = 0;
      if (fps < 32 && dpr > 0.75) { if (++slowStreak >= 2) { dpr = Math.max(0.75, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); slowStreak = 0; } }
      else slowStreak = 0; }
  }

  return {
    render, resize,
    setScroll(p) { state.scroll = p; },
    setPointer(x, y) { state.tmx = x; state.tmy = y; },
    get fps() { return fps; }, get dpr() { return dpr; },
    info: { variant, buildings: N, palms: PALMS, panels: panelGroups.length, lite },
    renderer,
  };
}
