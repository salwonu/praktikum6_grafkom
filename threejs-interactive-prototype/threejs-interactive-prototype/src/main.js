import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ------------------------------------------------------------------ */
/* Konfigurasi                                                         */
/* ------------------------------------------------------------------ */

// Ganti ke 'assets/models/RobotExpressive.glb' jika file sudah diunduh ke repo.
const MODEL_URL =
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/RobotExpressive/RobotExpressive.glb';

// Clip yang diputar berulang; clip lain diputar sekali lalu kembali ke idle.
const LOOPING_CLIPS = ['idle', 'walking', 'running', 'dance'];

const HOVER_STYLE = { color: 0x3366ff, intensity: 0.45, scale: 1.07 };
const SELECT_STYLE = { color: 0xffaa22, intensity: 0.6, scale: 1.15 };

const $ = (id) => document.getElementById(id);
const ui = {
  hover: $('hudHover'),
  selected: $('hudSelected'),
  clip: $('hudClip'),
  env: $('hudEnv'),
  fps: $('hudFps'),
  info: $('info'),
  clips: $('clips'),
  btnEnv: $('btnEnv'),
  btnAxes: $('btnAxes'),
  loading: $('loading'),
};

/* ------------------------------------------------------------------ */
/* Renderer, scene, camera                                             */
/* ------------------------------------------------------------------ */

const container = $('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1e2b);
scene.fog = new THREE.Fog(0x1a1e2b, 25, 60);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 5, 14);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, -0.5);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.minDistance = 4;
controls.maxDistance = 30;
controls.update();

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 1 ? 75 : 50; // layar potret: FOV lebih lebar
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(container);
resize();

/* ------------------------------------------------------------------ */
/* Lighting, shadow, environment                                       */
/* ------------------------------------------------------------------ */

scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x20242e, 0.6));

const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(6, 10, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 35;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);

// Environment lighting untuk PBR (tanpa file HDR eksternal).
const pmrem = new THREE.PMREMGenerator(renderer);
const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

function setEnvironment(on) {
  scene.environment = on ? envTexture : null;
  ui.btnEnv.textContent = `Environment: ${on ? 'ON' : 'OFF'}`;
  ui.env.textContent = on ? 'ON (RoomEnvironment)' : 'OFF (hanya lampu)';
}
let envEnabled = true;
setEnvironment(envEnabled);

/* ------------------------------------------------------------------ */
/* Ground                                                              */
/* ------------------------------------------------------------------ */

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x3a3f4b, roughness: 0.9, metalness: 0 })
);
ground.name = 'Ground';
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(60, 60, 0x566075, 0x2e3340);
grid.position.y = 0.01;
scene.add(grid);

/* ------------------------------------------------------------------ */
/* Scene graph                                                         */
/*                                                                     */
/* Scene                                                               */
/*  └─ WorldRoot (Group)                                               */
/*      ├─ PBRGallery (Group, berputar)  ── 6 sphere PBR               */
/*      ├─ SolarSystem (Group)                                         */
/*      │   ├─ Sun                                                     */
/*      │   └─ PlanetPivot (Group, berputar)                           */
/*      │       ├─ Planet                                              */
/*      │       └─ MoonPivot (Group, berputar) └─ Moon                 */
/*      └─ RobotAnchor (Group) └─ model GLB                            */
/* ------------------------------------------------------------------ */

const worldRoot = new THREE.Group();
worldRoot.name = 'WorldRoot';
scene.add(worldRoot);

const selectables = []; // root object yang bisa di-hover/di-klik
const axesHelpers = [];

function addAxes(group, size = 1.2) {
  const axes = new THREE.AxesHelper(size);
  axes.name = `${group.name}_Axes`;
  group.add(axes);
  axesHelpers.push(axes);
}

function collectMaterials(root) {
  const list = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m.emissive && !list.includes(m)) {
        m.userData.baseEmissive = m.emissive.clone();
        m.userData.baseEmissiveIntensity = m.emissiveIntensity;
        list.push(m);
      }
    }
  });
  return list;
}

function registerSelectable(root, label, description) {
  root.userData.selectable = true;
  root.userData.label = label;
  root.userData.description = description;
  root.userData.baseScale = root.scale.clone();
  root.userData.scaleTarget = 1;
  root.userData.materials = collectMaterials(root);
  selectables.push(root);
}

