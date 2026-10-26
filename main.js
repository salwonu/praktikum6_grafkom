import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

/* ============ 1. SCENE, CAMERA, RENDERER ============ */
const canvas = document.querySelector('#app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2040);
scene.fog = new THREE.Fog(0x1a2040, 25, 60);

const perspCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
perspCamera.position.set(7, 6, 10);

// Challenge: OrthographicCamera
const orthoSize = 8; // setengah tinggi frustum
const aspect0 = window.innerWidth / window.innerHeight;
const orthoCamera = new THREE.OrthographicCamera(
  -orthoSize * aspect0, orthoSize * aspect0, orthoSize, -orthoSize, 0.1, 100
);
orthoCamera.position.copy(perspCamera.position);
orthoCamera.lookAt(0, 1, 0);

let activeCamera = perspCamera;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // pixel ratio dibatasi
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(activeCamera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.update();

/* ============ 2. LIGHTS ============ */
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(6, 10, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);

// Challenge (Light animation): point light yang mengorbit + marker (MeshBasicMaterial)
const orbitLight = new THREE.PointLight(0xff8844, 25, 14, 2);
scene.add(orbitLight);
const orbitMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff8844 }) // material TIDAK merespons cahaya
);
orbitLight.add(orbitMarker);

/* ============ 3. MESHES ============ */
// Ground (PlaneGeometry)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x4a6b4f, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2; // rotation
ground.receiveShadow = true;
scene.add(ground);

// Box (BoxGeometry)
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 1.5, 1.5),
  new THREE.MeshStandardMaterial({ color: 0xe5484d, roughness: 0.5, metalness: 0.1 })
);
box.position.set(-3, 0.75, 0);   // position
box.rotation.y = Math.PI / 6;    // rotation
box.scale.set(1, 1.3, 1);        // scale
box.castShadow = true;
scene.add(box);

// Sphere (SphereGeometry)
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 48, 48),
  new THREE.MeshPhongMaterial({ color: 0x3e9bff, shininess: 80 })
);
sphere.position.set(0, 1, 0);
sphere.userData.baseY = 1;
sphere.castShadow = true;
scene.add(sphere);

// Challenge (Tambah 2 geometry): Cone & Torus
const cone = new THREE.Mesh(
  new THREE.ConeGeometry(0.9, 2, 32),
  new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.4 })
);
cone.position.set(3, 1, 0);
cone.castShadow = true;
scene.add(cone);

const torus = new THREE.Mesh(
  new THREE.TorusGeometry(0.8, 0.3, 24, 64),
  new THREE.MeshStandardMaterial({ color: 0xb06bff, roughness: 0.3, metalness: 0.6 })
);
torus.position.set(0, 1.2, 3.5);
torus.castShadow = true;
scene.add(torus);

/* ============ 4. MATERIAL GALLERY (Challenge) ============ */
const gallery = new THREE.Group();
const galleryMaterials = [
  ['Basic', new THREE.MeshBasicMaterial({ color: 0xffffff })],
  ['Lambert', new THREE.MeshLambertMaterial({ color: 0xffffff })],
  ['Phong', new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 })],
  ['Standard', new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.5 })],
  ['Physical', new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1 })],
  ['Toon', new THREE.MeshToonMaterial({ color: 0xffffff })],
  ['Normal', new THREE.MeshNormalMaterial()],
];
galleryMaterials.forEach(([name, mat], i) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), mat);
  m.name = `Gallery-${name}`;
  m.position.set((i - 3) * 1.6, 0.55, -6);
  m.castShadow = true;
  gallery.add(m);
});
scene.add(gallery);

/* ============ 5. OBJECT CONTROL (Challenge) ============ */
const selectable = [
  { name: 'Box', obj: box },
  { name: 'Sphere', obj: sphere },
  { name: 'Cone', obj: cone },
  { name: 'Torus', obj: torus },
];
let selectedIndex = 0;
const selectionBox = new THREE.BoxHelper(selectable[0].obj, 0xffff00);
scene.add(selectionBox);

const keys = new Set();

/* ============ 6. STATE & KEYBOARD ============ */
let animating = true;
let sunOrbit = false;
let animTime = 0;
let shadowSize = 2048;

function setShadowQuality(size) {
  shadowSize = size;
  sun.shadow.mapSize.set(size, size);
  if (sun.shadow.map) {   // buang shadow map lama agar dibuat ulang dengan ukuran baru
    sun.shadow.map.dispose();
    sun.shadow.map = null;
  }
}

