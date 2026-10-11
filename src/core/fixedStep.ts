/**
 * Fixed-timestep accumulator.
 *
 * The simulation always advances in exact FIXED_DT steps so car behaviour is
 * identical on a 144 Hz desktop and a 30 fps phone. Rendering interpolates
 * using `alpha`.
 */
export const FIXED_DT = 1 / 60;

/** Never simulate more than this many steps in one frame (spiral-of-death guard). */
export const MAX_STEPS_PER_FRAME = 8;

export class FixedStep {
  private accumulator = 0;

  constructor(private readonly dt: number = FIXED_DT) {}

  /**
   * Consume `frameDt` seconds of wall time and report how many fixed steps to run.
   * `frameDt` is clamped so a tab-out or a hitch cannot queue hundreds of steps.
   */
  update(frameDt: number): number {
    const clamped = Math.min(Math.max(frameDt, 0), 0.25);
    this.accumulator += clamped;
    let steps = 0;
    while (this.accumulator >= this.dt && steps < MAX_STEPS_PER_FRAME) {
      this.accumulator -= this.dt;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    return steps;
  }

  /** 0..1 blend factor between the previous and current simulation state. */
  get alpha(): number {
    return this.accumulator / this.dt;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
