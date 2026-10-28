/**
 * Builds the drivable ribbon, barriers, start line and roadside scenery from
 * the pure `Track` data.
 */
import * as THREE from "three";
import type { Track } from "../core/track";

const ROAD_Y = 0.02;

export interface TrackView {
  group: THREE.Group;
  /** Keep the sun's shadow frustum centred on the action. */
  updateShadowTarget(x: number, z: number): void;
}

export function buildTrackView(track: Track, sun: THREE.DirectionalLight): TrackView {
  const group = new THREE.Group();
  group.name = "track";

  group.add(buildRoad(track));
  group.add(buildEdgeLines(track));
  group.add(buildBarriers(track));
  group.add(buildStartLine(track));
  group.add(buildScenery(track));

  function updateShadowTarget(x: number, z: number): void {
    sun.target.position.set(x, 0, z);
    sun.position.set(x - 140, 90, z - 60);
    sun.target.updateMatrixWorld();
  }

  return { group, updateShadowTarget };
}

/** Tarmac ribbon with a subtle centre-line texture via vertex colours. */
function buildRoad(track: Track): THREE.Mesh {
  const s = track.samples;
  const n = s.length;
  const w = track.def.halfWidth;

  const positions = new Float32Array((n + 1) * 2 * 3);
  const colors = new Float32Array((n + 1) * 2 * 3);
  const indices: number[] = [];

  const road = new THREE.Color(0x20242e);
  const roadAlt = new THREE.Color(0x242937);

  for (let i = 0; i <= n; i++) {
    const sample = s[i % n];
    const lx = sample.pos.x + sample.right.x * w;
    const lz = sample.pos.z + sample.right.z * w;
    const rx = sample.pos.x - sample.right.x * w;
    const rz = sample.pos.z - sample.right.z * w;

    const base = i * 6;
    positions[base] = lx;
    positions[base + 1] = ROAD_Y;
    positions[base + 2] = lz;
    positions[base + 3] = rx;
    positions[base + 4] = ROAD_Y;
    positions[base + 5] = rz;

    // Alternate tone every few metres so speed is readable without textures.
    const c = i % 8 < 4 ? road : roadAlt;
    for (let k = 0; k < 2; k++) {
      colors[base + k * 3] = c.r;
      colors[base + k * 3 + 1] = c.g;
      colors[base + k * 3 + 2] = c.b;
    }

    if (i < n) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = "road";
  return mesh;
}

/** Thin emissive strips along both edges — cheap night-time readability. */
function buildEdgeLines(track: Track): THREE.Group {
  const g = new THREE.Group();
  g.name = "edgeLines";
  const w = track.def.halfWidth - 0.35;
  for (const side of [1, -1]) {
    const s = track.samples;
    const n = s.length;
    const positions = new Float32Array((n + 1) * 3);
    const indices: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = s[i];
      const b = s[(i + 1) % n];
      positions[i * 3] = a.pos.x + a.right.x * w * side;
      positions[i * 3 + 1] = ROAD_Y + 0.02;
      positions[i * 3 + 2] = a.pos.z + a.right.z * w * side;
      indices.push(i, i + 1);
      if (i === n - 1) {
        positions[(i + 1) * 3] = b.pos.x + b.right.x * w * side;
        positions[(i + 1) * 3 + 1] = ROAD_Y + 0.02;
        positions[(i + 1) * 3 + 2] = b.pos.z + b.right.z * w * side;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    const mat = new THREE.LineBasicMaterial({
      color: side > 0 ? 0x4de2ff : 0xff5c8a,
      transparent: true,
      opacity: 0.9,
    });
    g.add(new THREE.Line(geo, mat));
  }
  return g;
}

/** Low walls just outside the tarmac. Visual only — no collision yet. */
function buildBarriers(track: Track): THREE.Mesh {
  const s = track.samples;
  const n = s.length;
  const w = track.def.halfWidth + 0.6;
  const height = 0.9;

  const positions: number[] = [];
  const indices: number[] = [];

  for (const side of [1, -1]) {
    const base = positions.length / 3;
    for (let i = 0; i <= n; i++) {
      const sample = s[i % n];
      const x = sample.pos.x + sample.right.x * w * side;
      const z = sample.pos.z + sample.right.z * w * side;
      positions.push(x, 0, z, x, height, z);
    }
    for (let i = 0; i < n; i++) {
      const a = base + i * 2;
      const b = base + (i + 1) * 2;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2c3550,
    roughness: 0.7,
    metalness: 0.25,
    emissive: 0x0a1430,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = "barriers";
  return mesh;
}

/** Chequered start/finish band at t = 0. */
function buildStartLine(track: Track): THREE.Group {
  const g = new THREE.Group();
  g.name = "startLine";
  const s0 = track.sampleAt(0);
  const w = track.def.halfWidth;
  const cells = 8;
  const cellW = (w * 2) / cells;
  const depth = 1.1;

  const white = new THREE.MeshBasicMaterial({ color: 0xf5f7ff });
  const dark = new THREE.MeshBasicMaterial({ color: 0x14161d });
  const geo = new THREE.PlaneGeometry(cellW, depth);

  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < cells; i++) {
      const mesh = new THREE.Mesh(geo, (i + row) % 2 === 0 ? white : dark);
      mesh.rotation.x = -Math.PI / 2;
      const along = -depth / 2 + row * depth;
      const across = -w + cellW / 2 + i * cellW;
      mesh.position.set(
        s0.pos.x + s0.right.x * across + s0.tangent.x * along,
        ROAD_Y + 0.03,
        s0.pos.z + s0.right.z * across + s0.tangent.z * along,
      );
      mesh.rotation.z = -Math.atan2(s0.tangent.x, s0.tangent.z);
      g.add(mesh);
    }
  }
  return g;
}

/** Simple emissive towers around the loop so the world has scale. */
function buildScenery(track: Track): THREE.Group {
  const g = new THREE.Group();
  g.name = "scenery";
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const palette = [0x1d2a4d, 0x26204a, 0x15303f, 0x2a2440];
  const mats = palette.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, emissive: 0x05070f }),
  );

  const s = track.samples;
  const step = Math.max(1, Math.floor(s.length / 46));
  let k = 0;
  for (let i = 0; i < s.length; i += step) {
    const sample = s[i];
    const side = k % 2 === 0 ? 1 : -1;
    const offset = track.def.halfWidth + 12 + Math.random() * 26;
    const h = 14 + Math.random() * 58;
    const wdt = 8 + Math.random() * 16;
    const mesh = new THREE.Mesh(boxGeo, mats[k % mats.length]);
    mesh.scale.set(wdt, h, wdt);
    mesh.position.set(sample.pos.x + sample.right.x * offset * side, h / 2 - 0.3, sample.pos.z + sample.right.z * offset * side);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    k++;
  }
  return g;
}
