/**
 * Nitro exhaust and skid marks. Both use fixed-size pools so nothing is
 * allocated during play — a garbage-collection hitch mid-corner is the kind of
 * thing that ruins an arcade racer.
 */
import * as THREE from "three";
import type { CarState } from "../core/car";
import { forwardFromYaw, rightFromYaw } from "../core/math";

const MAX_SKIDS = 900;
const MAX_SPARKS = 220;

export interface Effects {
  group: THREE.Group;
  update(state: CarState, dt: number): void;
  reset(): void;
}

export function buildEffects(): Effects {
  const group = new THREE.Group();
  group.name = "effects";

  // --- Skid marks: one quad per mark, recycled from a ring buffer. ---
  const skidGeo = new THREE.BufferGeometry();
  const skidPos = new Float32Array(MAX_SKIDS * 4 * 3);
  const skidAlpha = new Float32Array(MAX_SKIDS * 4);
  skidGeo.setAttribute("position", new THREE.BufferAttribute(skidPos, 3));
  skidGeo.setAttribute("alpha", new THREE.BufferAttribute(skidAlpha, 1));

  const skidIndices: number[] = [];
  for (let i = 0; i < MAX_SKIDS; i++) {
    const v = i * 4;
    skidIndices.push(v, v + 1, v + 2, v + 2, v + 1, v + 3);
  }
  skidGeo.setIndex(skidIndices);

  const skidMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        if (vAlpha <= 0.001) discard;
        gl_FragColor = vec4(0.02, 0.02, 0.03, vAlpha * 0.72);
      }
    `,
  });

  const skids = new THREE.Mesh(skidGeo, skidMat);
  skids.frustumCulled = false;
  skids.renderOrder = 1;
  group.add(skids);

  let skidHead = 0;

  function pushSkid(x: number, z: number, dirX: number, dirZ: number): void {
    const hw = 0.22;
    const hl = 0.55;
    // Right vector perpendicular to travel direction.
    const rx = -dirZ;
    const rz = dirX;
    const base = skidHead * 4 * 3;
    skidPos[base] = x - dirX * hl + rx * hw;
    skidPos[base + 1] = 0.035;
    skidPos[base + 2] = z - dirZ * hl + rz * hw;
    skidPos[base + 3] = x - dirX * hl - rx * hw;
    skidPos[base + 4] = 0.035;
    skidPos[base + 5] = z - dirZ * hl - rz * hw;
    skidPos[base + 6] = x + dirX * hl + rx * hw;
    skidPos[base + 7] = 0.035;
    skidPos[base + 8] = z + dirZ * hl + rz * hw;
    skidPos[base + 9] = x + dirX * hl - rx * hw;
    skidPos[base + 10] = 0.035;
    skidPos[base + 11] = z + dirZ * hl - rz * hw;

    const a = skidHead * 4;
    skidAlpha[a] = 1;
    skidAlpha[a + 1] = 1;
    skidAlpha[a + 2] = 1;
    skidAlpha[a + 3] = 1;

    skidHead = (skidHead + 1) % MAX_SKIDS;
    skidGeo.attributes.position.needsUpdate = true;
    skidGeo.attributes.alpha.needsUpdate = true;
  }

  // --- Nitro sparks. ---
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(MAX_SPARKS * 3);
  const sparkVel = new Float32Array(MAX_SPARKS * 3);
  const sparkLife = new Float32Array(MAX_SPARKS);
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));

  const sparkMat = new THREE.PointsMaterial({
    color: 0x7fe4ff,
    size: 0.55,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  group.add(sparks);

  let sparkHead = 0;

  function emitSpark(x: number, y: number, z: number, vx: number, vy: number, vz: number): void {
    const b = sparkHead * 3;
    sparkPos[b] = x;
    sparkPos[b + 1] = y;
    sparkPos[b + 2] = z;
    sparkVel[b] = vx;
    sparkVel[b + 1] = vy;
    sparkVel[b + 2] = vz;
    sparkLife[sparkHead] = 0.55;
    sparkHead = (sparkHead + 1) % MAX_SPARKS;
  }

  let skidCooldown = 0;

  function update(state: CarState, dt: number): void {
    // Fade existing skids.
    for (let i = 0; i < skidAlpha.length; i++) {
      if (skidAlpha[i] > 0) {
        skidAlpha[i] = Math.max(0, skidAlpha[i] - dt * 0.045);
      }
    }
    skidGeo.attributes.alpha.needsUpdate = true;

    const fwd = forwardFromYaw(state.heading);
    const right = rightFromYaw(state.heading);

    skidCooldown -= dt;
    if (state.drifting && skidCooldown <= 0) {
      skidCooldown = 0.016;
      // One mark behind each rear wheel.
      for (const side of [-0.95, 0.95]) {
        const wx = state.pos.x - fwd.x * 1.42 + right.x * side;
        const wz = state.pos.z - fwd.z * 1.42 + right.z * side;
        const vlen = Math.hypot(state.lateralSpeed, state.forwardSpeed) || 1;
        const vx = (fwd.x * state.forwardSpeed + right.x * state.lateralSpeed) / vlen;
        const vz = (fwd.z * state.forwardSpeed + right.z * state.lateralSpeed) / vlen;
        pushSkid(wx, wz, vx, vz);
      }
    }

    if (state.boosting) {
      for (const side of [-0.42, 0.42]) {
        const ex = state.pos.x - fwd.x * 2.3 + right.x * side;
        const ez = state.pos.z - fwd.z * 2.3 + right.z * side;
        emitSpark(
          ex,
          0.42,
          ez,
          -fwd.x * 14 + (Math.random() - 0.5) * 3,
          1.2 + Math.random() * 1.4,
          -fwd.z * 14 + (Math.random() - 0.5) * 3,
        );
      }
    }

    // Integrate and expire sparks.
    let anyAlive = false;
    for (let i = 0; i < MAX_SPARKS; i++) {
      if (sparkLife[i] <= 0) continue;
      anyAlive = true;
      sparkLife[i] -= dt;
      const b = i * 3;
      sparkVel[b + 1] -= 9.8 * dt;
      sparkPos[b] += sparkVel[b] * dt;
      sparkPos[b + 1] += sparkVel[b + 1] * dt;
      sparkPos[b + 2] += sparkVel[b + 2] * dt;
      if (sparkLife[i] <= 0) {
        // Park expired particles far below the world so they are not drawn.
        sparkPos[b + 1] = -9999;
      }
    }
    if (anyAlive) sparkGeo.attributes.position.needsUpdate = true;
  }

  function reset(): void {
    skidAlpha.fill(0);
    skidPos.fill(0);
    sparkLife.fill(0);
    for (let i = 0; i < MAX_SPARKS; i++) sparkPos[i * 3 + 1] = -9999;
    skidHead = 0;
    sparkHead = 0;
    skidGeo.attributes.position.needsUpdate = true;
    skidGeo.attributes.alpha.needsUpdate = true;
    sparkGeo.attributes.position.needsUpdate = true;
  }

  reset();
  return { group, update, reset };
}