function makeSphere(name, radius, material, description) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  registerSelectable(mesh, name, description);
  return mesh;
}

// --- PBR material gallery (Group + child) ---
const galleryGroup = new THREE.Group();
galleryGroup.name = 'PBRGallery';
galleryGroup.position.set(-6, 1.2, -1);
worldRoot.add(galleryGroup);

const pbrCombos = [
  [1, 0.1], [1, 0.5], [1, 0.9], // metalness, roughness
  [0, 0.1], [0, 0.5], [0, 0.9],
];
pbrCombos.forEach(([metalness, roughness], i) => {
  const angle = (i / pbrCombos.length) * Math.PI * 2;
  const material = new THREE.MeshStandardMaterial({
    color: metalness ? 0xffd28a : 0x4f8cff,
    roughness,
    metalness,
  });
  const s = makeSphere(
    `Sphere M${metalness} R${roughness}`,
    0.55,
    material,
    'Bagian PBR material gallery: variasi metalness dan roughness.'
  );
  s.position.set(Math.cos(angle) * 2, 0, Math.sin(angle) * 2);
  galleryGroup.add(s);
});
addAxes(galleryGroup, 1.5);

// --- Hierarchical solar system ---
const solarSystem = new THREE.Group();
solarSystem.name = 'SolarSystem';
solarSystem.position.set(6, 1.8, -1);
worldRoot.add(solarSystem);

const sunMesh = makeSphere(
  'Sun',
  0.8,
  new THREE.MeshStandardMaterial({
    color: 0xffb347, emissive: 0xcc5500, emissiveIntensity: 0.5, roughness: 0.6, metalness: 0,
  }),
  'Pusat tata surya mini; parent dari PlanetPivot adalah SolarSystem.'
);

const planetPivot = new THREE.Group();
planetPivot.name = 'PlanetPivot';

const planet = makeSphere(
  'Planet',
  0.4,
  new THREE.MeshStandardMaterial({ color: 0x3fa7ff, roughness: 0.4, metalness: 0.1 }),
  'Planet: local position tetap (2.4, 0, 0) tetapi world position terus berubah.'
);
planet.position.set(2.4, 0, 0);

const moonPivot = new THREE.Group();
moonPivot.name = 'MoonPivot';
moonPivot.position.set(2.4, 0, 0); // mengikuti posisi planet di dalam PlanetPivot

const moon = makeSphere(
  'Moon',
  0.15,
  new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9, metalness: 0 }),
  'Bulan: gabungan rotasi PlanetPivot dan MoonPivot menentukan world position-nya.'
);
moon.position.set(0.85, 0, 0);

moonPivot.add(moon);
planetPivot.add(planet, moonPivot);
solarSystem.add(sunMesh, planetPivot);
addAxes(planetPivot, 1.2);

// --- Anchor untuk model GLB ---
const robotAnchor = new THREE.Group();
robotAnchor.name = 'RobotAnchor';
worldRoot.add(robotAnchor);
addAxes(robotAnchor, 1.2);

/* ------------------------------------------------------------------ */
/* Load GLB + animasi                                                  */
/* ------------------------------------------------------------------ */

let mixer = null;
const actions = {};
let clipNames = [];
let idleName = null;
let currentAction = null;
let currentName = null;
let meshCount = 0;
let boneCount = 0;

function logHierarchy(root, label) {
  const lines = [];
  root.traverse((o) => {
    let depth = 0;
    for (let p = o; p !== root; p = p.parent) depth++;
    lines.push(`${'  '.repeat(depth)}${o.type}: ${o.name || '(tanpa nama)'}`);
  });
  console.groupCollapsed(`${label} (${lines.length} node)`);
  console.log(lines.join('\n'));
  console.groupEnd();
}

function playClip(name, fade = 0.35) {
  const next = actions[name];
  if (!next) return;
  const loops = LOOPING_CLIPS.includes(name.toLowerCase());
  next.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1);
  next.clampWhenFinished = !loops;

  if (currentAction && currentAction !== next) currentAction.fadeOut(fade);
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();

  currentAction = next;
  currentName = name;
  ui.clip.textContent = name + (loops ? ' (loop)' : ' (sekali)');
  for (const b of ui.clips.querySelectorAll('button')) {
    b.classList.toggle('active', b.dataset.clip === name);
  }
}

