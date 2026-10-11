/**
 * Track geometry. Pure data + math, no engine imports.
 *
 * A track is a closed Catmull-Rom spline through control points, with a fixed
 * half-width. Everything the game needs — where the racing line is, how far
 * around the lap you are, whether you are on tarmac — comes from here.
 */
import { type Vec2, dot2, length2, vec2 } from "./math";

export interface TrackDef {
  name: string;
  /** Closed loop of control points, in metres, on the XZ plane. */
  controlPoints: Vec2[];
  /** Half the drivable width, in metres. */
  halfWidth: number;
  laps: number;
}

export interface TrackSample {
  pos: Vec2;
  tangent: Vec2;
  right: Vec2;
  /** Cumulative distance from the start line, in metres. */
  distance: number;
}

export interface Projection {
  /** Normalised position along the loop, 0..1. 0 is the start/finish line. */
  t: number;
  /** Signed lateral offset from the centreline. Positive is to the right. */
  lateral: number;
  /** Distance travelled along the centreline, in metres. */
  distance: number;
  pos: Vec2;
  tangent: Vec2;
}

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, u: number): Vec2 {
  const u2 = u * u;
  const u3 = u2 * u;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * u +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
    z:
      0.5 *
      (2 * p1.z +
        (-p0.z + p2.z) * u +
        (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * u2 +
        (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * u3),
  };
}

export class Track {
  readonly samples: TrackSample[];
  readonly totalLength: number;

  constructor(readonly def: TrackDef, samplesPerSegment = 40) {
    if (def.controlPoints.length < 4) {
      throw new Error(`Track "${def.name}" needs at least 4 control points`);
    }
    if (def.halfWidth <= 0) {
      throw new Error(`Track "${def.name}" needs a positive halfWidth`);
    }

    const cp = def.controlPoints;
    const n = cp.length;
    const raw: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      const p0 = cp[(i - 1 + n) % n];
      const p1 = cp[i];
      const p2 = cp[(i + 1) % n];
      const p3 = cp[(i + 2) % n];
      for (let j = 0; j < samplesPerSegment; j++) {
        raw.push(catmullRom(p0, p1, p2, p3, j / samplesPerSegment));
      }
    }

    const count = raw.length;
    const built: TrackSample[] = new Array(count);
    let distance = 0;
    for (let i = 0; i < count; i++) {
      const prev = raw[(i - 1 + count) % count];
      const next = raw[(i + 1) % count];
      const tangent = vec2(next.x - prev.x, next.z - prev.z);
      const len = length2(tangent);
      const t = len > 1e-9 ? vec2(tangent.x / len, tangent.z / len) : vec2(1, 0);
      // Right-hand normal on the XZ plane.
      const right = vec2(-t.z, t.x);
      if (i > 0) {
        distance += length2(vec2(raw[i].x - raw[i - 1].x, raw[i].z - raw[i - 1].z));
      }
      built[i] = { pos: raw[i], tangent: t, right, distance };
    }
    this.samples = built;
    // Close the loop: add the wrap-around segment length.
    const first = built[0].pos;
    const last = built[count - 1].pos;
    this.totalLength = distance + length2(vec2(first.x - last.x, first.z - last.z));
  }

  /** Centreline point and frame at normalised distance `t` (0..1). */
  sampleAt(t: number): TrackSample {
    const count = this.samples.length;
    const wrapped = ((t % 1) + 1) % 1;
    const f = wrapped * count;
    const i = Math.floor(f) % count;
    return this.samples[i];
  }

  /**
   * Nearest point on the centreline to `p`.
   *
   * `hint` is the previous result index; passing it makes this O(1) in the
   * common case because a car moves a fraction of a segment per frame.
   */
  project(p: Vec2, hint = 0): Projection {
    const count = this.samples.length;
    let best = -1;
    let bestDistSq = Infinity;

    // Coherent search: a window around the hint, then a full scan as a safety
    // net for teleports and the first call of a frame.
    const window = 24;
    const start = ((hint % count) + count) % count;
    for (let k = -window; k <= window; k++) {
      const i = ((start + k) % count + count) % count;
      const s = this.samples[i].pos;
      const dx = p.x - s.x;
      const dz = p.z - s.z;
      const d = dx * dx + dz * dz;
      if (d < bestDistSq) {
        bestDistSq = d;
        best = i;
      }
    }
    if (bestDistSq > 400) {
      // More than 20 m from the hinted window — search everything.
      for (let i = 0; i < count; i++) {
        const s = this.samples[i].pos;
        const dx = p.x - s.x;
        const dz = p.z - s.z;
        const d = dx * dx + dz * dz;
        if (d < bestDistSq) {
          bestDistSq = d;
          best = i;
        }
      }
    }

    const sample = this.samples[best];
    const rel = vec2(p.x - sample.pos.x, p.z - sample.pos.z);
    return {
      t: best / count,
      lateral: dot2(rel, sample.right),
      distance: sample.distance,
      pos: sample.pos,
      tangent: sample.tangent,
    };
  }

  isOnTrack(lateral: number): boolean {
    return Math.abs(lateral) <= this.def.halfWidth;
  }

  /** World-space position to spawn at, `back` metres behind the start line. */
  spawnPoint(back = 0, lateral = 0): { pos: Vec2; heading: number } {
    const metresToT = this.totalLength > 0 ? back / this.totalLength : 0;
    const s = this.sampleAt(-metresToT);
    const pos = vec2(s.pos.x + s.right.x * lateral, s.pos.z + s.right.z * lateral);
    // Heading so that forwardFromYaw(heading) === s.tangent.
    const heading = Math.atan2(-s.tangent.x, -s.tangent.z);
    return { pos, heading };
  }

  /** Index into `samples`, for passing back into `project` as a hint. */
  hintFromT(t: number): number {
    const count = this.samples.length;
    return Math.floor((((t % 1) + 1) % 1) * count) % count;
  }
}

/**
 * Harbour Circuit — a flowing city loop: a long back straight, a tight
 * hairpin, a fast sweeper and an S-chicane.
 */
export const HARBOUR_CIRCUIT: TrackDef = {
  name: "Harbour Circuit",
  halfWidth: 9,
  laps: 3,
  controlPoints: [
    vec2(0, 0),
    vec2(0, -70),
    vec2(10, -120),
    vec2(60, -140),
    vec2(110, -120),
    vec2(120, -70),
    vec2(105, -25),
    vec2(140, 15),
    vec2(130, 70),
    vec2(75, 95),
    vec2(20, 80),
    vec2(-15, 40),
  ],
};
