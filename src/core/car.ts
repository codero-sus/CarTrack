/**
 * Arcade car physics. Pure TypeScript — no engine imports, so it is unit
 * testable and deterministic.
 *
 * The model is deliberately NOT a tyre simulation. Unity's WheelCollider and
 * friends model real rubber and fight you on drifts and slides. An Asphalt
 * style game wants the opposite: predictable, tunable, immediately fun.
 *
 * How it works:
 *   1. Steering angle is smoothed toward the input, with less lock at speed.
 *   2. Yaw comes from a bicycle model, so the car rotates like a real vehicle.
 *   3. World velocity is re-decomposed against the NEW heading. The mismatch
 *      between where the car points and where it is travelling falls out as
 *      lateral velocity — that IS the drift. No fake drift term needed.
 *   4. Grip decays lateral velocity. Handbrake and loose surfaces decay it
 *      slower, so the slide persists.
 */
import {
  clamp,
  approach,
  decay,
  forwardFromYaw,
  rightFromYaw,
  wrapPi,
  type Vec2,
} from "./math";

export interface CarInput {
  /** -1..1, left to right. */
  steer: number;
  /** 0..1 */
  throttle: number;
  /** 0..1 */
  brake: number;
  handbrake: boolean;
  nitro: boolean;
}

export const NEUTRAL_INPUT: CarInput = {
  steer: 0,
  throttle: 0,
  brake: 0,
  handbrake: false,
  nitro: false,
};

export interface CarParams {
  /** Top speed on tarmac, m/s. 62 m/s is ~223 km/h. */
  maxSpeed: number;
  maxReverseSpeed: number;
  /** m/s^2 at full throttle. */
  accel: number;
  brakeDecel: number;
  /** Natural rolling resistance, m/s^2. */
  coastDecel: number;
  /** Quadratic aerodynamic drag coefficient. */
  drag: number;
  /** Steering lock at standstill, radians. */
  maxSteer: number;
  /** How much of that lock is lost at top speed, 0..1. */
  steerFalloff: number;
  /** How fast the wheel turns, rad/s. */
  steerRate: number;
  /** metres. Drives yaw rate. */
  wheelbase: number;
  maxYawRate: number;
  /** Lateral velocity decay rate on tarmac, 1/s. Higher is grippier. */
  grip: number;
  gripHandbrake: number;
  gripOffTrack: number;
  /** Extra longitudinal drag off track. */
  offTrackDrag: number;
  /** Speed multiplier applied off track. */
  offTrackSpeedMul: number;
  nitroAccel: number;
  nitroSpeedBonus: number;
  nitroDrainPerSec: number;
  /** Nitro gained per second of qualifying drift. */
  nitroChargePerDriftSec: number;
  /** Lateral speed above which a slide counts as a drift, m/s. */
  driftThreshold: number;
  /** Forward speed below which drifting is ignored, m/s. */
  driftMinForward: number;
}

export const DEFAULT_PARAMS: CarParams = {
  maxSpeed: 62,
  maxReverseSpeed: 14,
  accel: 26,
  brakeDecel: 42,
  coastDecel: 4.5,
  drag: 0.0032,
  maxSteer: 0.62,
  steerFalloff: 0.55,
  steerRate: 4.2,
  wheelbase: 2.7,
  maxYawRate: 2.1,
  grip: 8.5,
  gripHandbrake: 1.6,
  gripOffTrack: 3.0,
  offTrackDrag: 0.011,
  offTrackSpeedMul: 0.42,
  nitroAccel: 24,
  nitroSpeedBonus: 16,
  nitroDrainPerSec: 0.42,
  nitroChargePerDriftSec: 0.22,
  driftThreshold: 4.5,
  driftMinForward: 12,
};

export interface CarState {
  pos: Vec2;
  /** Yaw in radians; 0 faces -Z. */
  heading: number;
  /** Longitudinal speed along the heading, m/s. Signed (negative = reversing). */
  forwardSpeed: number;
  /** Lateral speed across the heading, m/s. Signed (positive = sliding right). */
  lateralSpeed: number;
  /** Current steering angle, radians. */
  steer: number;
  /** 0..1 */
  nitro: number;
  boosting: boolean;
  drifting: boolean;
  onTrack: boolean;
  /** Magnitude of the world velocity vector, m/s. */
  speed: number;
}

export function createCar(pos: Vec2, heading: number): CarState {
  return {
    pos: { x: pos.x, z: pos.z },
    heading,
    forwardSpeed: 0,
    lateralSpeed: 0,
    steer: 0,
    nitro: 0.35,
    boosting: false,
    drifting: false,
    onTrack: true,
    speed: 0,
  };
}