function toggleCamera() {
  const next = activeCamera === perspCamera ? orthoCamera : perspCamera;
  next.position.copy(activeCamera.position);
  next.quaternion.copy(activeCamera.quaternion);
  activeCamera = next;
  controls.object = activeCamera;
  controls.update();
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['tab', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (e.repeat) { keys.add(k); return; }
  keys.add(k);

  if (k === ' ') animating = !animating;
  else if (k === 'c') toggleCamera();
  else if (k === 'l') sunOrbit = !sunOrbit;
  else if (k === 'g') gallery.visible = !gallery.visible;
  else if (k === '1') setShadowQuality(512);
  else if (k === '2') setShadowQuality(1024);
  else if (k === '3') setShadowQuality(2048);
  else if (k === '4') setShadowQuality(4096);
  else if (k === 'tab') {
    selectedIndex = (selectedIndex + 1) % selectable.length;
    selectionBox.setFromObject(selectable[selectedIndex].obj);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function applyObjectControl(dt) {
  const o = selectable[selectedIndex].obj;
  const move = 4 * dt;
  if (keys.has('arrowleft')) o.position.x -= move;
  if (keys.has('arrowright')) o.position.x += move;
  if (keys.has('arrowup')) o.position.z -= move;
  if (keys.has('arrowdown')) o.position.z += move;
  if (keys.has('r')) o.position.y += move;
  if (keys.has('f')) o.position.y = Math.max(0.1, o.position.y - move);
  if (keys.has('q')) o.rotation.y += 2 * dt;
  if (keys.has('e')) o.rotation.y -= 2 * dt;
  if (keys.has('+') || keys.has('=')) o.scale.multiplyScalar(1 + dt);
  if (keys.has('-') || keys.has('_')) o.scale.multiplyScalar(1 - dt);
}

/* ============ 7. RESPONSIVE ============ */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const a = w / h;

  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  perspCamera.aspect = a;
  perspCamera.updateProjectionMatrix();

  orthoCamera.left = -orthoSize * a;
  orthoCamera.right = orthoSize * a;
  orthoCamera.top = orthoSize;
  orthoCamera.bottom = -orthoSize;
  orthoCamera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

/* ============ 8. HUD / SCENE INFORMATION ============ */
const hud = document.querySelector('#hud');
let hudTimer = 0;
let frames = 0;
let fps = 0;

function countObjects() {
  let meshes = 0, lights = 0;
  scene.traverse((o) => {
    if (o.isMesh) meshes++;
    if (o.isLight) lights++;
  });
  return { meshes, lights };
}

function updateHud(dt) {
  frames++;
  hudTimer += dt;
  if (hudTimer < 0.25) return;
  fps = Math.round(frames / hudTimer);
  frames = 0;
  hudTimer = 0;

  const { meshes, lights } = countObjects();
  const info = renderer.info;
  hud.textContent =
    `MINI 3D SCENE\n` +
    `FPS            : ${fps}\n` +
    `Kamera         : ${activeCamera.isPerspectiveCamera ? 'Perspective' : 'Orthographic'}\n` +
    `Animasi        : ${animating ? 'ON' : 'OFF'}   Sun orbit: ${sunOrbit ? 'ON' : 'OFF'}\n` +
    `Shadow map     : ${shadowSize}x${shadowSize}\n` +
    `Mesh / Light   : ${meshes} / ${lights}\n` +
    `Draw calls     : ${info.render.calls}\n` +
    `Triangles      : ${info.render.triangles}\n` +
    `Geometries     : ${info.memory.geometries}\n` +
    `Terpilih       : ${selectable[selectedIndex].name}`;
}

/* ============ 9. ANIMATION LOOP ============ */
const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const dt = clock.getDelta(); // delta time

  if (animating) {
    animTime += dt;
    box.rotation.y += 0.8 * dt;
    cone.rotation.y -= 1.2 * dt;
    torus.rotation.x += 1.0 * dt;
    torus.rotation.y += 0.6 * dt;
    sphere.position.y = sphere.userData.baseY + Math.abs(Math.sin(animTime * 2)) * 1.2;

    // Light animation
    orbitLight.position.set(Math.cos(animTime * 1.2) * 6, 2.5, Math.sin(animTime * 1.2) * 6);
    if (sunOrbit) {
      sun.position.set(Math.cos(animTime * 0.5) * 10, 10, Math.sin(animTime * 0.5) * 10);
    }
  }

  applyObjectControl(dt);
  selectionBox.setFromObject(selectable[selectedIndex].obj);

  controls.update();
  renderer.render(scene, activeCamera);
  updateHud(dt);
}

orbitLight.position.set(6, 2.5, 0);
onResize();
tick();
