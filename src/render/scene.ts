/**
 * Renderer, scene, lighting and sky. Everything here is presentation only —
 * no game logic lives in this directory.
 */
import * as THREE from "three";

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  canvas: HTMLCanvasElement;
  resize(): void;
  render(): void;
  dispose(): void;
}

export function createContext(canvas: HTMLCanvasElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1026);
  scene.fog = new THREE.Fog(0x0b1026, 160, 620);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.2, 1400);
  camera.position.set(0, 6, 12);

  // Dusk harbour lighting: cool sky, warm low sun.
  const hemi = new THREE.HemisphereLight(0x5c7cff, 0x1a1420, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffb46b, 2.3);
  sun.position.set(-140, 90, -60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 520;
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  const rim = new THREE.DirectionalLight(0x7fd4ff, 0.7);
  rim.position.set(120, 40, 160);
  scene.add(rim);

  scene.add(buildGround());
  scene.add(buildStars());

  function resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  function render(): void {
    renderer.render(scene, camera);
  }

  function dispose(): void {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    renderer.dispose();
  }

  resize();
  window.addEventListener("resize", resize);

  return { renderer, scene, camera, sun, canvas, resize, render, dispose };
}

function buildGround(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(2400, 2400, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x141a2e, roughness: 0.95, metalness: 0.0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.35;
  mesh.receiveShadow = true;
  mesh.name = "ground";
  return mesh;
}

function buildStars(): THREE.Points {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Upper hemisphere shell, well inside the fog far plane is irrelevant here
    // because stars are drawn without depth write.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85 + 0.05);
    const r = 900;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.7 + 60;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xbfd2ff,
    size: 2.2,
    sizeAttenuation: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.85,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = "stars";
  pts.frustumCulled = false;
  return pts;
}
