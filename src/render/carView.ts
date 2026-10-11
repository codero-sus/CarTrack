/**
 * The player car mesh and its visual response to the simulation: wheel spin,
 * front-wheel steer, body roll/pitch, and brake lights.
 */
import * as THREE from "three";
import type { CarState } from "../core/car";
import { damp } from "../core/math";

export interface CarView {
  group: THREE.Group;
  update(
    state: CarState,
    alpha: number,
    prevPos: { x: number; z: number },
    dt: number,
    braking: boolean,
  ): void;
}

const BODY_Y = 0.42;

export function buildCarView(): CarView {
  const group = new THREE.Group();
  group.name = "car";

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd21f3c, roughness: 0.28, metalness: 0.72 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f1c,
    roughness: 0.08,
    metalness: 0.35,
    transparent: true,
    opacity: 0.82,
  });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x0c0d11, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xbfc7d6, roughness: 0.3, metalness: 0.9 });

  // Chassis: a low wedge plus a cabin.
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.42, 4.35), bodyMat);
  chassis.position.y = BODY_Y;
  chassis.castShadow = true;
  group.add(chassis);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.24, 1.1), bodyMat);
  nose.position.set(0, BODY_Y - 0.06, -2.05);
  nose.castShadow = true;
  group.add(nose);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.75), glassMat);
  cabin.position.set(0, BODY_Y + 0.42, 0.12);
  cabin.castShadow = true;
  group.add(cabin);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.09, 0.44), bodyMat);
  spoiler.position.set(0, BODY_Y + 0.42, 1.92);
  spoiler.castShadow = true;
  group.add(spoiler);
  for (const sx of [-0.72, 0.72]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.4, 0.12), bodyMat);
    strut.position.set(sx, BODY_Y + 0.2, 1.92);
    group.add(strut);
  }

  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff0c4,
    emissiveIntensity: 2.4,
  });
  for (const sx of [-0.62, 0.62]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), headMat);
    lamp.position.set(sx, BODY_Y + 0.02, -2.58);
    group.add(lamp);
  }

  const brakeMat = new THREE.MeshStandardMaterial({ color: 0x2a0508, emissive: 0xff1f3d, emissiveIntensity: 0.6 });
  const brakeLights: THREE.Mesh[] = [];
  for (const sx of [-0.62, 0.62]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.13, 0.08), brakeMat.clone());
    lamp.position.set(sx, BODY_Y + 0.06, 2.2);
    group.add(lamp);
    brakeLights.push(lamp);
  }

  // Wheels: an outer pivot handles steering, an inner mesh handles spin.
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.36, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelPositions: [number, number][] = [
    [-0.95, -1.42],
    [0.95, -1.42],
    [-0.95, 1.42],
    [0.95, 1.42],
  ];

  const pivots: THREE.Group[] = [];
  const spinners: THREE.Mesh[] = [];
  for (const [x, z] of wheelPositions) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.42, z);
    const tyre = new THREE.Mesh(wheelGeo, tyreMat);
    tyre.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    pivot.add(tyre);
    pivot.add(rim);
    group.add(pivot);
    pivots.push(pivot);
    spinners.push(tyre);
  }

  const headlight = new THREE.SpotLight(0xfff3d0, 26, 70, 0.42, 0.55, 1.4);
  headlight.position.set(0, BODY_Y + 0.2, -2.4);
  headlight.target.position.set(0, 0, -30);
  group.add(headlight);
  group.add(headlight.target);

  let roll = 0;
  let pitch = 0;

  function update(
    state: CarState,
    alpha: number,
    prevPos: { x: number; z: number },
    dt: number,
    braking: boolean,
  ): void {
    // Interpolate position so rendering is smooth between fixed steps.
    const x = prevPos.x + (state.pos.x - prevPos.x) * alpha;
    const z = prevPos.z + (state.pos.z - prevPos.z) * alpha;
    group.position.set(x, 0, z);
    group.rotation.y = state.heading;

    // Body attitude: roll into corners, pitch under acceleration and braking.
    const targetRoll = THREE.MathUtils.clamp(-state.lateralSpeed * 0.022, -0.16, 0.16);
    const targetPitch = braking ? 0.05 : state.boosting ? -0.035 : 0;
    roll = damp(roll, targetRoll, 9, dt);
    pitch = damp(pitch, targetPitch, 8, dt);
    chassis.rotation.z = roll;
    cabin.rotation.z = roll;
    chassis.rotation.x = pitch;
    cabin.rotation.x = pitch;

    // Front wheels steer with the simulation's steering angle.
    for (let i = 0; i < 4; i++) {
      // Negated for the same reason as the yaw integration in stepCar: this
      // mesh's local forward is -Z, so a positive rotation.y points it left.
      if (i < 2) pivots[i].rotation.y = -state.steer;
      spinners[i].rotation.x -= (state.forwardSpeed * dt) / 0.42;
    }

    for (const lamp of brakeLights) {
      const m = lamp.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.5 + (braking ? 4 : 0);
    }
  }

  return { group, update };
}