function playNextClip() {
  if (!clipNames.length) return;
  const i = clipNames.indexOf(currentName);
  playClip(clipNames[(i + 1) % clipNames.length]);
}

async function loadModel() {
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(MODEL_URL, (e) => {
      if (e.lengthComputable) {
        ui.loading.textContent = `Memuat model GLB… ${Math.round((e.loaded / e.total) * 100)}%`;
      }
    });

    const model = gltf.scene;
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        meshCount++;
        // Clone material agar emissive satu mesh tidak ikut mengubah mesh lain.
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      }
      if (o.isBone) boneCount++;
    });
    robotAnchor.add(model);
    logHierarchy(model, 'Hierarchy GLB');

    registerSelectable(
      robotAnchor,
      'Robot Expressive (GLB)',
      'Model GLB dengan banyak child mesh dan banyak animation clip. Klik untuk ganti clip.'
    );

    mixer = new THREE.AnimationMixer(model);
    clipNames = gltf.animations.map((c) => c.name);
    for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);

    idleName = clipNames.find((n) => n.toLowerCase().includes('idle')) ?? clipNames[0] ?? null;
    mixer.addEventListener('finished', (e) => {
      if (e.action === currentAction && idleName) playClip(idleName, 0.3);
    });

    for (const name of clipNames) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = name;
      b.dataset.clip = name;
      b.addEventListener('click', () => playClip(name));
      ui.clips.appendChild(b);
    }
    if (idleName) playClip(idleName, 0);

    ui.loading.classList.add('hidden');
  } catch (err) {
    console.error('Gagal memuat GLB:', err);
    ui.loading.textContent = 'Gagal memuat model GLB. Periksa koneksi / path MODEL_URL, dan jalankan lewat local server.';
  }
}
loadModel();

/* ------------------------------------------------------------------ */
/* Raycasting, hover, selection                                        */
/* ------------------------------------------------------------------ */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerInside = false;
let hovered = null;
let hoveredMeshName = '';
let selected = null;
const down = { x: 0, y: 0, active: false };

function setPointerNDC(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function findSelectable(obj) {
  for (let o = obj; o; o = o.parent) if (o.userData.selectable) return o;
  return null;
}

// recursive = true -> child mesh dari model GLB ikut terdeteksi
function pick() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(selectables, true);
  if (!hits.length) return { root: null, mesh: null };
  return { root: findSelectable(hits[0].object), mesh: hits[0].object };
}

function applyVisual(root) {
  const mode = root === selected ? 'selected' : root === hovered ? 'hover' : 'none';
  const style = mode === 'selected' ? SELECT_STYLE : mode === 'hover' ? HOVER_STYLE : null;
  for (const m of root.userData.materials) {
    if (style) {
      m.emissive.setHex(style.color);
      m.emissiveIntensity = style.intensity;
    } else {
      m.emissive.copy(m.userData.baseEmissive);
      m.emissiveIntensity = m.userData.baseEmissiveIntensity;
    }
  }
  root.userData.scaleTarget = style ? style.scale : 1;
}

function setHovered(root, meshName = '') {
  hoveredMeshName = meshName;
  if (root === hovered) return;
  const prev = hovered;
  hovered = root;
  if (prev) applyVisual(prev);
  if (root) applyVisual(root);
  renderer.domElement.style.cursor = root ? 'pointer' : 'default';
}

function setSelected(root) {
  if (root === selected) return;
  const prev = selected;
  selected = root;
  if (prev) applyVisual(prev);
  if (root) applyVisual(root);
  ui.selected.textContent = root ? root.userData.label : 'belum ada';
  renderInfo();
}

const canvas = renderer.domElement;
canvas.addEventListener('pointermove', (e) => {
  pointerInside = true;
  setPointerNDC(e);
});
canvas.addEventListener('pointerleave', () => {
  pointerInside = false;
  setHovered(null);
});
canvas.addEventListener('pointerdown', (e) => {
  down.x = e.clientX;
  down.y = e.clientY;
  down.active = true;
});
canvas.addEventListener('pointerup', (e) => {
  if (!down.active) return;
  down.active = false;
  // Bedakan klik dengan drag OrbitControls.
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;

  setPointerNDC(e);
  const { root } = pick();
  setSelected(root);
  if (root === robotAnchor) playNextClip(); // challenge: click menjalankan animasi
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setSelected(null);
  if (e.key.toLowerCase() === 'e') ui.btnEnv.click();
  if (e.key.toLowerCase() === 'a') ui.btnAxes.click();
});

