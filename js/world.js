// ============================================================================
// Médellín — monde 3D procédural
// Trois.js · vallée d'Aburrá, quartiers de colline, Metrocable, métro,
// parc bibliothèque, Moravia, couloirs verts, Parques del Río.
// ============================================================================

import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { OVERVIEW_VIEW, projects } from './data.js';

const TAU = Math.PI * 2;
const { clamp, lerp, smoothstep } = THREE.MathUtils;

// ---------------------------------------------------------------------------
// Géographie du modèle
// ---------------------------------------------------------------------------

const RIVER_X = (z) =>
  1.2 + 3.4 * Math.sin(z * 0.045) + 1.4 * Math.sin(z * 0.115 + 0.7);

function terrainHeight(x, z) {
  let h = 0;
  // Colline est (Santo Domingo / Comuna 13)
  h += smoothstep(x, 13, 75) * 34;
  // Colline ouest
  h += smoothstep(-x, 17, 80) * 44;
  // Relief doux
  h +=
    1.35 * Math.sin(x * 0.16 + z * 0.03) +
    0.95 * Math.sin(z * 0.21 - x * 0.05) +
    0.5 * Math.sin((x + z) * 0.33);
  // Le fond de vallée est aplati
  const valley = smoothstep(Math.abs(x + 1.5), 9, 25);
  h *= 0.16 + 0.84 * valley;
  return h;
}

const rnd = (() => {
  // Générateur déterministe : le modèle est identique à chaque chargement.
  let seed = 9137;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
})();

const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const range = (min, max) => min + rnd() * (max - min);

