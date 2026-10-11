/**
 * Lap timing and race state. Pure TypeScript, no engine imports.
 *
 * Laps are detected by the normalised track parameter `t` wrapping past 1.
 * A car must pass the halfway point before the wrap counts, so reversing over
 * the start line does not award a lap.
 */
import { clamp, wrap01 } from "./math";

export interface RaceConfig {
  laps: number;
}

export interface LapResult {
  /** 1-based lap number that just completed. */
  lap: number;
  seconds: number;
  isBest: boolean;
}

export interface RaceState {
  config: RaceConfig;
  /** 0-based index of the lap currently being driven. */
  lap: number;
  /** Seconds on the current lap. */
  lapTime: number;
  /** Total elapsed race time, seconds. */
  totalTime: number;
  lapTimes: number[];
  bestLap: number | null;
  /** True once the halfway checkpoint has been passed on the current lap. */
  passedHalf: boolean;
  finished: boolean;
  /** Normalised progress 0..1 on the current lap. */
  t: number;
  /** Overall progress across the whole race, 0..1. */
  progress: number;
  wrongWay: boolean;
  /** Set for one frame when a lap completes, so the HUD can flash. */
  lastLap: LapResult | null;
}

export function createRace(config: RaceConfig): RaceState {
  return {
    config,
    lap: 0,
    lapTime: 0,
    totalTime: 0,
    lapTimes: [],
    bestLap: null,
    passedHalf: false,
    finished: false,
    t: 0,
    progress: 0,
    wrongWay: false,
    lastLap: null,
  };
}

/**
 * Advance the race. Call once per fixed simulation step.
 *
 * @param t normalised track parameter, 0..1
 * @param movingForward whether the car is travelling in the correct direction
 */
export function updateRace(race: RaceState, t: number, dt: number, movingForward: boolean): RaceState {
  race.lastLap = null;
  const prev = race.t;
  const cur = wrap01(t);
  race.t = cur;
  race.wrongWay = !movingForward;

  if (race.finished) return race;

  race.lapTime += dt;
  race.totalTime += dt;

  // Halfway checkpoint — must be hit before a lap can complete.
  if (cur > 0.35 && cur < 0.65) race.passedHalf = true;

  const crossedForward = prev > 0.85 && cur < 0.15 && race.passedHalf;
  const crossedBackward = prev < 0.15 && cur > 0.85;

  if (crossedBackward && !crossedForward) {
    // Rolled back over the line. Revoke the checkpoint so they must redo the lap.
    race.passedHalf = false;
    return race;
  }

  if (crossedForward) {
    const seconds = race.lapTime;
    const isBest = race.bestLap === null || seconds < race.bestLap;
    if (isBest) race.bestLap = seconds;
    race.lapTimes.push(seconds);
    race.lap++;
    race.lapTime = 0;
    race.passedHalf = false;
    race.lastLap = { lap: race.lap, seconds, isBest };
    if (race.lap >= race.config.laps) race.finished = true;
  }

  const totalLaps = Math.max(1, race.config.laps);
  race.progress = clamp((race.lap + cur) / totalLaps, 0, 1);
  return race;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--.---";
  // Round to whole milliseconds FIRST. Taking the fractional part of a float
  // and flooring it loses the last digit (3599.999 -> 998, not 999).
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
