import { describe, expect, it } from "vitest";
import { createRace, formatTime, updateRace } from "../src/core/race";
import { FIXED_DT } from "../src/core/fixedStep";

/** Drive `t` forward by `delta`, wrapping at 1, simulating one step each call. */
function drive(race: ReturnType<typeof createRace>, t: number, forward = true) {
  updateRace(race, t, FIXED_DT, forward);
}

describe("race", () => {
  it("starts on lap 0 with no times", () => {
    const r = createRace({ laps: 3 });
    expect(r.lap).toBe(0);
    expect(r.lapTimes).toEqual([]);
    expect(r.bestLap).toBeNull();
    expect(r.finished).toBe(false);
  });

  it("does not award a lap without passing the halfway checkpoint", () => {
    const r = createRace({ laps: 3 });
    drive(r, 0.9);
    drive(r, 0.95);
    drive(r, 0.02);
    expect(r.lap).toBe(0);
    expect(r.lapTimes).toEqual([]);
  });

  it("awards a lap when the checkpoint is passed and the line is crossed", () => {
    const r = createRace({ laps: 3 });
    drive(r, 0.0);
    drive(r, 0.5);
    drive(r, 0.9);
    drive(r, 0.98);
    drive(r, 0.01);
    expect(r.lap).toBe(1);
    expect(r.lapTimes).toHaveLength(1);
    expect(r.lastLap?.lap).toBe(1);
  });

  it("records the best lap correctly", () => {
    const r = createRace({ laps: 2 });
    // Lap 1: 60 steps. Lap 2: 30 steps.
    drive(r, 0.5);
    for (let i = 0; i < 60; i++) drive(r, 0.9);
    drive(r, 0.99);
    drive(r, 0.01);
    expect(r.lap).toBe(1);
    const first = r.lapTimes[0];

    drive(r, 0.5);
    for (let i = 0; i < 30; i++) drive(r, 0.9);
    drive(r, 0.99);
    drive(r, 0.01);
    expect(r.lap).toBe(2);
    const second = r.lapTimes[1];

    expect(second).toBeLessThan(first);
    expect(r.bestLap).toBeCloseTo(second, 9);
    expect(r.lastLap?.isBest).toBe(true);
  });

  it("revokes the checkpoint if the car rolls back over the line", () => {
    const r = createRace({ laps: 3 });
    drive(r, 0.5);
    expect(r.passedHalf).toBe(true);
    // Roll backwards across the start line.
    drive(r, 0.05);
    drive(r, 0.98);
    expect(r.passedHalf).toBe(false);
    expect(r.lap).toBe(0);
  });

  it("finishes after the configured number of laps and stops counting", () => {
    const r = createRace({ laps: 2 });
    for (let lap = 0; lap < 2; lap++) {
      drive(r, 0.5);
      drive(r, 0.9);
      drive(r, 0.99);
      drive(r, 0.01);
    }
    expect(r.finished).toBe(true);
    expect(r.lap).toBe(2);
    const frozen = r.totalTime;
    drive(r, 0.5);
    drive(r, 0.9);
    expect(r.totalTime).toBe(frozen);
  });

  it("reports progress across the whole race", () => {
    const r = createRace({ laps: 4 });
    drive(r, 0.0);
    expect(r.progress).toBeCloseTo(0, 6);
    drive(r, 0.5);
    expect(r.progress).toBeCloseTo(0.125, 6);
    drive(r, 0.9);
    drive(r, 0.99);
    drive(r, 0.01);
    // One full lap of four done.
    expect(r.progress).toBeCloseTo(0.25, 1);
  });

  it("flags wrong way when the car is not moving forward", () => {
    const r = createRace({ laps: 3 });
    drive(r, 0.2, true);
    expect(r.wrongWay).toBe(false);
    drive(r, 0.2, false);
    expect(r.wrongWay).toBe(true);
  });

  it("formats time as mm:ss.mmm", () => {
    expect(formatTime(0)).toBe("00:00.000");
    expect(formatTime(65.5)).toBe("01:05.500");
    expect(formatTime(3599.999)).toBe("59:59.999");
    expect(formatTime(-1)).toBe("--:--.---");
    expect(formatTime(Number.NaN)).toBe("--:--.---");
  });
});
