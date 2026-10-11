import { describe, expect, it } from "vitest";
import { HARBOUR_CIRCUIT, Track } from "../src/core/track";
import { forwardFromYaw, length2, vec2 } from "../src/core/math";

const track = new Track(HARBOUR_CIRCUIT);

describe("track", () => {
  it("rejects degenerate definitions", () => {
    expect(
      () => new Track({ name: "bad", controlPoints: [vec2(0, 0), vec2(1, 0), vec2(2, 0)], halfWidth: 5, laps: 1 }),
    ).toThrow(/at least 4 control points/);
    expect(
      () =>
        new Track({
          name: "bad",
          controlPoints: [vec2(0, 0), vec2(10, 0), vec2(10, 10), vec2(0, 10)],
          halfWidth: 0,
          laps: 1,
        }),
    ).toThrow(/positive halfWidth/);
  });

  it("builds a closed loop of the expected sample count", () => {
    expect(track.samples.length).toBe(HARBOUR_CIRCUIT.controlPoints.length * 40);
    expect(track.totalLength).toBeGreaterThan(0);
  });

  it("produces unit tangents and unit right vectors", () => {
    for (let i = 0; i < track.samples.length; i += 37) {
      const s = track.samples[i];
      expect(length2(s.tangent)).toBeCloseTo(1, 6);
      expect(length2(s.right)).toBeCloseTo(1, 6);
    }
  });

  it("has cumulative distance that increases and ends at totalLength", () => {
    for (let i = 1; i < track.samples.length; i++) {
      expect(track.samples[i].distance).toBeGreaterThan(track.samples[i - 1].distance);
    }
    const last = track.samples[track.samples.length - 1].distance;
    expect(track.totalLength).toBeGreaterThan(last);
    expect(track.totalLength - last).toBeLessThan(20);
  });

  it("wraps sampleAt outside 0..1", () => {
    const a = track.sampleAt(0.25);
    const b = track.sampleAt(1.25);
    expect(a.pos.x).toBeCloseTo(b.pos.x, 9);
    expect(a.pos.z).toBeCloseTo(b.pos.z, 9);
  });

  it("projects a centreline point back onto itself with ~zero lateral", () => {
    for (let i = 0; i < track.samples.length; i += 53) {
      const s = track.samples[i];
      const p = track.project(s.pos);
      expect(Math.abs(p.lateral)).toBeLessThan(0.001);
      expect(p.pos.x).toBeCloseTo(s.pos.x, 9);
    }
  });

  it("measures lateral offset to the correct side", () => {
    const s = track.samples[0];
    const right = vec2(s.pos.x + s.right.x * 3, s.pos.z + s.right.z * 3);
    const left = vec2(s.pos.x - s.right.x * 3, s.pos.z - s.right.z * 3);
    expect(track.project(right).lateral).toBeCloseTo(3, 6);
    expect(track.project(left).lateral).toBeCloseTo(-3, 6);
  });

  it("finds the nearest point even when called with a stale hint", () => {
    // A hint from the opposite side of the circuit must not trap the search.
    const target = track.samples[Math.floor(track.samples.length * 0.5)];
    const p = track.project(target.pos, 0);
    expect(p.pos.x).toBeCloseTo(target.pos.x, 6);
  });

  it("classifies on-track and off-track", () => {
    expect(track.isOnTrack(0)).toBe(true);
    expect(track.isOnTrack(HARBOUR_CIRCUIT.halfWidth - 0.01)).toBe(true);
    expect(track.isOnTrack(HARBOUR_CIRCUIT.halfWidth + 0.01)).toBe(false);
    expect(track.isOnTrack(-HARBOUR_CIRCUIT.halfWidth - 0.01)).toBe(false);
  });

  it("spawns on the centreline facing along the track", () => {
    const spawn = track.spawnPoint(4, 0);
    const fwd = forwardFromYaw(spawn.heading);
    const proj = track.project(spawn.pos);
    // Forward should align with the local tangent (dot product near 1).
    const dot = fwd.x * proj.tangent.x + fwd.z * proj.tangent.z;
    expect(dot).toBeGreaterThan(0.99);
    expect(Math.abs(proj.lateral)).toBeLessThan(0.5);
  });

  it("hintFromT round-trips through project", () => {
    for (const t of [0, 0.1, 0.5, 0.99]) {
      const s = track.sampleAt(t);
      const hint = track.hintFromT(t);
      const p = track.project(s.pos, hint);
      expect(p.pos.x).toBeCloseTo(s.pos.x, 6);
    }
  });
});
