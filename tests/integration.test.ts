/**
 * Integration test: drives the real Harbour Circuit through track + car + race
 * together, using a simple autopilot. This is the closest thing to "play the
 * game" that runs without a browser, and it exercises the seams between the
 * three core modules — projection hints, lap detection, on/off-track grip.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, NEUTRAL_INPUT, createCar, stepCar, type CarInput } from "../src/core/car";
import { FIXED_DT } from "../src/core/fixedStep";
import { HARBOUR_CIRCUIT, Track } from "../src/core/track";
import { createRace, updateRace } from "../src/core/race";
import { dot2, forwardFromYaw } from "../src/core/math";

const track = new Track(HARBOUR_CIRCUIT);

/** Steer toward a point a few metres down the centreline; brake for corners. */
function autopilot(
  car: ReturnType<typeof createCar>,
  proj: ReturnType<Track["project"]>,
): CarInput {
  const lookahead = 0.02 + Math.min(0.05, car.forwardSpeed / track.totalLength);
  const target = track.sampleAt(proj.t + lookahead);

  const toTargetX = target.pos.x - car.pos.x;
  const toTargetZ = target.pos.z - car.pos.z;
  const len = Math.hypot(toTargetX, toTargetZ) || 1;

  const fwd = forwardFromYaw(car.heading);
  // Signed angle from the car's nose to the target. Positive means the target
  // is to the LEFT (increasing heading turns left), so negate for steer input.
  const cross = fwd.x * (-toTargetZ / len) - fwd.z * (-toTargetX / len);
  const dot = fwd.x * (toTargetX / len) + fwd.z * (toTargetZ / len);
  const angle = Math.atan2(cross, dot);

  const steer = Math.max(-1, Math.min(1, -angle * 2.6));
  const corneriness = Math.abs(angle);
  const brake = corneriness > 0.5 && car.forwardSpeed > 34 ? 1 : 0;
  const throttle = corneriness > 0.75 && car.forwardSpeed > 40 ? 0.35 : 1;

  return { ...NEUTRAL_INPUT, steer, throttle, brake, handbrake: false, nitro: car.nitro > 0.5 };
}

function driveRace(maxSeconds = 400) {
  const spawn = track.spawnPoint(4, 0);
  const car = createCar(spawn.pos, spawn.heading);
  const race = createRace({ laps: track.def.laps });
  let hint = track.hintFromT(track.project(car.pos).t);
  race.t = track.project(car.pos).t;

  let offTrackSteps = 0;
  let peakSpeed = 0;
  let steps = 0;
  const limit = Math.round(maxSeconds / FIXED_DT);

  while (!race.finished && steps < limit) {
    const proj = track.project(car.pos, hint);
    hint = track.hintFromT(proj.t);
    const onTrack = track.isOnTrack(proj.lateral);
    if (!onTrack) offTrackSteps++;

    stepCar(car, autopilot(car, proj), FIXED_DT, onTrack, DEFAULT_PARAMS);
    peakSpeed = Math.max(peakSpeed, car.forwardSpeed);

    const fwd = forwardFromYaw(car.heading);
    const along = dot2(fwd, proj.tangent) * car.forwardSpeed;
    updateRace(race, proj.t, FIXED_DT, along >= 0 || Math.abs(car.forwardSpeed) < 0.5);
    steps++;
  }

  return { car, race, offTrackSteps, peakSpeed, seconds: steps * FIXED_DT };
}

describe("full race on Harbour Circuit", () => {
  const result = driveRace();

  it("completes all three laps", () => {
    expect(result.race.finished).toBe(true);
    expect(result.race.lap).toBe(HARBOUR_CIRCUIT.laps);
    expect(result.race.lapTimes).toHaveLength(HARBOUR_CIRCUIT.laps);
  });

  it("records plausible lap times", () => {
    for (const t of result.race.lapTimes) {
      expect(t).toBeGreaterThan(5);
      expect(t).toBeLessThan(200);
    }
    expect(result.race.bestLap).not.toBeNull();
    expect(result.race.bestLap).toBeLessThanOrEqual(Math.min(...result.race.lapTimes) + 1e-9);
  });

  it("reaches a sane top speed", () => {
    expect(result.peakSpeed).toBeGreaterThan(25);
    expect(result.peakSpeed).toBeLessThanOrEqual(
      DEFAULT_PARAMS.maxSpeed + DEFAULT_PARAMS.nitroSpeedBonus + 1e-6,
    );
  });

  it("stays mostly on the tarmac", () => {
    const totalSteps = result.seconds / FIXED_DT;
    const offTrackRatio = result.offTrackSteps / totalSteps;
    expect(offTrackRatio).toBeLessThan(0.25);
  });

  it("progresses monotonically to 1.0", () => {
    expect(result.race.progress).toBeGreaterThan(0.99);
  });

  it("is deterministic across runs", () => {
    const a = driveRace();
    const b = driveRace();
    expect(a.race.lapTimes).toEqual(b.race.lapTimes);
    expect(a.car.pos.x).toBe(b.car.pos.x);
    expect(a.car.pos.z).toBe(b.car.pos.z);
  });
});
