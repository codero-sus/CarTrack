/**
 * Pure math helpers. No engine imports — this module is unit-tested headless.
 */

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Frame-rate independent exponential smoothing.
 * `rate` is roughly "how many times per second we close 63% of the gap".
 */
export function damp(current: number, target: number, rate: number, dt: number): number {
  if (rate <= 0) return current;
  return lerp(current, target, 1 - Math.exp(-rate * dt));
}

/** Move `current` toward `target` by at most `maxDelta`. */
export function approach(current: number, target: number, maxDelta: number): number {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

/** Exponential decay factor for `dt` seconds at decay rate `rate`. */
export function decay(rate: number, dt: number): number {
  return Math.exp(-rate * dt);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Shortest signed difference between two angles, in (-PI, PI]. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export function wrap01(t: number): number {
  const w = t % 1;
  return w < 0 ? w + 1 : w;
}

/** Wrap an angle into (-PI, PI]. */
export function wrapPi(a: number): number {
  let w = (a + Math.PI) % (Math.PI * 2);
  if (w < 0) w += Math.PI * 2;
  return w - Math.PI;
}

export interface Vec2 {
  x: number;
  z: number;
}

export function vec2(x: number, z: number): Vec2 {
  return { x, z };
}

export function add2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, z: a.z + b.z };
}

export function scale2(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, z: a.z * s };
}

export function dot2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.z * b.z;
}

export function length2(a: Vec2): number {
  return Math.hypot(a.x, a.z);
}

/** Unit vector for a yaw angle where 0 rad faces -Z (three.js convention). */
export function forwardFromYaw(yaw: number): Vec2 {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

/** Unit vector 90 degrees clockwise from forward (the car's "right"). */
export function rightFromYaw(yaw: number): Vec2 {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}
