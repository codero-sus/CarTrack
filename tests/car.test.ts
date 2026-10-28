import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARAMS,
  NEUTRAL_INPUT,
  createCar,
  kph,
  stepCar,
  type CarInput,
} from "../src/core/car";
import { FIXED_DT } from "../src/core/fixedStep";
import { vec2 } from "../src/core/math";

const FULL_THROTTLE: CarInput = { ...NEUTRAL_INPUT, throttle: 1 };

/** Run the sim for `seconds` with a constant input on tarmac. */
function run(seconds: number, input: CarInput, onTrack = true) {
  const car = createCar(vec2(0, 0), 0);
  const steps = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < steps; i++) stepCar(car, input, FIXED_DT, onTrack, DEFAULT_PARAMS);
  return car;
}

describe("car physics", () => {
  it("does not move with no input", () => {
    const car = run(2, NEUTRAL_INPUT);
    expect(car.speed).toBe(0);
    expect(car.pos.x).toBe(0);
    expect(car.pos.z).toBe(0);
  });

  it("accelerates forward along its heading", () => {
    // Heading 0 faces -Z, so the car should travel in -Z.
    const car = run(1.5, FULL_THROTTLE);
    expect(car.forwardSpeed).toBeGreaterThan(5);
    expect(car.pos.z).toBeLessThan(-5);
    expect(Math.abs(car.pos.x)).toBeLessThan(0.001);
  });

  it("respects the top speed", () => {
    const car = run(30, FULL_THROTTLE);
    expect(car.forwardSpeed).toBeLessThanOrEqual(DEFAULT_PARAMS.maxSpeed + 1e-6);
    expect(car.forwardSpeed).toBeGreaterThan(DEFAULT_PARAMS.maxSpeed * 0.95);
  });

  it("goes faster while boosting than without", () => {
    // Nitro only lasts ~0.8s from the spawn charge, so compare PEAK speed over
    // the run rather than the final speed — both cars settle at maxSpeed.
    const peak = (input: CarInput) => {
      const car = createCar(vec2(0, 0), 0);
      car.nitro = 1;
      let best = 0;
      for (let i = 0; i < 600; i++) {
        stepCar(car, input, FIXED_DT, true);
        best = Math.max(best, car.forwardSpeed);
      }
      return best;
    };
    const plain = peak(FULL_THROTTLE);
    const boosting = peak({ ...FULL_THROTTLE, nitro: true });
    expect(boosting).toBeGreaterThan(plain);
    expect(boosting).toBeGreaterThan(DEFAULT_PARAMS.maxSpeed);
  });

  it("drains nitro while boosting and stops boosting when empty", () => {
    const car = createCar(vec2(0, 0), 0);
    const start = car.nitro;
    for (let i = 0; i < 600; i++) stepCar(car, { ...FULL_THROTTLE, nitro: true }, FIXED_DT, true);
    expect(car.nitro).toBeLessThan(start);
    expect(car.nitro).toBe(0);
    expect(car.boosting).toBe(false);
  });

  it("steers left when asked to steer left", () => {
    const car = createCar(vec2(0, 0), 0);
    const input: CarInput = { ...FULL_THROTTLE, steer: -1 };
    for (let i = 0; i < 180; i++) stepCar(car, input, FIXED_DT, true);
    // From heading 0 (-Z), turning left means -X.
    expect(car.pos.x).toBeLessThan(0);
  });

  // Regression guard: forwardFromYaw is (-sin, -cos), so *increasing* heading
  // turns left. An earlier version integrated yaw with a + sign, which made
  // every steering input do the opposite of what the player asked.
  it("steers in the direction the input asks for, both ways", () => {
    const drive = (steer: number, steps: number) => {
      const car = createCar(vec2(0, 0), 0);
      for (let i = 0; i < steps; i++) stepCar(car, { ...FULL_THROTTLE, steer }, FIXED_DT, true);
      return car;
    };
    // +X is screen-right at heading 0.
    const right = drive(1, 120);
    const left = drive(-1, 120);
    expect(right.pos.x).toBeGreaterThan(0);
    expect(left.pos.x).toBeLessThan(0);

    // Check heading sign over a SHORT window only. At full lock the car can
    // rotate past PI in two seconds, and wrapPi then flips the sign.
    const rightEarly = drive(1, 30);
    const leftEarly = drive(-1, 30);
    expect(rightEarly.heading).toBeLessThan(0);
    expect(leftEarly.heading).toBeGreaterThan(0);
  });

  it("brakes to a stop, then continues into reverse", () => {
    // Holding brake is deliberately allowed to reverse once stopped — that is
    // standard arcade behaviour. So assert the car passes THROUGH a standstill
    // rather than resting at one.
    const car = createCar(vec2(0, 0), 0);
    for (let i = 0; i < 300; i++) stepCar(car, FULL_THROTTLE, FIXED_DT, true);
    const before = car.forwardSpeed;
    expect(before).toBeGreaterThan(20);

    let minAbs = Infinity;
    let sawPositive = false;
    let sawNegative = false;
    for (let i = 0; i < 600; i++) {
      stepCar(car, { ...NEUTRAL_INPUT, brake: 1 }, FIXED_DT, true);
      minAbs = Math.min(minAbs, Math.abs(car.forwardSpeed));
      if (car.forwardSpeed > 0.5) sawPositive = true;
      if (car.forwardSpeed < -0.5) sawNegative = true;
    }
    expect(sawPositive).toBe(true);
    expect(minAbs).toBeLessThan(0.5);
    expect(sawNegative).toBe(true);
  });

  it("can reverse", () => {
    const car = createCar(vec2(0, 0), 0);
    for (let i = 0; i < 300; i++) stepCar(car, { ...NEUTRAL_INPUT, brake: 1 }, FIXED_DT, true);
    expect(car.forwardSpeed).toBeLessThan(0);
    expect(car.pos.z).toBeGreaterThan(0);
  });

  it("caps reverse speed", () => {
    const car = createCar(vec2(0, 0), 0);
    for (let i = 0; i < 900; i++) stepCar(car, { ...NEUTRAL_INPUT, brake: 1 }, FIXED_DT, true);
    expect(car.forwardSpeed).toBeGreaterThanOrEqual(-DEFAULT_PARAMS.maxReverseSpeed - 1e-6);
  });

  it("loses speed and grip off track", () => {
    const on = run(12, FULL_THROTTLE, true);
    const off = run(12, FULL_THROTTLE, false);
    expect(off.forwardSpeed).toBeLessThan(on.forwardSpeed);
    expect(off.forwardSpeed).toBeLessThanOrEqual(
      DEFAULT_PARAMS.maxSpeed * DEFAULT_PARAMS.offTrackSpeedMul + 1e-6,
    );
  });

  it("handbrake produces a slide that grip eventually kills", () => {
    const car = createCar(vec2(0, 0), 0);
    // Get up to speed first.
    for (let i = 0; i < 240; i++) stepCar(car, FULL_THROTTLE, FIXED_DT, true);

    const driftInput: CarInput = { ...FULL_THROTTLE, steer: 1, handbrake: true };
    let peakLateral = 0;
    let everDrifting = false;
    for (let i = 0; i < 90; i++) {
      stepCar(car, driftInput, FIXED_DT, true);
      peakLateral = Math.max(peakLateral, Math.abs(car.lateralSpeed));
      if (car.drifting) everDrifting = true;
    }
    expect(peakLateral).toBeGreaterThan(DEFAULT_PARAMS.driftThreshold);
    // Assert the slide registered at some point. A full-lock handbrake turn
    // eventually spins the car until forward speed drops below driftMinForward,
    // at which point it is correctly no longer "drifting" but spinning out.
    expect(everDrifting).toBe(true);

    // Release the handbrake and steering; grip must recover.
    for (let i = 0; i < 300; i++) stepCar(car, FULL_THROTTLE, FIXED_DT, true);
    expect(Math.abs(car.lateralSpeed)).toBeLessThan(1);
    expect(car.drifting).toBe(false);
  });

  it("charges nitro while drifting", () => {
    const car = createCar(vec2(0, 0), 0);
    for (let i = 0; i < 240; i++) stepCar(car, FULL_THROTTLE, FIXED_DT, true);
    car.nitro = 0;
    const driftInput: CarInput = { ...FULL_THROTTLE, steer: 1, handbrake: true };
    for (let i = 0; i < 120; i++) stepCar(car, driftInput, FIXED_DT, true);
    expect(car.nitro).toBeGreaterThan(0.01);
  });

  it("reports speed in km/h", () => {
    const car = run(10, FULL_THROTTLE);
    expect(kph(car)).toBeCloseTo(car.speed * 3.6, 6);
    expect(kph(car)).toBeGreaterThan(100);
  });

  it("is deterministic for a fixed input sequence", () => {
    const a = run(6, { ...FULL_THROTTLE, steer: 0.4 });
    const b = run(6, { ...FULL_THROTTLE, steer: 0.4 });
    expect(a.pos.x).toBe(b.pos.x);
    expect(a.pos.z).toBe(b.pos.z);
    expect(a.heading).toBe(b.heading);
    expect(a.nitro).toBe(b.nitro);
  });
});
