/**
 * Chase camera. Sits behind and above the car, lagging slightly so speed reads
 * through motion, with a FOV punch under nitro.
 */
import * as THREE from "three";
import type { CarState } from "../core/car";
import { angleDelta, clamp, damp, forwardFromYaw, lerp } from "../core/math";

export interface ChaseCamera {
  update(state: CarState, dt: number, instant: boolean): void;
}

const BASE_FOV = 62;
const NITRO_FOV = 78;

export function buildChaseCamera(camera: THREE.PerspectiveCamera): ChaseCamera {
  const current = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  let yaw: number | null = null;

  function update(state: CarState, dt: number, instant: boolean): void {
    // Follow the car's heading, taking the short way round so a 180-degree
    // spin does not whip the camera the long way.
    if (yaw === null) yaw = state.heading;
    else yaw += angleDelta(yaw, state.heading) * (instant ? 1 : 1 - Math.exp(-7 * dt));

    const fwd = forwardFromYaw(yaw);
    const speedFactor = clamp(state.speed / 62, 0, 1.35);

    // Pull back and up as speed rises.
    const distance = lerp(8.2, 12.4, clamp(speedFactor, 0, 1));
    const height = lerp(3.4, 4.6, clamp(speedFactor, 0, 1));

    const target = new THREE.Vector3(
      state.pos.x - fwd.x * distance,
      height,
      state.pos.z - fwd.z * distance,
    );

    // Drift swings the camera slightly to the outside of the slide.
    const rightX = -fwd.z;
    const rightZ = fwd.x;
    const slide = clamp(state.lateralSpeed * 0.055, -1.6, 1.6);
    target.x += rightX * slide;
    target.z += rightZ * slide;

    if (instant) current.copy(target);
    else {
      current.x = damp(current.x, target.x, 11, dt);
      current.y = damp(current.y, target.y, 9, dt);
      current.z = damp(current.z, target.z, 11, dt);
    }
    camera.position.copy(current);

    const ahead = new THREE.Vector3(
      state.pos.x + fwd.x * 14,
      1.5,
      state.pos.z + fwd.z * 14,
    );
    if (instant) lookAt.copy(ahead);
    else {
      lookAt.x = damp(lookAt.x, ahead.x, 13, dt);
      lookAt.y = damp(lookAt.y, ahead.y, 8, dt);
      lookAt.z = damp(lookAt.z, ahead.z, 13, dt);
    }
    camera.lookAt(lookAt);

    const targetFov = state.boosting ? NITRO_FOV : BASE_FOV + speedFactor * 4;
    camera.fov = damp(camera.fov, targetFov, 6, dt);
    camera.updateProjectionMatrix();
  }

  return { update };
}
