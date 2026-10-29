/* =========================================================
   Jadaun Legal — WebGL hero
   An abstract "monument": brass rings, a colonnade and a
   glass obelisk, lit like an object in a dark courtroom.
   ========================================================= */

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const canvas = document.getElementById("scene");
const hero = document.getElementById("top");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const smallScreen = window.matchMedia("(max-width: 900px)").matches;

if (canvas && hero) init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !smallScreen,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    canvas.style.display = "none";
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07080a, 0.042);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  let cameraDistance = 9.6;
  let parallaxAmount = 0.5;
  camera.position.set(0, 0.3, cameraDistance);

  /* ---------- environment reflections ---------- */

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.06);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;

  /* ---------- materials ---------- */

  const brass = new THREE.MeshStandardMaterial({
    color: 0xc39a57,
    metalness: 1,
    roughness: 0.24,
    envMapIntensity: 1.15,
    emissive: 0x241a08,
    emissiveIntensity: 1,
  });

  const brassDim = new THREE.MeshStandardMaterial({
    color: 0x93743d,
    metalness: 1,
    roughness: 0.42,
    envMapIntensity: 0.85,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd7e6e8,
    metalness: 0.05,
    roughness: 0.05,
    transparent: true,
    opacity: smallScreen ? 0.22 : 0.34,
    envMapIntensity: 1.9,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  /* ---------- the monument ---------- */

  const monument = new THREE.Group();
  monument.position.set(smallScreen ? 0 : 2.6, smallScreen ? 0.1 : 0.05, 0);
  scene.add(monument);

  const rings = new THREE.Group();
  monument.add(rings);

  const ringCount = smallScreen ? 13 : 19;
  for (let i = 0; i < ringCount; i++) {
    const p = i / (ringCount - 1);
    const radius = 1.05 + Math.sin(p * Math.PI) * 1.28;
    const geometry = new THREE.TorusGeometry(
      radius,
      i % 4 === 0 ? 0.019 : 0.012,
      6,
      smallScreen ? 96 : 168
    );
    const ring = new THREE.Mesh(geometry, i % 3 === 0 ? brassDim : brass);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = Math.sin(i * 1.7) * 0.22;
    ring.position.y = -3 + p * 6;
    ring.userData.baseY = ring.position.y;
    ring.userData.phase = i * 0.55;
    rings.add(ring);
  }

  // colonnade
  const columns = new THREE.Group();
  monument.add(columns);
  const columnGeometry = new THREE.BoxGeometry(0.026, 6.15, 0.026);
  const columnCount = 6;
  for (let i = 0; i < columnCount; i++) {
    const angle = (i / columnCount) * Math.PI * 2;
    const column = new THREE.Mesh(columnGeometry, brassDim);
    column.position.set(Math.cos(angle) * 2.52, 0, Math.sin(angle) * 2.52);
    columns.add(column);
  }

  // halos
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.95, 0.014, 8, 220),
    brass
  );
  halo.rotation.set(Math.PI / 2.45, 0, 0.16);
  halo.position.y = 0.35;
  monument.add(halo);

  const farHalo = new THREE.Mesh(
    new THREE.TorusGeometry(4.4, 0.008, 6, 200),
    brassDim
  );
  farHalo.rotation.set(Math.PI / 2.2, 0.4, -0.2);
  farHalo.position.set(0.4, -0.6, -3.2);
  monument.add(farHalo);

  // glass obelisk
  const obelisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.33, 0.62, 4.9, 4, 1, false),
    glass
  );
  obelisk.rotation.y = Math.PI / 4;
  obelisk.position.y = -0.15;
  monument.add(obelisk);

  // brass spine inside the obelisk
  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 5.2, 6),
    brass
  );
  spine.position.y = -0.1;
  monument.add(spine);

  // floating fragments
  const fragments = new THREE.Group();
  monument.add(fragments);
  const fragmentGeometry = new THREE.BoxGeometry(1, 1, 1);
  const fragmentCount = smallScreen ? 10 : 18;
  for (let i = 0; i < fragmentCount; i++) {
    const size = 0.045 + ((i * 37) % 11) * 0.009;
    const fragment = new THREE.Mesh(fragmentGeometry, brass);
    const angle = (i / fragmentCount) * Math.PI * 2 + 0.4;
    const radius = 3.05 + ((i * 61) % 9) * 0.13;
    const height = Math.sin(i * 2.3) * 2.9;
    fragment.scale.setScalar(size);
    fragment.userData.angle = angle;
    fragment.userData.radius = radius;
    fragment.userData.height = height;
    fragment.userData.speed = 0.035 + ((i * 13) % 7) * 0.006;
    fragment.userData.spin = 0.3 + (i % 5) * 0.15;
    fragments.add(fragment);
  }

  /* ---------- dust ---------- */

  function dustTexture() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, "rgba(255,244,222,1)");
    gradient.addColorStop(0.35, "rgba(255,240,210,0.45)");
    gradient.addColorStop(1, "rgba(255,240,210,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const dustCount = smallScreen ? 380 : 900;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.6 + Math.random() * 6.4;
    dustPositions[i * 3] = Math.cos(angle) * radius;
    dustPositions[i * 3 + 1] = -5 + Math.random() * 11;
    dustPositions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(dustPositions, 3)
  );
  const dustMaterial = new THREE.PointsMaterial({
    size: 0.055,
    map: dustTexture(),
    color: 0xe6d3a8,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dust);

  /* ---------- lights ---------- */

  scene.add(new THREE.HemisphereLight(0x9db4cc, 0x08090b, 0.5));

  const key = new THREE.DirectionalLight(0xfff1d8, 2.6);
  key.position.set(5.5, 8, 6);
  scene.add(key);

  const rim = new THREE.PointLight(0xffa54a, 34, 26, 2);
  rim.position.set(-4.2, 2.4, -3.4);
  scene.add(rim);

  const cool = new THREE.PointLight(0x6f93c9, 20, 24, 2);
  cool.position.set(4.4, -2.6, -2.2);
  scene.add(cool);

  const top = new THREE.PointLight(0xffe8c0, 16, 18, 2);
  top.position.set(0, 6.4, 1.2);
  scene.add(top);

  /* ---------- post ---------- */

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    smallScreen ? 0.28 : 0.38,
    0.72,
    0.86
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- sizing ---------- */

  function resize() {
    const width = hero.clientWidth || window.innerWidth;
    const height = hero.clientHeight || window.innerHeight;
    const aspect = width / height;
    const dpr = Math.min(window.devicePixelRatio || 1, smallScreen ? 1.5 : 1.8);

    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    // Keep the monument framed as the hero gets narrower, and nudge it
    // off-centre only when there is a column of text beside it.
    cameraDistance =
      aspect >= 1.05
        ? 9.6
        : Math.min(17, 9.6 * Math.pow(1.05 / aspect, 0.62));
    parallaxAmount = aspect >= 1.05 ? 0.5 : 0.24;
    monument.position.x = aspect >= 0.9 ? 2.6 : 0;

    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
  }

  resize();

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(hero);
  } else {
    window.addEventListener("resize", resize);
  }

  /* ---------- interaction ---------- */

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener(
    "pointermove",
    (event) => {
      pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  function scrollProgress() {
    const rect = hero.getBoundingClientRect();
    const height = rect.height || 1;
    return THREE.MathUtils.clamp(-rect.top / height, 0, 1);
  }

  /* ---------- render loop ---------- */

  const clock = new THREE.Clock();
  let time = 0;
  let rafId = 0;
  let running = false;
  let inView = true;

  function update(dt) {
    const s = scrollProgress();

    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.6);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.6);

    monument.rotation.y = 0.18 + time * 0.055 + s * 0.55;
    rings.rotation.y = -time * 0.05;
    columns.rotation.y = time * 0.018;
    fragments.rotation.y = -time * 0.03;

    rings.children.forEach((ring) => {
      ring.position.y =
        ring.userData.baseY + Math.sin(time * 0.55 + ring.userData.phase) * 0.045;
    });

    halo.rotation.z = 0.16 + Math.sin(time * 0.24) * 0.09;
    farHalo.rotation.z = -0.2 + Math.cos(time * 0.18) * 0.07;

    fragments.children.forEach((fragment) => {
      const a = fragment.userData.angle + time * fragment.userData.speed;
      fragment.position.set(
        Math.cos(a) * fragment.userData.radius,
        fragment.userData.height + Math.sin(time * 0.5 + a) * 0.22,
        Math.sin(a) * fragment.userData.radius
      );
      fragment.rotation.x = time * fragment.userData.spin;
      fragment.rotation.y = time * fragment.userData.spin * 0.7;
    });

    dust.rotation.y = time * 0.012;
    dust.position.y = Math.sin(time * 0.2) * 0.16;

    const targetZ = cameraDistance;
    const targetY = 0.3;

    camera.position.x = pointer.x * parallaxAmount;
    camera.position.y = targetY - pointer.y * 0.26 + s * 1.15;
    camera.position.z = targetZ - s * 1.35;
    camera.lookAt(0, 0.15 + s * 0.55, 0);
  }

  function frame() {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    update(dt);
    composer.render();
  }

  function start() {
    if (running || reduceMotion || !inView) return;
    running = true;
    clock.start();
    frame();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  if (reduceMotion) {
    update(0.016);
    composer.render();
  } else {
    start();
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        if (inView) start();
        else stop();
      },
      { threshold: 0 }
    ).observe(hero);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
  });

  canvas.addEventListener("webglcontextrestored", () => {
    resize();
    start();
  });
}