// ---------------------------------------------------------------------------
// Textures procédurales
// ---------------------------------------------------------------------------

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeFacadeTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,.17)');
    grad.addColorStop(0.28, 'rgba(255,255,255,.04)');
    grad.addColorStop(0.72, 'rgba(255,255,255,.03)');
    grad.addColorStop(1, 'rgba(0,0,0,.2)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Salissures et variations de béton
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(58,62,55,${range(0.012, 0.055)})`;
      ctx.fillRect(rnd() * w, rnd() * h, range(2, 26), range(1, 4));
    }

    const cols = 4;
    const rows = 10;
    const padX = 20;
    const padY = 24;
    const gapX = 10;
    const gapY = 11;
    const ww = (w - padX * 2 - gapX * (cols - 1)) / cols;
    const wh = (h - padY * 2 - gapY * (rows - 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * (ww + gapX);
        const y = padY + r * (wh + gapY);

        // Encadrement en creux
        ctx.fillStyle = 'rgba(32,37,33,.2)';
        ctx.fillRect(x - 2.5, y - 2.5, ww + 5, wh + 5);

        const glass = ctx.createLinearGradient(x, y, x + ww, y + wh);
        glass.addColorStop(0, '#3b4642');
        glass.addColorStop(0.48, '#29312d');
        glass.addColorStop(1, '#1a201d');
        ctx.fillStyle = glass;
        ctx.fillRect(x, y, ww, wh);

        // Reflet supérieur
        ctx.fillStyle = 'rgba(214,230,219,.15)';
        ctx.fillRect(x, y, ww, 2);

        // Menuiserie centrale
        ctx.fillStyle = 'rgba(226,222,209,.25)';
        ctx.fillRect(x + ww / 2 - 0.6, y, 1.2, wh);

        // Appui de fenêtre
        ctx.fillStyle = 'rgba(250,247,236,.62)';
        ctx.fillRect(x - 3, y + wh + 2, ww + 6, 2);

        // Garde-corps de balcon sur certaines rangées
        if (r % 3 === 1) {
          ctx.fillStyle = 'rgba(52,58,52,.55)';
          ctx.fillRect(x - 2, y + wh - 6, ww + 4, 1.6);
          for (let bx = x; bx < x + ww; bx += 4.5) {
            ctx.fillRect(bx, y + wh - 5, 1, 6);
          }
        }
      }
    }

    // Pilastres verticaux
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    for (let c = 0; c <= cols; c++) {
      const x = padX + c * (ww + gapX) - gapX / 2;
      ctx.fillRect(x, 0, 2.2, h);
    }

    // Corniche haute
    ctx.fillStyle = 'rgba(255,255,255,.24)';
    ctx.fillRect(0, 4, w, 3);
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    ctx.fillRect(0, 7, w, 2);
  });
}

function makeEmissiveTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const cols = 4;
    const rows = 10;
    const padX = 20;
    const padY = 24;
    const gapX = 10;
    const gapY = 11;
    const ww = (w - padX * 2 - gapX * (cols - 1)) / cols;
    const wh = (h - padY * 2 - gapY * (rows - 1)) / rows;
    const warm = ['#ffb15e', '#ffc782', '#ff9a4f', '#ffe0ad', '#d9e6ee', '#ffe9c4'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rnd() > 0.48) continue;
        const x = padX + c * (ww + gapX);
        const y = padY + r * (wh + gapY);
        ctx.fillStyle = pick(warm);
        ctx.globalAlpha = range(0.42, 1);
        ctx.fillRect(x + 1, y + 1, ww - 2, wh - 2);

        // Rideau / zone plus sombre
        if (rnd() < 0.4) {
          ctx.globalAlpha = range(0.18, 0.45);
          ctx.fillStyle = '#25170c';
          ctx.fillRect(x + 1, y + 1, ww * range(0.2, 0.55), wh - 2);
        }
        ctx.globalAlpha = 1;
      }
    }
  });
}

function makeRoofTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e6e2d6';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 1600; i++) {
      const g = Math.floor(range(120, 230));
      ctx.fillStyle = `rgba(${g},${g},${g - 8},${range(0.05, 0.2)})`;
      ctx.fillRect(rnd() * w, rnd() * h, range(0.8, 2.2), range(0.8, 2.2));
    }

    ctx.strokeStyle = 'rgba(48,52,46,.26)';
    ctx.lineWidth = 1;
    for (let y = 16; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 24; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,.24)';
    ctx.strokeRect(1, 1, w - 2, h - 2);
  });
}

function makeGroundTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f0f1e9';
    ctx.fillRect(0, 0, w, h);

    // Grain de sol
    for (let i = 0; i < 14000; i++) {
      const g = Math.floor(range(170, 245));
      ctx.fillStyle = `rgba(${g},${g + 3},${g - 6},${range(0.04, 0.16)})`;
      ctx.fillRect(rnd() * w, rnd() * h, range(0.7, 2), range(0.7, 2));
    }

    // Taches végétales diffuses
    for (let i = 0; i < 120; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = range(5, 34);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(54,88,58,${range(0.03, 0.1)})`);
      g.addColorStop(1, 'rgba(54,88,58,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Courbes de niveau très discrètes
    ctx.strokeStyle = 'rgba(58,74,60,.09)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 10) {
        const y = (h / 8) * (i + 1) + Math.sin(x * 0.018 + i * 1.7) * 13;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

function makeWaterTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#7fb4b5';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const y = rnd() * h;
      const amp = range(1, 4);
      const alpha = range(0.04, 0.18);
      ctx.strokeStyle = `rgba(235,255,250,${alpha})`;
      ctx.lineWidth = range(0.5, 1.6);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = y + Math.sin((x / w) * TAU * 2 + i) * amp;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(15,55,60,${range(0.03, 0.1)})`;
      ctx.fillRect(rnd() * w, rnd() * h, range(10, 60), range(1, 3));
    }
  });
}

function makeSoftDotTexture() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// ---------------------------------------------------------------------------
// Monde
// ---------------------------------------------------------------------------

export function createWorld(canvas) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Renderer -----------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07130f, 0.0065);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
  camera.position.set(...OVERVIEW_VIEW.pos);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...OVERVIEW_VIEW.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.5;
  controls.minPolarAngle = 0.28;
  controls.maxPolarAngle = 1.44;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.18;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });
  // Le défilement de la page reste possible au doigt.
  canvas.style.touchAction = 'pan-y';
  controls.touches.ONE = undefined;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

  // --- État ---------------------------------------------------------------
  const state = {
    era: 'after',
    eraProgress: 1,
    eraTarget: 1,
    time: 'night',
    timeProgress: 1,
    timeTarget: 1,
  };

  const tmpColor = new THREE.Color();
  const tmpColor2 = new THREE.Color();
  const tmpColor3 = new THREE.Color();
  const dummy = new THREE.Object3D();
  const clockStart = performance.now();

  // --- Ciel ---------------------------------------------------------------
  const skyUniforms = {
    topColor: { value: new THREE.Color('#030b13') },
    bottomColor: { value: new THREE.Color('#12352b') },
    offset: { value: 18 },
    exponent: { value: 0.72 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(380, 40, 24),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          vec3 dir = normalize(vWorldPosition + vec3(0.0, offset, 0.0));
          float h = clamp(dir.y, 0.0, 1.0);
          gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, exponent)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
  );
  sky.renderOrder = -10;
  scene.add(sky);

  const starGeo = new THREE.BufferGeometry();
  {
    const count = 850;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = rnd() * TAU;
      const y = 0.04 + rnd() * 0.96;
      const r = Math.sqrt(1 - y * y);
      const rad = 310 + rnd() * 20;
      pos[i * 3] = Math.cos(a) * r * rad;
      pos[i * 3 + 1] = y * rad;
      pos[i * 3 + 2] = Math.sin(a) * r * rad;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }
  const starMat = new THREE.PointsMaterial({
    color: 0xdcece5,
    size: 1.9,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -9;
  scene.add(stars);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(5.2, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xf4efd8, transparent: true, opacity: 0, fog: false })
  );
  moon.position.set(-145, 112, -175);
  scene.add(moon);
  const moonGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeSoftDotTexture(),
      color: 0xf0e6c0,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  moonGlow.position.copy(moon.position);
  moonGlow.scale.setScalar(38);
  scene.add(moonGlow);

  // --- Lumières -----------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xc8e6da, 0x17251d, 0.42);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0x9db9e8, 0.42);
  sun.position.set(-62, 88, 48);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -110;
  sun.shadow.camera.right = 110;
  sun.shadow.camera.top = 110;
  sun.shadow.camera.bottom = -110;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 280;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0x8fa79b, 0.18);
  scene.add(ambient);

  // Lumières ponctuelles des places (allumées la nuit)
  const plazaLights = [];
  const addPlazaLight = (x, y, z, color = 0xffb877, intensity = 10, distance = 26) => {
    const l = new THREE.PointLight(color, 0, distance, 2);
    l.position.set(x, y, z);
    l.userData.base = intensity;
    scene.add(l);
    plazaLights.push(l);
  };

  // --- Sol / diorama ------------------------------------------------------
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x08120e, roughness: 1, metalness: 0 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(178, 10, 178), baseMat);
  base.position.y = -5.05;
  base.receiveShadow = true;
  scene.add(base);

  const baseEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(178, 10, 178)),
    new THREE.LineBasicMaterial({ color: 0x1b3a2b, transparent: true, opacity: 0.35 })
  );
  baseEdge.position.y = -5.05;
  scene.add(baseEdge);

  // Terrain
  const terrainGeo = new THREE.PlaneGeometry(170, 170, 150, 150);
  terrainGeo.rotateX(-Math.PI / 2);
  {
    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cLow = new THREE.Color('#2a4033');
    const cMid = new THREE.Color('#22362a');
    const cHigh = new THREE.Color('#182820');
    const cPeak = new THREE.Color('#122018');
    const cRiver = new THREE.Color('#26392d');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = terrainHeight(x, z);
      pos.setY(i, y);
      const t = clamp(y / 34, 0, 1);
      if (t < 0.25) tmpColor.copy(cLow).lerp(cMid, t / 0.25);
      else if (t < 0.6) tmpColor.copy(cMid).lerp(cHigh, (t - 0.25) / 0.35);
      else tmpColor.copy(cHigh).lerp(cPeak, (t - 0.6) / 0.4);
      const dRiver = Math.abs(x - RIVER_X(z));
      if (dRiver < 8) tmpColor.lerp(cRiver, (1 - dRiver / 8) * 0.45);
      const n = 0.035 * Math.sin(x * 0.75 + z * 0.43) + 0.025 * Math.sin(z * 1.3);
      tmpColor.offsetHSL(0, 0, n);
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();
  }
  const groundTex = makeGroundTexture();
  groundTex.wrapS = THREE.RepeatWrapping;
  groundTex.wrapT = THREE.RepeatWrapping;
  groundTex.repeat.set(7, 7);
  groundTex.anisotropy = 8;

  const terrain = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshStandardMaterial({
      map: groundTex,
      vertexColors: true,
      roughness: 0.97,
      metalness: 0.015,
      flatShading: false,
    })
  );
  terrain.receiveShadow = true;
  scene.add(terrain);

  // --- Rivière ------------------------------------------------------------
  function buildRibbon(points, width, material, yOffset = 0.08) {
    const positions = [];
    const uvs = [];
    const indices = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(n - 1, i + 1)];
      let tx = next.x - prev.x;
      let tz = next.z - prev.z;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      const nx = -tz;
      const nz = tx;
      const lx = p.x + nx * width * 0.5;
      const lz = p.z + nz * width * 0.5;
      const rx = p.x - nx * width * 0.5;
      const rz = p.z - nz * width * 0.5;
      positions.push(lx, terrainHeight(lx, lz) + yOffset, lz);
      positions.push(rx, terrainHeight(rx, rz) + yOffset, rz);
      uvs.push(0, i / (n - 1));
      uvs.push(1, i / (n - 1));
      if (i < n - 1) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  const waterTex = makeWaterTexture();
  waterTex.wrapS = THREE.RepeatWrapping;
  waterTex.wrapT = THREE.RepeatWrapping;
  waterTex.repeat.set(1, 16);

  const riverPoints = [];
  for (let z = -82; z <= 82; z += 1.5) {
    riverPoints.push(new THREE.Vector3(RIVER_X(z), 0, z));
  }
  const riverMat = new THREE.MeshStandardMaterial({
    map: waterTex,
    color: 0x2f7c82,
    roughness: 0.22,
    metalness: 0.45,
    transparent: true,
    opacity: 0.94,
    emissive: 0x0a2b2e,
    emissiveIntensity: 0.55,
    side: THREE.DoubleSide,
  });
  const bankMat = new THREE.MeshStandardMaterial({
    color: 0x263a2d,
    roughness: 0.95,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const bank = buildRibbon(riverPoints, 7.6, bankMat, 0.12);
  bank.receiveShadow = true;
  scene.add(bank);
  const river = buildRibbon(riverPoints, 5.4, riverMat, 0.22);
  river.renderOrder = 2;
  scene.add(river);

  // --- Routes -------------------------------------------------------------
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x171d1a,
    roughness: 0.98,
    metalness: 0.01,
    side: THREE.DoubleSide,
  });
  const roadMatLight = new THREE.MeshStandardMaterial({
    color: 0x1d2420,
    roughness: 0.98,
    metalness: 0.01,
    side: THREE.DoubleSide,
  });

  const roadSamples = [];
  const treeLineSamples = [];
  const hillRoads = [
    [
      [15, -62], [23, -50], [21, -36], [31, -24], [27, -10], [37, 2],
      [33, 14], [43, 26], [39, 38], [49, 50], [45, 62],
    ],
    [
      [15, -26], [26, -16], [22, -3], [32, 9], [28, 21], [38, 33],
      [34, 45], [44, 57],
    ],
    [
      [15, 24], [25, 33], [21, 45], [33, 53], [29, 65],
    ],
  ];

  function addRoad(points, width, mat = roadMat, record = true) {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0, z))
    );
    const pts = curve.getPoints(120);
    const mesh = buildRibbon(pts, width, mat, 0.09);
    scene.add(mesh);
    if (record) {
      for (let i = 0; i < pts.length; i += 2) {
        const p = pts[i];
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        let tx = next.x - prev.x;
        let tz = next.z - prev.z;
        const l = Math.hypot(tx, tz) || 1;
        tx /= l;
        tz /= l;
        roadSamples.push({ x: p.x, z: p.z, r: width * 0.72 + 1.4 });
        treeLineSamples.push({
          x: p.x,
          z: p.z,
          nx: -tz,
          nz: tx,
          w: width,
        });
      }
    }
    return mesh;
  }

  hillRoads.forEach((r) => addRoad(r, 2.35));

  const avenue = [];
  for (let z = -80; z <= 80; z += 5) {
    avenue.push([12.5 + 1.1 * Math.sin(z * 0.08), z]);
  }
  addRoad(avenue, 4.6, roadMatLight);

  const westAvenue = [];
  for (let z = -78; z <= 78; z += 5) {
    westAvenue.push([-12.5 + 1.4 * Math.sin(z * 0.1 + 1), z]);
  }
  addRoad(westAvenue, 3.8, roadMatLight);

  [-42, -12, 20, 50].forEach((z) => {
    addRoad(
      [
        [-17, z - 1],
        [-6, z + 0.5],
        [6, z - 0.5],
        [14, z + 0.5],
      ],
      2.8,
      roadMatLight
    );
  });

  // --- Bâtiments ----------------------------------------------------------
  const towerPalette = [
    '#bdb5a3', '#a9a292', '#cbc4b1', '#8e9a8d', '#b7a48c', '#9ca49b', '#c2b9a5',
  ];
  const housePalette = [
    '#ad6a4f', '#b97b5b', '#8f5843', '#c68c68', '#9c6c53', '#b98364', '#8a6b59',
    '#a3775e', '#c09472', '#7f5c4c',
  ];
  const buildings = [];
  const pastColor = new THREE.Color('#6d6c63');

  function blocked(x, z, pad = 0) {
    if (Math.abs(x - RIVER_X(z)) < 5.6 + pad) return true;
    if (Math.abs(x - 8.5) < 4.2 + pad) return true;
    // Moravia
    if (Math.hypot(x + 12, z + 30) < 10.5 + pad) return true;
    // Bibliothèque / station haute
    if (Math.hypot(x - 43, z - 25) < 10 + pad) return true;
    // Parques del Río
    if (z > 15 && z < 60 && x > -10 && x < 8) return true;
    // Place de la station basse
    if (Math.hypot(x - 9.5, z - 9) < 7 + pad) return true;
    // Routes
    for (let i = 0; i < roadSamples.length; i++) {
      const s = roadSamples[i];
      const dx = x - s.x;
      const dz = z - s.z;
      if (dx * dx + dz * dz < s.r * s.r) return true;
    }
    return false;
  }

  function addBuildingData(x, z, w, d, h, rot, type) {
    const y = terrainHeight(x, z);
    const base = new THREE.Color(pick(type === 'tower' ? towerPalette : housePalette));
    base.offsetHSL(range(-0.01, 0.01), range(-0.04, 0.04), range(-0.04, 0.04));
    const past = base.clone().lerp(pastColor, 0.74).multiplyScalar(0.86);
    buildings.push({ x, z, y, w, d, h, rot, base, past, type });
  }

  // Immeubles de la vallée
  let tries = 0;
  while (buildings.filter((b) => b.type === 'tower').length < 235 && tries < 5000) {
    tries++;
    const x = range(-17, 15.5);
    const z = range(-76, 76);
    if (blocked(x, z, 0.5)) continue;
    const center = 1 - Math.abs(x - 1) / 22;
    const h = range(2.4, 6.5) + (rnd() < 0.16 ? range(4, 10) : 0) + center * 1.8;
    const w = range(1.8, 3.6);
    const d = range(1.8, 3.6);
    addBuildingData(x, z, w, d, h, range(-0.18, 0.18), 'tower');
  }

  // Maisons des collines (est)
  tries = 0;
  while (buildings.filter((b) => b.type === 'house').length < 620 && tries < 12000) {
    tries++;
    const x = range(16.5, 58);
    const z = range(-74, 74);
    if (blocked(x, z, 0.2)) continue;
    const w = range(1.25, 2.5);
    const d = range(1.25, 2.5);
    const h = range(1.3, 3.4) + (rnd() < 0.08 ? 1.4 : 0);
    addBuildingData(x, z, w, d, h, range(-0.35, 0.35), 'house');
  }

  // Quelques maisons sur la colline ouest
  tries = 0;
  let westCount = 0;
  while (westCount < 95 && tries < 3000) {
    tries++;
    const x = range(-58, -23);
    const z = range(-72, 72);
    if (blocked(x, z, 0.2)) continue;
    const w = range(1.3, 2.4);
    const d = range(1.3, 2.4);
    const h = range(1.2, 3.2);
    addBuildingData(x, z, w, d, h, range(-0.3, 0.3), 'house');
    westCount++;
  }

  const facadeTex = makeFacadeTexture();
  const emissiveTex = makeEmissiveTexture();
  const roofTex = makeRoofTexture();
  const facadeMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    emissiveMap: emissiveTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.4,
    roughness: 0.88,
    metalness: 0.02,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    color: 0xa6a298,
    roughness: 0.94,
    metalness: 0.01,
  });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const boxMaterials = [
    facadeMat, facadeMat, roofMat, roofMat, facadeMat, facadeMat,
  ];

  function buildInstances(type, castShadow) {
    const data = buildings.filter((b) => b.type === type);
    const mesh = new THREE.InstancedMesh(boxGeo, boxMaterials, data.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    data.forEach((b, i) => {
      dummy.position.set(b.x, b.y - 0.28, b.z);
      dummy.rotation.set(0, b.rot, 0);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, b.base);
      b.mesh = mesh;
      b.index = i;
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    return { mesh, data };
  }

  const towers = buildInstances('tower', true);
  const houses = buildInstances('house', false);

  // --- Détails de toiture -------------------------------------------------
  const detailGeo = new THREE.BoxGeometry(1, 1, 1);
  detailGeo.translate(0, 0.5, 0);

  const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.04 });
  const unitMat = new THREE.MeshStandardMaterial({ color: 0x73776e, roughness: 0.84, metalness: 0.08 });
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x303530, roughness: 0.6, metalness: 0.34 });
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0x202522, roughness: 0.5, metalness: 0.52 });

  const towerData = towers.data;
  const houseData = houses.data;

  // Corniches / acrotères
  const caps = new THREE.InstancedMesh(detailGeo, capMat, towerData.length);
  caps.castShadow = false;
  caps.receiveShadow = true;
  caps.frustumCulled = false;
  const capColor = new THREE.Color();
  towerData.forEach((b, i) => {
    dummy.position.set(b.x, b.y + b.h - 0.03, b.z);
    dummy.rotation.set(0, b.rot, 0);
    dummy.scale.set(b.w * 1.035, 0.17, b.d * 1.035);
    dummy.updateMatrix();
    caps.setMatrixAt(i, dummy.matrix);
    capColor.copy(b.base).multiplyScalar(0.66);
    caps.setColorAt(i, capColor);
  });
  caps.instanceMatrix.needsUpdate = true;
  if (caps.instanceColor) caps.instanceColor.needsUpdate = true;
  scene.add(caps);

  // Édicules techniques sur les toits
  const unitData = [];
  towerData.forEach((b) => {
    if (rnd() < 0.58) {
      unitData.push({
        x: b.x + range(-b.w * 0.24, b.w * 0.24),
        z: b.z + range(-b.d * 0.24, b.d * 0.24),
        y: b.y + b.h + 0.1,
        w: b.w * range(0.24, 0.5),
        d: b.d * range(0.24, 0.5),
        h: range(0.34, 1.15),
        rot: b.rot,
      });
    }
  });
  const roofUnits = new THREE.InstancedMesh(detailGeo, unitMat, unitData.length);
  roofUnits.castShadow = false;
  roofUnits.receiveShadow = true;
  roofUnits.frustumCulled = false;
  unitData.forEach((u, i) => {
    dummy.position.set(u.x, u.y, u.z);
    dummy.rotation.set(0, u.rot, 0);
    dummy.scale.set(u.w, u.h, u.d);
    dummy.updateMatrix();
    roofUnits.setMatrixAt(i, dummy.matrix);
  });
  roofUnits.instanceMatrix.needsUpdate = true;
  scene.add(roofUnits);

  // Réservoirs d'eau sur les maisons
  const tankData = houseData.filter(() => rnd() < 0.42);
  const tankGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8);
  tankGeo.translate(0, 0.25, 0);
  const tanks = new THREE.InstancedMesh(tankGeo, tankMat, tankData.length);
  tanks.castShadow = false;
  tanks.frustumCulled = false;
  tankData.forEach((b, i) => {
    dummy.position.set(
      b.x + range(-b.w * 0.24, b.w * 0.24),
      b.y + b.h - 0.02,
      b.z + range(-b.d * 0.24, b.d * 0.24)
    );
    dummy.rotation.set(0, b.rot, 0);
    dummy.scale.setScalar(range(0.75, 1.3));
    dummy.updateMatrix();
    tanks.setMatrixAt(i, dummy.matrix);
  });
  tanks.instanceMatrix.needsUpdate = true;
  scene.add(tanks);

  // Antennes
  const antennaData = houseData.filter(() => rnd() < 0.24);
  const antennaGeo = new THREE.CylinderGeometry(0.012, 0.02, 1, 4);
  antennaGeo.translate(0, 0.5, 0);
  const antennas = new THREE.InstancedMesh(antennaGeo, antennaMat, antennaData.length);
  antennas.castShadow = false;
  antennas.frustumCulled = false;
  antennaData.forEach((b, i) => {
    dummy.position.set(
      b.x + range(-b.w * 0.2, b.w * 0.2),
      b.y + b.h,
      b.z + range(-b.d * 0.2, b.d * 0.2)
    );
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, range(0.8, 2.1), 1);
    dummy.updateMatrix();
    antennas.setMatrixAt(i, dummy.matrix);
  });
  antennas.instanceMatrix.needsUpdate = true;
  scene.add(antennas);

  // --- Arbres -------------------------------------------------------------
  const treeData = [];
  const treePalette = ['#2e6b45', '#357a4c', '#2a5f3e', '#3f8a55', '#245237', '#4b9a63', '#32734b'];

  function addTree(x, z, scale = 1) {
    if (Math.abs(x) > 82 || Math.abs(z) > 82) return;
    const y = terrainHeight(x, z);
    if (y > 30) return;
    treeData.push({
      x, z, y,
      s: scale * range(0.85, 1.5),
      rot: rnd() * TAU,
      color: new THREE.Color(pick(treePalette)),
    });
  }

  // Lignes d'arbres le long des routes de colline
  treeLineSamples.forEach((p, i) => {
    if (i % 3 !== 0) return;
    const side = rnd() < 0.5 ? 1 : -1;
    const off = p.w * 0.5 + range(1.2, 2.6);
    addTree(p.x + p.nx * off * side, p.z + p.nz * off * side, range(0.7, 1.15));
  });

  // Arbres de la vallée / avenues
  for (let z = -74; z <= 74; z += 6) {
    if (rnd() < 0.72) addTree(16.6 + range(-0.8, 0.8), z + range(-1.4, 1.4), range(0.8, 1.2));
    if (rnd() < 0.62) addTree(-15.6 + range(-1, 1), z + range(-1.4, 1.4), range(0.75, 1.15));
  }

  // Parques del Río
  for (let z = 17; z <= 58; z += 2.2) {
    for (const side of [-1, 1]) {
      if (rnd() < 0.55) {
        const off = 5.2 + range(0, 4.5);
        addTree(RIVER_X(z) + side * off, z + range(-1, 1), range(0.8, 1.35));
      }
    }
  }

  // Moravia
  for (let i = 0; i < 26; i++) {
    const a = rnd() * TAU;
    const r = range(5.5, 10.5);
    addTree(-12 + Math.cos(a) * r, -30 + Math.sin(a) * r, range(0.75, 1.2));
  }

  // Bibliothèque
  for (let i = 0; i < 16; i++) {
    const a = rnd() * TAU;
    const r = range(7.5, 12.5);
    addTree(43 + Math.cos(a) * r, 25 + Math.sin(a) * r, range(0.8, 1.25));
  }

  // Taches végétales sur les collines
  for (let i = 0; i < 120; i++) {
    const x = range(19, 55);
    const z = range(-70, 70);
    if (blocked(x, z, -0.5)) continue;
    addTree(x, z, range(0.8, 1.5));
  }
  for (let i = 0; i < 45; i++) {
    addTree(range(-55, -22), range(-70, 70), range(0.8, 1.5));
  }

  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunkGeo = new THREE.CylinderGeometry(0.075, 0.11, 1, 5);
  trunkGeo.translate(0, 0.5, 0);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3426,
    roughness: 1,
    metalness: 0,
  });
  const canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, treeData.length);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeData.length);
  canopyMesh.castShadow = true;
  trunkMesh.castShadow = false;
  canopyMesh.frustumCulled = false;
  trunkMesh.frustumCulled = false;
  canopyMesh.receiveShadow = true;
  trunkMesh.receiveShadow = true;
  treeData.forEach((t, i) => canopyMesh.setColorAt(i, t.color));
  if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;
  scene.add(canopyMesh, trunkMesh);

  // --- Métro --------------------------------------------------------------
  const metroGroup = new THREE.Group();
  scene.add(metroGroup);

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xa9a597, roughness: 0.9, metalness: 0.02 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x202824, roughness: 0.6, metalness: 0.55 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x1b9b6b, roughness: 0.6, metalness: 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x182a2e,
    emissive: 0xffc27a,
    emissiveIntensity: 0.2,
    roughness: 0.25,
    metalness: 0.4,
  });
  const trainBodyMat = new THREE.MeshStandardMaterial({ color: 0xe7e4d8, roughness: 0.45, metalness: 0.25 });
  const trainGlassMat = new THREE.MeshStandardMaterial({
    color: 0x102025,
    emissive: 0xffd08a,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.3,
  });

  // Viaduc
  const viaductX = 8.5;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.45, 158), concreteMat);
  deck.position.set(viaductX, 3.25, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;
  metroGroup.add(deck);

  for (let z = -76; z <= 76; z += 9.5) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 3.2, 8), concreteMat);
    pillar.position.set(viaductX, 1.6, z);
    pillar.castShadow = true;
    metroGroup.add(pillar);
  }

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 158), darkMetalMat);
    rail.position.set(viaductX + side * 0.95, 3.53, 0);
    metroGroup.add(rail);
  }

  // Train
  const train = new THREE.Group();
  const carCount = 3;
  for (let i = 0; i < carCount; i++) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 4.6), trainBodyMat);
    body.position.y = 1.3;
    body.castShadow = true;
    car.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.78, 3.9), trainGlassMat);
    band.position.y = 1.65;
    car.add(band);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.16, 4.5), greenMat);
    stripe.position.y = 0.78;
    car.add(stripe);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 4.2), darkMetalMat);
    roof.position.y = 2.6;
    car.add(roof);
    car.position.z = i * 4.95;
    train.add(car);
  }
  train.position.set(viaductX, 3.55, -70);
  metroGroup.add(train);

  // Gare
  const station = new THREE.Group();
  const platform = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 13), concreteMat);
  platform.position.set(0, 0, 0);
  station.add(platform);
  for (let i = -1; i <= 1; i += 2) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), darkMetalMat);
    col.position.set(i * 1.4, 1.5, -5);
    station.add(col);
    const col2 = col.clone();
    col2.position.z = 5;
    station.add(col2);
  }
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 12), greenMat);
  canopy.position.y = 3.1;
  canopy.castShadow = true;
  station.add(canopy);
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.12), greenMat);
  signBoard.position.set(0, 2.6, -5.2);
  station.add(signBoard);
  station.position.set(viaductX + 2.1, 3.5, 9);
  metroGroup.add(station);

  // Entrées de tunnel
  for (const z of [-78, 78]) {
    const portal = new THREE.Mesh(new THREE.BoxGeometry(6.5, 5.6, 2.2), new THREE.MeshStandardMaterial({ color: 0x202723, roughness: 0.95 }));
    portal.position.set(viaductX, 2.8, z);
    portal.castShadow = true;
    metroGroup.add(portal);
  }

  // --- Metrocable ---------------------------------------------------------
  const cableGroup = new THREE.Group();
  scene.add(cableGroup);

  const cablePath = [
    new THREE.Vector3(10, 5.2, 9.5),
    new THREE.Vector3(18, 8.2, 11.5),
    new THREE.Vector3(27, 11.6, 13.5),
    new THREE.Vector3(35, 16.1, 16.5),
    new THREE.Vector3(44, 20.4, 19.5),
  ];
  const cableCurveUp = new THREE.CatmullRomCurve3(
    cablePath.map((p) => p.clone().add(new THREE.Vector3(0, 0, 0.8)))
  );
  const cableCurveDown = new THREE.CatmullRomCurve3(
    cablePath.map((p) => p.clone().add(new THREE.Vector3(0, 0, -0.8)))
  );

  const cableMat = new THREE.MeshStandardMaterial({ color: 0x2b312e, roughness: 0.5, metalness: 0.7 });
  const cableTubeUp = new THREE.Mesh(new THREE.TubeGeometry(cableCurveUp, 100, 0.055, 4, false), cableMat);
  const cableTubeDown = new THREE.Mesh(new THREE.TubeGeometry(cableCurveDown, 100, 0.055, 4, false), cableMat);
  cableGroup.add(cableTubeUp, cableTubeDown);

  // Pylônes
  const towerBeaconMat = new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.8 });
  for (const t of [0.17, 0.37, 0.57, 0.77, 0.94]) {
    const p = cableCurveUp.getPointAt(t);
    const ground = terrainHeight(p.x, p.z);
    const h = p.y - ground - 0.4;
    if (h < 1.5) continue;
    const footing = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 1.15), concreteMat);
    footing.position.set(p.x, ground + 0.25, p.z);
    footing.castShadow = true;
    footing.receiveShadow = true;
    cableGroup.add(footing);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, h, 6), darkMetalMat);
    tower.position.set(p.x, ground + h / 2, p.z);
    tower.castShadow = true;
    cableGroup.add(tower);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 3.2), darkMetalMat);
    cross.position.set(p.x, p.y - 0.35, p.z);
    cableGroup.add(cross);
    for (const s of [-1, 1]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, h * 0.42), darkMetalMat);
      brace.position.set(p.x + s * 0.18, ground + h * 0.3, p.z);
      brace.rotation.x = s * 0.42;
      cableGroup.add(brace);
    }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), towerBeaconMat);
    beacon.position.set(p.x, p.y + 0.25, p.z);
    cableGroup.add(beacon);
  }

  // Gares du téléphérique
  function buildCableStation(x, z, y, big = false) {
    const g = new THREE.Group();
    const w = big ? 6 : 4.6;
    const d = big ? 8 : 6;
    const platform = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), concreteMat);
    platform.position.y = 0.25;
    platform.receiveShadow = true;
    g.add(platform);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.24, d + 1), greenMat);
    roof.position.y = 5.05;
    roof.castShadow = true;
    g.add(roof);
    for (let i = -2; i <= 2; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(w + 1.3, 0.05, 0.1), darkMetalMat);
      rib.position.set(0, 5.19, i * (d / 5));
      g.add(rib);
    }
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.08, 0.12), greenMat);
    edge.position.set(0, 0.56, d / 2 - 0.05);
    g.add(edge);
    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.18, 0.7 - s * 0.12), concreteMat);
      step.position.set(0, 0.09 + s * 0.18, d / 2 + 0.55 + s * 0.6);
      step.receiveShadow = true;
      g.add(step);
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.9, 6), darkMetalMat);
        col.position.set(sx * (w / 2 - 0.4), 2.45, sz * (d / 2 - 0.4));
        g.add(col);
      }
    }
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.8, 2.2, 0.08), glassMat);
    glass.position.set(0, 2, -d / 2 + 0.05);
    g.add(glass);
    const glass2 = glass.clone();
    glass2.position.z = d / 2 - 0.05;
    g.add(glass2);
    g.position.set(x, y, z);
    cableGroup.add(g);
    return g;
  }
  buildCableStation(10, 9.5, 0.55, true);
  buildCableStation(27, 13.5, terrainHeight(27, 13.5) + 0.2, false);
  buildCableStation(44, 19.5, terrainHeight(44, 19.5) + 0.1, true);

  // Cabines
  const cabins = [];
  const cabinBodyMat = new THREE.MeshStandardMaterial({ color: 0xf0ede2, roughness: 0.4, metalness: 0.25 });
  const cabinGlassMat = new THREE.MeshStandardMaterial({
    color: 0x14262a,
    emissive: 0xffd7a0,
    emissiveIntensity: 0.7,
    roughness: 0.18,
    metalness: 0.35,
  });
  const cabinGreenMat = new THREE.MeshStandardMaterial({ color: 0x1c9d6d, roughness: 0.55, metalness: 0.2 });
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 5), darkMetalMat);
    arm.position.y = -0.55;
    g.add(arm);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.3, 1.45), cabinBodyMat);
    body.position.y = -1.55;
    body.castShadow = true;
    g.add(body);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.29, 0.48, 1.49), cabinGlassMat);
    glass.position.y = -1.45;
    g.add(glass);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.12, 1.52), cabinGreenMat);
    roof.position.y = -0.92;
    g.add(roof);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.18, 1.48), cabinGreenMat);
    skirt.position.y = -2.17;
    g.add(skirt);
    g.userData = {
      curve: i < 5 ? cableCurveUp : cableCurveDown,
      offset: (i % 5) / 5,
      dir: i < 5 ? 1 : -1,
      phase: rnd() * TAU,
    };
    cableGroup.add(g);
    cabins.push(g);
  }

  // --- Parc Bibliothèque España ------------------------------------------
  const libraryGroup = new THREE.Group();
  scene.add(libraryGroup);

  const libX = 43;
  const libZ = 25;
  const libBase = terrainHeight(libX, libZ);
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 15), new THREE.MeshStandardMaterial({ color: 0x8f8a7d, roughness: 0.95 }));
  terrace.position.set(libX, libBase - 2.2, libZ);
  terrace.castShadow = true;
  terrace.receiveShadow = true;
  libraryGroup.add(terrace);
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.25, 15.2), new THREE.MeshStandardMaterial({ color: 0xc3bca9, roughness: 0.9 }));
  plaza.position.set(libX, libBase + 0.4, libZ);
  plaza.receiveShadow = true;
  libraryGroup.add(plaza);

  const libMat = new THREE.MeshStandardMaterial({ color: 0x18262c, roughness: 0.48, metalness: 0.3 });
  const libWindowMat = new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.85 });
  const libCapMat = new THREE.MeshStandardMaterial({ color: 0x0e191e, roughness: 0.54, metalness: 0.36 });
  const libFrameMat = new THREE.MeshStandardMaterial({ color: 0x0a1215, roughness: 0.5, metalness: 0.42 });
  const monoliths = [
    { x: -4.4, z: 1.5, w: 3.5, h: 9.5, d: 3.4, ry: 0.18, rz: 0.02 },
    { x: 0.2, z: 3.2, w: 4.1, h: 12.5, d: 4.0, ry: -0.1, rz: -0.03 },
    { x: 4.3, z: -1.4, w: 3.2, h: 7.6, d: 3.1, ry: 0.26, rz: 0.035 },
  ];
  monoliths.forEach((m) => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(m.w, m.h, m.d), libMat);
    tower.position.set(libX + m.x, libBase + 0.55 + m.h / 2, libZ + m.z);
    tower.rotation.y = m.ry;
    tower.rotation.z = m.rz;
    tower.castShadow = true;
    tower.receiveShadow = true;
    libraryGroup.add(tower);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(m.w * 1.08, 0.24, m.d * 1.08), libCapMat);
    cap.position.set(libX + m.x, libBase + 0.55 + m.h + 0.12, libZ + m.z);
    cap.rotation.y = m.ry;
    cap.rotation.z = m.rz;
    cap.castShadow = true;
    libraryGroup.add(cap);

    // Bandes de fenêtres horizontales sur la façade principale
    for (const band of [0.2, 0.46, 0.72]) {
      const y = libBase + 0.55 + m.h * band;
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(m.w * 0.74, m.h * 0.095), libFrameMat);
      frame.position.set(
        libX + m.x + Math.sin(m.ry) * (m.d / 2 + 0.015),
        y,
        libZ + m.z + Math.cos(m.ry) * (m.d / 2 + 0.015)
      );
      frame.rotation.y = m.ry;
      frame.rotation.z = m.rz;
      libraryGroup.add(frame);

      const win = new THREE.Mesh(new THREE.PlaneGeometry(m.w * 0.66, m.h * 0.07), libWindowMat);
      win.position.set(
        libX + m.x + Math.sin(m.ry) * (m.d / 2 + 0.032),
        y,
        libZ + m.z + Math.cos(m.ry) * (m.d / 2 + 0.032)
      );
      win.rotation.y = m.ry;
      win.rotation.z = m.rz;
      libraryGroup.add(win);
    }

    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.08, m.h * 0.65), new THREE.MeshBasicMaterial({ color: 0x8be8c4, transparent: true, opacity: 0.5 }));
    seam.position.set(
      libX + m.x + Math.sin(m.ry + 0.6) * (m.w / 2 + 0.02),
      libBase + 1.2 + m.h * 0.35,
      libZ + m.z + Math.cos(m.ry + 0.6) * (m.d / 2 + 0.02)
    );
    seam.rotation.y = m.ry + Math.PI / 2;
    libraryGroup.add(seam);
  });

  // Parapets et escalier du parterre
  const parapetMat = new THREE.MeshStandardMaterial({ color: 0x9a9484, roughness: 0.93 });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.42, 0.18), parapetMat);
    wall.position.set(libX, libBase + 0.62, libZ + side * 7.55);
    wall.castShadow = true;
    libraryGroup.add(wall);
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 15.2), parapetMat);
    sideWall.position.set(libX + side * 8.05, libBase + 0.62, libZ);
    sideWall.castShadow = true;
    libraryGroup.add(sideWall);
  }
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xaaa28f, roughness: 0.95 });
  for (let s = 0; s < 4; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(7.4 - s * 0.85, 0.26, 1.05), stepMat);
    step.position.set(libX, libBase + 0.28 - s * 0.25, libZ + 8 + s * 0.92);
    step.receiveShadow = true;
    step.castShadow = true;
    libraryGroup.add(step);
  }

  // Chemin vers la gare haute
  const libPath = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    libPath.push(new THREE.Vector3(
      lerp(44, 40, t) + Math.sin(t * 4) * 1.6,
      0,
      lerp(19.5, 24, t)
    ));
  }
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xb7ae99, roughness: 0.95, side: THREE.DoubleSide });
  const libPathMesh = buildRibbon(libPath, 1.6, pathMat, 0.15);
  libraryGroup.add(libPathMesh);

  // --- Moravia ------------------------------------------------------------
  const moraviaGroup = new THREE.Group();
  scene.add(moraviaGroup);

  const morX = -12;
  const morZ = -30;
  const morBase = terrainHeight(morX, morZ);
  const moundMat = new THREE.MeshStandardMaterial({ color: 0x3d6b45, roughness: 1, metalness: 0, flatShading: true });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(9, 28, 16), moundMat);
  mound.scale.set(1, 0.34, 1);
  mound.position.set(morX, morBase - 1.4, morZ);
  mound.receiveShadow = true;
  mound.castShadow = true;
  moraviaGroup.add(mound);

  const morMoundY = (r) => morBase - 1.4 + 0.34 * Math.sqrt(Math.max(0, 81 - r * r));

  const moraviaNewGroup = new THREE.Group();
  moraviaGroup.add(moraviaNewGroup);

  const morPlaza = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.6, 0.4, 24), new THREE.MeshStandardMaterial({ color: 0xb8b09c, roughness: 0.95 }));
  morPlaza.position.set(morX, morBase + 1.65, morZ);
  moraviaNewGroup.add(morPlaza);

  // Anneaux de promenade sur le jardin
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xc9bfa6, roughness: 0.95, side: THREE.DoubleSide });
  for (const [r0, r1] of [[4.7, 5.25], [7.0, 7.55]]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 56), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(morX, morMoundY((r0 + r1) / 2) + 0.07, morZ);
    moraviaNewGroup.add(ring);
  }

  const centerMat = new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 0.85, metalness: 0.02 });
  const center = new THREE.Mesh(new THREE.BoxGeometry(7.4, 2.3, 3.8), centerMat);
  center.position.set(morX, morBase + 2.9, morZ - 0.6);
  center.castShadow = true;
  moraviaNewGroup.add(center);
  const centerRoof = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 4.4), new THREE.MeshStandardMaterial({ color: 0x2f6b45, roughness: 0.9 }));
  centerRoof.position.set(morX, morBase + 4.2, morZ - 0.6);
  centerRoof.castShadow = true;
  moraviaNewGroup.add(centerRoof);

  const centerGlass = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.9, 0.08), new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.75 }));
  centerGlass.position.set(morX, morBase + 2.9, morZ - 2.52);
  moraviaNewGroup.add(centerGlass);

  // Auvent et terrasse du centre culturel
  const morCanopyMat = new THREE.MeshStandardMaterial({ color: 0x2a5c3d, roughness: 0.88, metalness: 0.04 });
  const morCanopy = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.18, 1.7), morCanopyMat);
  morCanopy.position.set(morX, morBase + 4.25, morZ + 1.55);
  morCanopy.castShadow = true;
  moraviaNewGroup.add(morCanopy);
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.8, 6), darkMetalMat);
    post.position.set(morX + sx * 3.9, morBase + 2.2, morZ + 2.2);
    moraviaNewGroup.add(post);
  }
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xb08a5e, roughness: 0.92 });
  const morDeck = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.16, 2.6), deckMat);
  morDeck.position.set(morX, morBase + 2.0, morZ + 1.5);
  morDeck.receiveShadow = true;
  moraviaNewGroup.add(morDeck);

  // Jardins colorés et parcelles partagées
  const gardenColors = [0x6fae6d, 0x88c47e, 0x5b9a63, 0xd1a95f, 0xb8d18a];
  for (let i = 0; i < 14; i++) {
    const a = rnd() * TAU;
    const r = range(2.8, 8.2);
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(range(0.7, 1.6), 9),
      new THREE.MeshStandardMaterial({ color: pick(gardenColors), roughness: 1 })
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(morX + Math.cos(a) * r, morMoundY(r) + 0.08, morZ + Math.sin(a) * r);
    moraviaNewGroup.add(patch);
  }

  const soilMat = new THREE.MeshStandardMaterial({ color: 0x5b4630, roughness: 1 });
  const plotMat = new THREE.MeshStandardMaterial({ color: 0x4f8b52, roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.35;
    const r = range(5.8, 7.8);
    const x = morX + Math.cos(a) * r;
    const z = morZ + Math.sin(a) * r;
    const y = morMoundY(r) + 0.09;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 1.0), soilMat);
    bed.position.set(x, y, z);
    bed.rotation.y = -a;
    moraviaNewGroup.add(bed);
    const crop = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.12, 0.82), plotMat);
    crop.position.set(x, y + 0.12, z);
    crop.rotation.y = -a;
    moraviaNewGroup.add(crop);
  }

  // Petites maisons colorées autour de Moravia
  for (let i = 0; i < 18; i++) {
    const a = rnd() * TAU;
    const r = range(10.5, 16);
    const x = morX + Math.cos(a) * r;
    const z = morZ + Math.sin(a) * r;
    if (Math.abs(x - RIVER_X(z)) < 5) continue;
    const y = terrainHeight(x, z);
    const house = new THREE.Mesh(
      new THREE.BoxGeometry(range(1.4, 2.4), range(1.6, 2.8), range(1.4, 2.4)),
      new THREE.MeshStandardMaterial({ color: pick(['#c06b55', '#d39a6a', '#a85d4a', '#cbb58e']), roughness: 0.9 })
    );
    house.position.set(x, y + 0.8, z);
    house.rotation.y = rnd() * TAU;
    house.castShadow = true;
    moraviaGroup.add(house);
  }

  // --- Parques del Río ----------------------------------------------------
  const parquesGroup = new THREE.Group();
  scene.add(parquesGroup);

  const parkGreenMat = new THREE.MeshStandardMaterial({
    color: 0x376848,
    roughness: 0.95,
    metalness: 0.01,
    side: THREE.DoubleSide,
  });
  const parkPathMat = new THREE.MeshStandardMaterial({
    color: 0xb08a5e,
    roughness: 0.92,
    metalness: 0.01,
    side: THREE.DoubleSide,
  });

  for (const side of [-1, 1]) {
    const bank = [];
    const path = [];
    const hedge = [];
    for (let z = 16; z <= 59; z += 1.6) {
      bank.push(new THREE.Vector3(RIVER_X(z) + side * 7.4, 0, z));
      path.push(new THREE.Vector3(RIVER_X(z) + side * 4.8, 0, z));
      hedge.push(new THREE.Vector3(RIVER_X(z) + side * 11.2, 0, z));
    }
    const green = buildRibbon(bank, 8.2, parkGreenMat, 0.12);
    const walk = buildRibbon(path, 2.0, parkPathMat, 0.2);
    parquesGroup.add(green, walk);
  }

  // Haies périphériques du parc
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2e5f3e, roughness: 0.96, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const hedge = [];
    for (let z = 16; z <= 59; z += 1.6) {
      hedge.push(new THREE.Vector3(RIVER_X(z) + side * 11.2, 0, z));
    }
    const hedgeMesh = buildRibbon(hedge, 1.0, hedgeMat, 0.28);
    parquesGroup.add(hedgeMesh);
  }

  // Bancs, pergolas et belvédère
  const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x9a6f45, roughness: 0.88 });
  const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x2c332f, roughness: 0.6, metalness: 0.45 });
  const pergolaMat = new THREE.MeshStandardMaterial({ color: 0x8a6541, roughness: 0.9 });
  const addBench = (x, z, rot) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.42), benchWoodMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.34, 0.06), benchWoodMat);
    back.position.set(0, 0.66, -0.19);
    back.rotation.x = -0.12;
    g.add(back);
    for (const sx of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.34), benchMetalMat);
      leg.position.set(sx, 0.22, 0);
      g.add(leg);
    }
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    parquesGroup.add(g);
  };
  for (const z of [21, 27, 33, 39, 45, 51, 57]) {
    for (const side of [-1, 1]) {
      addBench(RIVER_X(z) + side * 6.6, z, side > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
  }

  for (const z of [32, 50]) {
    const g = new THREE.Group();
    const x = RIVER_X(z) + 7.4;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), pergolaMat);
        post.position.set(sx * 1.5, 1.25, sz * 1.15);
        post.castShadow = true;
        g.add(post);
      }
    }
    for (let i = -3; i <= 3; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.07, 0.16), pergolaMat);
      slat.position.set(0, 2.55, i * 0.34);
      slat.castShadow = true;
      g.add(slat);
    }
    g.position.set(x, terrainHeight(x, z), z);
    parquesGroup.add(g);
  }

  const belvedereDeck = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.8, 0.18, 28), parkPathMat);
  belvedereDeck.position.set(RIVER_X(41) - 7.2, terrainHeight(RIVER_X(41) - 7.2, 41) + 0.22, 41);
  belvedereDeck.receiveShadow = true;
  parquesGroup.add(belvedereDeck);

  // Passerelles
  for (const z of [29, 47]) {
    const rx = RIVER_X(z);
    const bridge = new THREE.Group();
    const deckB = new THREE.Mesh(new THREE.BoxGeometry(16, 0.28, 1.7), new THREE.MeshStandardMaterial({ color: 0xc9c0ac, roughness: 0.9 }));
    deckB.position.y = 2.1;
    deckB.castShadow = true;
    bridge.add(deckB);
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 0.08), darkMetalMat);
      rail.position.set(0, 3, s * 0.82);
      bridge.add(rail);
      for (let i = -7; i <= 7; i += 3.5) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 5), darkMetalMat);
        post.position.set(i, 2.55, s * 0.82);
        bridge.add(post);
      }
    }
    bridge.position.set(rx, 0, z);
    parquesGroup.add(bridge);
  }

  // --- Couloirs verts — Reverdecer 2030 ----------------------------------
  const corridorsGroup = new THREE.Group();
  scene.add(corridorsGroup);

  const medianMat = new THREE.MeshStandardMaterial({
    color: 0x3f7d4f,
    roughness: 0.96,
    metalness: 0.01,
    side: THREE.DoubleSide,
  });
  for (const arr of [avenue, westAvenue]) {
    const pts = arr.map(([x, z]) => new THREE.Vector3(x, 0, z));
    corridorsGroup.add(buildRibbon(pts, 1.35, medianMat, 0.17));
  }

  // Haies basses le long des terre-pleins
  const hedgeData = [];
  for (const arr of [avenue, westAvenue]) {
    for (let i = 0; i < arr.length; i += 2) {
      const [x, z] = arr[i];
      for (const s of [-1, 1]) {
        hedgeData.push({ x: x + s * 1.0, z, y: terrainHeight(x, z) });
      }
    }
  }
  const corridorHedgeGeo = new THREE.BoxGeometry(1, 1, 1);
  corridorHedgeGeo.translate(0, 0.5, 0);
  const corridorHedgeMat = new THREE.MeshStandardMaterial({ color: 0x2f6b43, roughness: 0.95 });
  const corridorHedges = new THREE.InstancedMesh(corridorHedgeGeo, corridorHedgeMat, hedgeData.length);
  corridorHedges.castShadow = true;
  corridorHedges.receiveShadow = true;
  corridorHedges.frustumCulled = false;
  hedgeData.forEach((h, i) => {
    dummy.position.set(h.x, h.y, h.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(range(0.45, 0.7), range(0.34, 0.52), range(1.4, 2.1));
    dummy.updateMatrix();
    corridorHedges.setMatrixAt(i, dummy.matrix);
  });
  corridorHedges.instanceMatrix.needsUpdate = true;
  corridorsGroup.add(corridorHedges);

  // Massifs fleuris
  const flowerData = [];
  for (const arr of [avenue, westAvenue]) {
    for (let i = 1; i < arr.length - 1; i += 3) {
      if (rnd() > 0.6) continue;
      const [x, z] = arr[i];
      flowerData.push({
        x: x + range(-0.4, 0.4),
        z: z + range(-1.2, 1.2),
        y: terrainHeight(x, z) + 0.22,
        s: range(0.32, 0.82),
        color: new THREE.Color(pick(['#d9a35f', '#c96f5a', '#e3c879', '#8fbf7a', '#b9d18a'])),
      });
    }
  }
  const flowerGeo = new THREE.CircleGeometry(1, 8);
  flowerGeo.rotateX(-Math.PI / 2);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerData.length);
  flowers.frustumCulled = false;
  flowerData.forEach((f, i) => {
    dummy.position.set(f.x, f.y, f.z);
    dummy.rotation.set(0, rnd() * TAU, 0);
    dummy.scale.setScalar(f.s);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, f.color);
  });
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  corridorsGroup.add(flowers);

  // --- Cultura Metro ------------------------------------------------------
  const cultureGroup = new THREE.Group();
  scene.add(cultureGroup);

  const cultureX = 14;
  const cultureZ = 5.2;
  const cultureY = terrainHeight(cultureX, cultureZ);
  const culturePlazaMat = new THREE.MeshStandardMaterial({ color: 0xb9b09b, roughness: 0.94 });
  const culturePlaza = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 4.15, 0.16, 30), culturePlazaMat);
  culturePlaza.position.set(cultureX, cultureY + 0.09, cultureZ);
  culturePlaza.receiveShadow = true;
  cultureGroup.add(culturePlaza);

  const totemMat = new THREE.MeshStandardMaterial({ color: 0xb23a2f, roughness: 0.54, metalness: 0.18 });
  const totemGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe3c0, transparent: true, opacity: 0.8 });
  for (const [dx, dz, ry] of [[-1.9, -1.3, 0.3], [1.9, 1.5, -0.22]]) {
    const totem = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.7, 1.15), totemMat);
    totem.position.set(cultureX + dx, cultureY + 1.43, cultureZ + dz);
    totem.rotation.y = ry;
    totem.castShadow = true;
    cultureGroup.add(totem);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, 0.94), totemGlowMat);
    stripe.position.set(
      cultureX + dx + Math.sin(ry) * 0.12,
      cultureY + 1.9,
      cultureZ + dz + Math.cos(ry) * 0.12
    );
    stripe.rotation.y = ry;
    cultureGroup.add(stripe);
  }

  const sculptureMat = new THREE.MeshStandardMaterial({
    color: 0x1c9d6d,
    roughness: 0.34,
    metalness: 0.5,
    emissive: 0x0d5f42,
    emissiveIntensity: 0.4,
  });
  const sculpture = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.085, 8, 40), sculptureMat);
  sculpture.position.set(cultureX + 1.4, cultureY + 1.45, cultureZ - 1.5);
  sculpture.rotation.y = 0.45;
  sculpture.castShadow = true;
  cultureGroup.add(sculpture);

  const cultureBenchMat = new THREE.MeshStandardMaterial({ color: 0x9a6f45, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.8;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 0.38), cultureBenchMat);
    bench.position.set(cultureX + Math.cos(a) * 2.4, cultureY + 0.52, cultureZ + Math.sin(a) * 2.4);
    bench.rotation.y = -a;
    bench.castShadow = true;
    cultureGroup.add(bench);
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.3), darkMetalMat);
      leg.position.set(
        cultureX + Math.cos(a) * 2.4 + Math.cos(-a) * s * 0.48,
        cultureY + 0.27,
        cultureZ + Math.sin(a) * 2.4 + Math.sin(-a) * s * 0.48
      );
      leg.rotation.y = -a;
      cultureGroup.add(leg);
    }
  }

  // --- Le bataillon des jardiniers ---------------------------------------
  const gardenersGroup = new THREE.Group();
  scene.add(gardenersGroup);

  const gardenX = 25;
  const gardenZ = -13;
  const gardenY = terrainHeight(gardenX, gardenZ);
  const nurseryGroundMat = new THREE.MeshStandardMaterial({ color: 0x8d8a7b, roughness: 0.96 });
  const nurseryGround = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.26, 7.2), nurseryGroundMat);
  nurseryGround.position.set(gardenX, gardenY + 0.05, gardenZ);
  nurseryGround.receiveShadow = true;
  nurseryGround.castShadow = true;
  gardenersGroup.add(nurseryGround);

  // Serre
  const greenhouseFrameMat = new THREE.MeshStandardMaterial({ color: 0xd7d3c4, roughness: 0.5, metalness: 0.3 });
  const greenhouseGlassMat = new THREE.MeshStandardMaterial({
    color: 0x9ccfbd,
    roughness: 0.12,
    metalness: 0.08,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const ghX = gardenX - 2.2;
  const ghZ = gardenZ + 1.7;
  const gh = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.1, 2.5), greenhouseGlassMat);
  gh.position.set(ghX, gardenY + 1.25, ghZ);
  gardenersGroup.add(gh);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.2, 0.09), greenhouseFrameMat);
      post.position.set(ghX + sx * 2.0, gardenY + 1.15, ghZ + sz * 1.25);
      gardenersGroup.add(post);
    }
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.08, 0.1), greenhouseFrameMat);
  ridge.position.set(ghX, gardenY + 2.34, ghZ);
  gardenersGroup.add(ridge);
  const ghRoof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 2.7), greenhouseGlassMat);
  ghRoof.position.set(ghX, gardenY + 2.38, ghZ);
  gardenersGroup.add(ghRoof);

  // Planches de culture
  const planterSoilMat = new THREE.MeshStandardMaterial({ color: 0x55402b, roughness: 1 });
  const planterGreenMat = new THREE.MeshStandardMaterial({ color: 0x4f8b52, roughness: 1 });
  for (let r = 0; r < 4; r++) {
    const px = gardenX + 0.9;
    const pz = gardenZ - 2.2 + r * 1.2;
    const soil = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 0.62), planterSoilMat);
    soil.position.set(px, gardenY + 0.33, pz);
    soil.castShadow = true;
    gardenersGroup.add(soil);
    const crop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 0.5), planterGreenMat);
    crop.position.set(px, gardenY + 0.55, pz);
    gardenersGroup.add(crop);
  }

  // Jeunes plants
  const saplingTrunkGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.9, 5);
  saplingTrunkGeo.translate(0, 0.45, 0);
  const saplingCanopyGeo = new THREE.IcosahedronGeometry(0.32, 0);
  const saplingTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 1 });
  const saplingCanopyMat = new THREE.MeshStandardMaterial({ color: 0x4b9a63, roughness: 0.9 });
  const saplingCount = 22;
  const saplingTrunks = new THREE.InstancedMesh(saplingTrunkGeo, saplingTrunkMat, saplingCount);
  const saplingCanopies = new THREE.InstancedMesh(saplingCanopyGeo, saplingCanopyMat, saplingCount);
  saplingTrunks.frustumCulled = false;
  saplingCanopies.frustumCulled = false;
  for (let i = 0; i < saplingCount; i++) {
    const px = gardenX + range(-1.1, 3.0);
    const pz = gardenZ + range(-3.1, 2.9);
    const py = gardenY + 0.16;
    dummy.position.set(px, py, pz);
    dummy.rotation.set(0, rnd() * TAU, 0);
    dummy.scale.setScalar(range(0.75, 1.15));
    dummy.updateMatrix();
    saplingTrunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(px, py + range(0.75, 0.95), pz);
    dummy.scale.setScalar(range(0.8, 1.2));
    dummy.updateMatrix();
    saplingCanopies.setMatrixAt(i, dummy.matrix);
  }
  saplingTrunks.instanceMatrix.needsUpdate = true;
  saplingCanopies.instanceMatrix.needsUpdate = true;
  gardenersGroup.add(saplingTrunks, saplingCanopies);

  // Abri de chantier
  const shed = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.7, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xc9b795, roughness: 0.9 })
  );
  shed.position.set(gardenX + 3.2, gardenY + 1.0, gardenZ + 2.2);
  shed.castShadow = true;
  gardenersGroup.add(shed);
  const shedRoof = new THREE.Mesh(
    new THREE.BoxGeometry(2.45, 0.16, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x2f6b45, roughness: 0.9 })
  );
  shedRoof.position.set(gardenX + 3.2, gardenY + 1.9, gardenZ + 2.2);
  shedRoof.castShadow = true;
  gardenersGroup.add(shedRoof);
  const shedDoor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.25, 0.05), new THREE.MeshStandardMaterial({ color: 0x4c3a28, roughness: 0.9 }));
  shedDoor.position.set(gardenX + 3.2, gardenY + 0.8, gardenZ + 1.28);
  gardenersGroup.add(shedDoor);

  const waterTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.46, 1.15, 12),
    new THREE.MeshStandardMaterial({ color: 0x3a4a42, roughness: 0.55, metalness: 0.3 })
  );
  waterTank.position.set(gardenX + 3.4, gardenY + 0.75, gardenZ - 2.3);
  waterTank.castShadow = true;
  gardenersGroup.add(waterTank);


  const lampPositions = [];
  for (let z = -72; z <= 72; z += 12) {
    lampPositions.push([15.2, z]);
    lampPositions.push([-15.2, z + 6]);
  }
  for (const z of [18, 30, 42, 54]) {
    lampPositions.push([RIVER_X(z) + 5.5, z]);
    lampPositions.push([RIVER_X(z) - 5.5, z]);
  }
  lampPositions.push([43, 16], [43, 33], [-12, -20], [10, 13]);

  const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 3.2, 5);
  poleGeo.translate(0, 1.6, 0);
  const bulbGeo = new THREE.SphereGeometry(0.14, 8, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a302c, roughness: 0.8, metalness: 0.4 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffcf8f, transparent: true, opacity: 0 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampPositions.length);
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampPositions.length);
  poles.frustumCulled = false;
  bulbs.frustumCulled = false;
  lampPositions.forEach(([x, z], i) => {
    const y = terrainHeight(x, z);
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, y + 3.25, z);
    dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
  });
  poles.instanceMatrix.needsUpdate = true;
  bulbs.instanceMatrix.needsUpdate = true;
  scene.add(poles, bulbs);

  addPlazaLight(43, libBase + 5, 25, 0xffc07a, 22, 32);
  addPlazaLight(10, 6, 9.5, 0xffd6a0, 16, 26);
  addPlazaLight(-12, morBase + 4, -30, 0xffc98a, 14, 24);
  addPlazaLight(0, 3.5, 38, 0xffd2a0, 12, 28);
  addPlazaLight(30, terrainHeight(30, -6) + 3, -6, 0xa8ffcc, 8, 22);
  addPlazaLight(14, cultureY + 2.2, 5.2, 0xffc98a, 9, 18);
  addPlazaLight(25, gardenY + 2.2, -13, 0xa8ffcc, 7, 18);

  // --- Fumée / pollution (1991) ------------------------------------------
  const smogGeo = new THREE.BufferGeometry();
  {
    const count = 90;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = range(-35, 35);
      pos[i * 3 + 1] = range(3, 24);
      pos[i * 3 + 2] = range(-70, 70);
    }
    smogGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }
  const smogMat = new THREE.PointsMaterial({
    map: makeSoftDotTexture(),
    color: 0xa9a79b,
    size: 11,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const smog = new THREE.Points(smogGeo, smogMat);
  scene.add(smog);

  // --- Lucioles (nuit, aujourd'hui) --------------------------------------
  const fireflyGeo = new THREE.BufferGeometry();
  {
    const count = 80;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = range(14, 50);
      pos[i * 3 + 1] = range(2, 14);
      pos[i * 3 + 2] = range(-60, 60);
    }
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }
  const fireflyMat = new THREE.PointsMaterial({
    map: makeSoftDotTexture(),
    color: 0x9dffd0,
    size: 0.9,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
  scene.add(fireflies);

  // --- Anneau de focus ----------------------------------------------------
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.55, 56),
    new THREE.MeshBasicMaterial({
      color: 0x35d399,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 3;
  scene.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.6, 18, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x35d399,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  scene.add(beam);

  // --- Matériaux à faire apparaître / disparaître selon l'époque ---------
  const fadeGroups = [cableGroup, metroGroup, libraryGroup, moraviaNewGroup, parquesGroup, corridorsGroup, cultureGroup, gardenersGroup];
  const groupMaterials = new Map();
  fadeGroups.forEach((g) => {
    const mats = new Set();
    g.traverse((o) => {
      if (!o.isMesh && !o.isPoints && !o.isSprite) return;
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => mats.add(x));
      else if (m) mats.add(m);
    });
    const list = [...mats];
    list.forEach((m) => {
      if (m.userData.baseOpacity === undefined) {
        m.userData.baseOpacity = m.opacity;
        m.transparent = true;
      }
    });
    groupMaterials.set(g, list);
  });

  // -------------------------------------------------------------------------
  // Application des états (époque / heure)
  // -------------------------------------------------------------------------

  const palettes = {
    nightAfter: { top: '#030b13', bottom: '#12352b' },
    nightBefore: { top: '#0b1112', bottom: '#41433a' },
    dayAfter: { top: '#6ca9a3', bottom: '#e9dfc5' },
    dayBefore: { top: '#8c928b', bottom: '#d6cbb4' },
  };
  const fogNightAfter = new THREE.Color('#07130f');
  const fogNightBefore = new THREE.Color('#54564c');
  const fogDayAfter = new THREE.Color('#a8c3b8');
  const fogDayBefore = new THREE.Color('#a7a79a');
  const sunNight = new THREE.Color('#9db9e8');
  const sunDay = new THREE.Color('#ffeccb');
  const hemiSkyNight = new THREE.Color('#2e4d5e');
  const hemiSkyDay = new THREE.Color('#c8e6da');
  const hemiGroundNight = new THREE.Color('#070d0a');
  const hemiGroundDay = new THREE.Color('#2a3b2f');

  function mixPalette(night, day, t) {
    return tmpColor.copy(night).lerp(tmpColor2.set(day), t);
  }

  function applyEraVisuals() {
    const p = state.eraProgress;
    const before = 1 - p;

    // Couleurs des bâtiments
    for (const b of buildings) {
      tmpColor.copy(b.past).lerp(b.base, p);
      b.mesh.setColorAt(b.index, tmpColor);
    }
    towers.mesh.instanceColor.needsUpdate = true;
    houses.mesh.instanceColor.needsUpdate = true;

    // Arbres : croissance
    const visible = p > 0.008;
    canopyMesh.visible = visible;
    trunkMesh.visible = visible;
    if (visible) {
      for (let i = 0; i < treeData.length; i++) {
        const t = treeData[i];
        const s = t.s * p;
        dummy.position.set(t.x, t.y, t.z);
        dummy.rotation.set(0, t.rot, 0);
        dummy.scale.set(s * 0.16, s * 1.2, s * 0.16);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.set(t.x, t.y + s * 1.9, t.z);
        dummy.rotation.set(0, t.rot, 0);
        dummy.scale.set(s * 1.05, s * 0.95, s * 1.05);
        dummy.updateMatrix();
        canopyMesh.setMatrixAt(i, dummy.matrix);
      }
      trunkMesh.instanceMatrix.needsUpdate = true;
      canopyMesh.instanceMatrix.needsUpdate = true;
    }

    // Groupes de projets
    fadeGroups.forEach((g) => {
      g.visible = p > 0.008;
      const mats = groupMaterials.get(g) || [];
      mats.forEach((m) => {
        m.opacity = (m.userData.baseOpacity ?? 1) * p;
        m.depthWrite = p > 0.82;
      });
    });

    // Moravia : décharge -> jardin
    moundMat.color.copy(new THREE.Color('#5b5443')).lerp(new THREE.Color('#3d6b45'), p);

    // Fumée
    smogMat.opacity = before * 0.16;
    // Lucioles
    fireflyMat.opacity = p * state.timeProgress * 0.7;
    // Éclairage public
    bulbMat.opacity = state.timeProgress * (0.2 + 0.8 * p);

    // Fenêtres
    facadeMat.emissiveIntensity =
      (0.18 + 0.82 * p) * (0.06 + 0.94 * state.timeProgress) * 1.55;

    // Lumières de place
    plazaLights.forEach((l) => {
      l.intensity = l.userData.base * state.timeProgress * p;
    });

    // Étoiles / lune
    starMat.opacity = state.timeProgress * (0.35 + 0.65 * p) * 0.9;
    moon.material.opacity = state.timeProgress * 0.95;
    moonGlow.material.opacity = state.timeProgress * 0.55;

    // Brouillard et ciel
    const dayMix = 1 - state.timeProgress;
    const topNight = new THREE.Color(palettes.nightAfter.top).lerp(new THREE.Color(palettes.nightBefore.top), before);
    const topDay = new THREE.Color(palettes.dayAfter.top).lerp(new THREE.Color(palettes.dayBefore.top), before);
    skyUniforms.topColor.value.copy(topNight).lerp(topDay, dayMix);
    const botNight = new THREE.Color(palettes.nightAfter.bottom).lerp(new THREE.Color(palettes.nightBefore.bottom), before);
    const botDay = new THREE.Color(palettes.dayAfter.bottom).lerp(new THREE.Color(palettes.dayBefore.bottom), before);
    skyUniforms.bottomColor.value.copy(botNight).lerp(botDay, dayMix);

    const fogNight = fogNightAfter.clone().lerp(fogNightBefore, before);
    const fogDay = fogDayAfter.clone().lerp(fogDayBefore, before);
    scene.fog.color.copy(fogNight).lerp(fogDay, dayMix);
    scene.fog.density = lerp(0.0068, 0.0046, dayMix) + before * 0.0016;

    // Soleil / hémisphère
    sun.color.copy(sunNight).lerp(sunDay, dayMix);
    sun.intensity = lerp(0.38, 2.5, dayMix) * (0.8 + 0.2 * p);
    hemi.color.copy(hemiSkyNight).lerp(hemiSkyDay, dayMix);
    hemi.groundColor.copy(hemiGroundNight).lerp(hemiGroundDay, dayMix);
    hemi.intensity = lerp(0.36, 1.05, dayMix);
    ambient.intensity = lerp(0.16, 0.32, dayMix);
    renderer.toneMappingExposure = lerp(1.16, 1.0, dayMix);

    // Eau
    riverMat.emissiveIntensity = lerp(0.62, 0.18, dayMix);
  }

  function applyTimeVisuals() {
    // Les deux états sont couplés : on réapplique l'ensemble.
    applyEraVisuals();
  }

  function setEra(era, { instant = false } = {}) {
    if (era !== 'before' && era !== 'after') return;
    state.era = era;
    state.eraTarget = era === 'after' ? 1 : 0;
    if (instant) {
      state.eraProgress = state.eraTarget;
      applyEraVisuals();
    }
  }

  function setTime(time, { instant = false } = {}) {
    if (time !== 'day' && time !== 'night') return;
    state.time = time;
    state.timeTarget = time === 'night' ? 1 : 0;
    if (instant) {
      state.timeProgress = state.timeTarget;
      applyTimeVisuals();
    }
  }

  // --- Caméra / vols ------------------------------------------------------
  let flight = null;
  let focusTarget = null;
  let focusAmount = 0;
  let introDone = false;

  function flyTo(view, duration = 1.9) {
    flight = {
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...view.pos),
      fromTarget: controls.target.clone(),
      toTarget: new THREE.Vector3(...view.target),
      t: 0,
      duration,
    };
    controls.autoRotate = false;
    controls.enabled = false;
  }

  function resetView(instant = false) {
    setFocus(null);
    if (instant) {
      camera.position.set(...OVERVIEW_VIEW.pos);
      controls.target.set(...OVERVIEW_VIEW.target);
      camera.lookAt(controls.target);
      controls.enabled = true;
      return;
    }
    flyTo(OVERVIEW_VIEW, 1.9);
  }

  function zoomBy(factor) {
    const target = controls.target.clone();
    const dir = camera.position.clone().sub(target);
    const dist = clamp(dir.length() * factor, 20, 135);
    dir.setLength(dist);
    flyTo(
      { pos: target.clone().add(dir).toArray(), target: target.toArray() },
      0.6
    );
  }

  function setFocus(pos) {
    focusTarget = pos ? new THREE.Vector3(pos[0], 0, pos[1]) : null;
    if (!focusTarget) {
      focusAmount = 0;
      ring.material.opacity = 0;
      beam.material.opacity = 0;
      return;
    }
    const y = terrainHeight(focusTarget.x, focusTarget.z);
    focusTarget.y = y;
    ring.position.set(focusTarget.x, y + 0.35, focusTarget.z);
    beam.position.set(focusTarget.x, y + 9, focusTarget.z);
    focusAmount = 1;
  }

  // --- Redimensionnement --------------------------------------------------
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.82 ? 54 : 40;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // --- Boucle -------------------------------------------------------------
  let running = true;
  let last = performance.now();
  let elapsed = 0;

  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;

    // Transitions d'époque
    if (Math.abs(state.eraProgress - state.eraTarget) > 0.001) {
      state.eraProgress += (state.eraTarget - state.eraProgress) * (1 - Math.exp(-dt * 2.4));
      if (Math.abs(state.eraProgress - state.eraTarget) < 0.001) state.eraProgress = state.eraTarget;
      applyEraVisuals();
    }
    // Transitions jour/nuit
    if (Math.abs(state.timeProgress - state.timeTarget) > 0.001) {
      state.timeProgress += (state.timeTarget - state.timeProgress) * (1 - Math.exp(-dt * 2.6));
      if (Math.abs(state.timeProgress - state.timeTarget) < 0.001) state.timeProgress = state.timeTarget;
      applyTimeVisuals();
    }

    // Vol de caméra
    if (flight) {
      flight.t += dt / flight.duration;
      const t = clamp(flight.t, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(flight.fromPos, flight.toPos, e);
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, e);
      camera.lookAt(controls.target);
      if (t >= 1) {
        flight = null;
        controls.enabled = true;
        controls.update();
        if (!introDone) {
          introDone = true;
          controls.autoRotate = !reducedMotion;
        }
      }
    } else {
      controls.update();
    }

    // Eau
    waterTex.offset.y -= dt * 0.012;

    // Cabines
    if (cableGroup.visible) {
      const speed = reducedMotion ? 0.004 : 0.017;
      cabins.forEach((c, i) => {
        const u = c.userData;
        let t = (u.offset + elapsed * speed * u.dir + (u.dir < 0 ? 1 : 0)) % 1;
        if (t < 0) t += 1;
        const curve = u.curve;
        const pos = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);
        c.position.copy(pos);
        c.lookAt(pos.clone().add(tan));
        c.rotation.z += Math.sin(elapsed * 1.7 + u.phase) * 0.025;
      });
    }

    // Train
    if (metroGroup.visible) {
      train.position.z += dt * 8.5;
      if (train.position.z > 82) train.position.z = -82;
    }

    // Anneau de focus
    if (focusAmount > 0 && focusTarget) {
      const pulse = 1 + Math.sin(elapsed * 2.6) * 0.14;
      ring.scale.setScalar(pulse);
      ring.material.opacity = 0.55 + Math.sin(elapsed * 2.6) * 0.18;
      beam.material.opacity = 0.08 + Math.sin(elapsed * 2.2) * 0.03;
    }

    // Fumée
    if (smogMat.opacity > 0.001) {
      smog.rotation.y += dt * 0.004;
    }
    // Lucioles
    if (fireflyMat.opacity > 0.001) {
      fireflies.rotation.y += dt * 0.006;
      const pos = fireflyGeo.attributes.position;
      for (let i = 0; i < 12; i++) {
        const idx = Math.floor(rnd() * pos.count);
        pos.setY(idx, clamp(pos.getY(idx) + Math.sin(elapsed + idx) * 0.02, 1.5, 15));
      }
      pos.needsUpdate = true;
    }

    // Lune / étoiles très légère respiration
    moonGlow.material.opacity = state.timeProgress * (0.5 + Math.sin(elapsed * 0.8) * 0.05);

    renderer.render(scene, camera);
  }

  // --- Intro --------------------------------------------------------------
  function playIntro() {
    if (reducedMotion) {
      resetView(true);
      introDone = true;
      return;
    }
    camera.position.set(96, 74, 116);
    controls.target.set(2, 8, 0);
    camera.lookAt(controls.target);
    controls.autoRotate = false;
    flyTo(OVERVIEW_VIEW, 3.4);
  }

  // --- Démarrage ----------------------------------------------------------
  applyEraVisuals();
  requestAnimationFrame(tick);

  // Petite vibration de l'anneau au repos
  setFocus(projects[0].focus);
  ring.material.opacity = 0;
  beam.material.opacity = 0;
  focusAmount = 0;

  return {
    scene,
    camera,
    renderer,
    controls,
    setEra,
    setTime,
    flyTo,
    resetView,
    zoomBy,
    setFocus,
    playIntro,
    resize,
    getEra: () => state.era,
    getEraProgress: () => state.eraProgress,
    getTime: () => state.time,
    isIntroDone: () => introDone,
    dispose() {
      running = false;
      window.removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
}