ui.btnEnv.addEventListener('click', () => {
  envEnabled = !envEnabled;
  setEnvironment(envEnabled);
});
let axesVisible = true;
ui.btnAxes.addEventListener('click', () => {
  axesVisible = !axesVisible;
  axesHelpers.forEach((a) => (a.visible = axesVisible));
  ui.btnAxes.textContent = `Axes: ${axesVisible ? 'ON' : 'OFF'}`;
});

/* ------------------------------------------------------------------ */
/* Information panel (local vs world transform)                        */
/* ------------------------------------------------------------------ */

const tmpWorld = new THREE.Vector3();
const fmt = (v) => `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;

function hierarchyPath(obj) {
  const names = [];
  for (let o = obj; o; o = o.parent) names.unshift(o.name || o.type);
  return names.join(' › ');
}

function renderInfo() {
  if (!selected) {
    ui.info.innerHTML =
      '<h2>Information Panel</h2><p>Klik sebuah objek untuk melihat detail. Esc untuk batal pilih.</p>' +
      '<p>Local = relatif terhadap parent. World = posisi sebenarnya di scene.</p>';
    return;
  }
  const o = selected;
  o.getWorldPosition(tmpWorld);

  let extra = '';
  if (o.isMesh && o.material.isMeshStandardMaterial) {
    extra =
      `<dt>Roughness</dt><dd>${o.material.roughness.toFixed(2)}</dd>` +
      `<dt>Metalness</dt><dd>${o.material.metalness.toFixed(2)}</dd>`;
  } else if (o === robotAnchor) {
    extra =
      `<dt>Mesh / Bone</dt><dd>${meshCount} / ${boneCount}</dd>` +
      `<dt>Clip</dt><dd>${currentName ?? '-'} (${clipNames.length} tersedia)</dd>`;
  }

  ui.info.innerHTML =
    `<h2>${o.userData.label}</h2><p>${o.userData.description}</p>` +
    '<dl>' +
    `<dt>Parent</dt><dd>${o.parent ? o.parent.name : '-'}</dd>` +
    `<dt>Path</dt><dd>${hierarchyPath(o)}</dd>` +
    `<dt>Local pos</dt><dd>${fmt(o.position)}</dd>` +
    `<dt>World pos</dt><dd>${fmt(tmpWorld)}</dd>` +
    extra +
    '</dl>';
}

/* ------------------------------------------------------------------ */
/* Animation loop (semua berbasis delta time)                          */
/* ------------------------------------------------------------------ */

const clock = new THREE.Clock();
const tmpScale = new THREE.Vector3();
let infoTimer = 0;
let fps = 60;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1); // batasi saat tab di-background

  // Transform hierarki (rad/detik)
  galleryGroup.rotation.y += 0.4 * delta;
  sunMesh.rotation.y += 0.3 * delta;
  planetPivot.rotation.y += 0.6 * delta;
  planet.rotation.y += 1.5 * delta;
  moonPivot.rotation.y += 2.0 * delta;

  mixer?.update(delta);

  // Hover dicek tiap frame agar tetap benar saat objek bergerak.
  if (pointerInside && !down.active) {
    const { root, mesh } = pick();
    setHovered(root, mesh && root && mesh !== root ? mesh.name : '');
  }
  ui.hover.textContent = hovered
    ? hovered.userData.label + (hoveredMeshName ? ` › ${hoveredMeshName}` : '')
    : '-';

  // Scale feedback dihaluskan dengan damping yang independen dari FPS.
  const k = 1 - Math.exp(-12 * delta);
  for (const r of selectables) {
    tmpScale.copy(r.userData.baseScale).multiplyScalar(r.userData.scaleTarget);
    r.scale.lerp(tmpScale, k);
  }

  controls.update();

  infoTimer += delta;
  if (infoTimer > 0.1) {
    infoTimer = 0;
    if (selected) renderInfo();
    ui.fps.textContent = Math.round(fps);
  }
  fps += (1 / Math.max(delta, 1e-4) - fps) * 0.05;

  renderer.render(scene, camera);
});

renderInfo();
logHierarchy(scene, 'Scene graph');