/**
 * Advance the car by one fixed step. Mutates and returns `state`.
 * `dt` should be the simulation step (1/60), never a raw frame delta.
 */
export function stepCar(
  state: CarState,
  input: CarInput,
  dt: number,
  onTrack: boolean,
  p: CarParams = DEFAULT_PARAMS,
): CarState {
  const absSpeed = Math.abs(state.forwardSpeed);
  const speedNorm = clamp(absSpeed / p.maxSpeed, 0, 1);

  // 1. Steering: less lock as you go faster, so high speed stays stable.
  const steerLimit = p.maxSteer * (1 - p.steerFalloff * speedNorm);
  const targetSteer = clamp(input.steer, -1, 1) * steerLimit;
  state.steer = approach(state.steer, targetSteer, p.steerRate * dt);

  // 2. Yaw from the bicycle model. Negative forwardSpeed naturally inverts it.
  //
  // Sign note: forwardFromYaw(yaw) = (-sin, -cos), so *increasing* heading turns
  // the car LEFT. Positive steer means "turn right", hence the subtraction.
  const rawYaw = (state.forwardSpeed / p.wheelbase) * Math.tan(state.steer);
  const yawRate = clamp(rawYaw, -p.maxYawRate, p.maxYawRate);

  // World velocity BEFORE the heading changes.
  const oldFwd = forwardFromYaw(state.heading);
  const oldRight = rightFromYaw(state.heading);
  const vx = oldFwd.x * state.forwardSpeed + oldRight.x * state.lateralSpeed;
  const vz = oldFwd.z * state.forwardSpeed + oldRight.z * state.lateralSpeed;

  // 3. Rotate, then re-decompose. The residual becomes lateral velocity.
  state.heading = wrapPi(state.heading - yawRate * dt);
  const fwd = forwardFromYaw(state.heading);
  const right = rightFromYaw(state.heading);
  let forward = vx * fwd.x + vz * fwd.z;
  let lateral = vx * right.x + vz * right.z;

  // 4. Longitudinal forces.
  let accelLong = 0;
  if (input.throttle > 0) accelLong += p.accel * clamp(input.throttle, 0, 1);
  if (input.brake > 0) {
    const b = clamp(input.brake, 0, 1);
    if (forward > 0.6) accelLong -= p.brakeDecel * b;
    else accelLong -= p.accel * 0.65 * b; // reversing
  }
  accelLong -= p.coastDecel * Math.sign(forward);
  const dragCoeff = onTrack ? p.drag : p.drag + p.offTrackDrag;
  accelLong -= dragCoeff * forward * Math.abs(forward);

  // 5. Nitro.
  const wantBoost = input.nitro && state.nitro > 0.001 && forward > 1;
  if (wantBoost) {
    accelLong += p.nitroAccel;
    state.nitro = clamp(state.nitro - p.nitroDrainPerSec * dt, 0, 1);
  } else if (!input.nitro) {
    // Trickle-charge while simply driving fast.
    state.nitro = clamp(state.nitro + 0.02 * speedNorm * dt, 0, 1);
  }
  state.boosting = wantBoost;

  forward += accelLong * dt;

  // 6. Speed caps.
  const cap = (onTrack ? p.maxSpeed : p.maxSpeed * p.offTrackSpeedMul) + (wantBoost ? p.nitroSpeedBonus : 0);
  if (forward > cap) forward = cap;
  if (forward < -p.maxReverseSpeed) forward = -p.maxReverseSpeed;

  // 7. Grip: decay lateral velocity. This is what makes a slide end.
  const drifting = Math.abs(lateral) > p.driftThreshold && forward > p.driftMinForward;
  let gripRate = p.grip;
  if (input.handbrake) gripRate = p.gripHandbrake;
  else if (!onTrack) gripRate = p.gripOffTrack;
  else if (drifting) gripRate = p.grip * 0.45;
  lateral *= decay(gripRate, dt);
  if (Math.abs(lateral) < 0.02) lateral = 0;

  state.drifting = drifting;
  if (drifting) {
    state.nitro = clamp(state.nitro + p.nitroChargePerDriftSec * dt, 0, 1);
  }

  // 8. Integrate.
  const wvx = fwd.x * forward + right.x * lateral;
  const wvz = fwd.z * forward + right.z * lateral;
  state.pos.x += wvx * dt;
  state.pos.z += wvz * dt;

  state.forwardSpeed = forward;
  state.lateralSpeed = lateral;
  state.onTrack = onTrack;
  state.speed = Math.hypot(wvx, wvz);
  return state;
}

/** Kilometres per hour, for the HUD. */
export function kph(state: CarState): number {
  return state.speed * 3.6;
}
