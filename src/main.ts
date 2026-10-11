/**
 * CarTrack — bootstrap and game loop.
 *
 * The simulation runs on a fixed 1/60 timestep; rendering interpolates between
 * steps. Nothing in `core/` imports three.js, so the rules are testable without
 * a browser.
 */
import { FIXED_DT, FixedStep } from "./core/fixedStep";
import {
  DEFAULT_PARAMS,
  NEUTRAL_INPUT,
  createCar,
  stepCar,
  type CarInput,
  type CarState,
} from "./core/car";
import { HARBOUR_CIRCUIT, Track } from "./core/track";
import { dot2, forwardFromYaw } from "./core/math";
import { createRace, updateRace, type RaceState } from "./core/race";
import { InputManager } from "./platform/input";
import { createContext } from "./render/scene";
import { buildTrackView } from "./render/trackView";
import { buildCarView } from "./render/carView";
import { buildChaseCamera } from "./render/chaseCamera";
import { buildEffects } from "./render/effects";
import { buildHud } from "./ui/hud";
import { buildTouchControls, isTouchDevice } from "./ui/touch";

const canvas = document.getElementById("scene") as HTMLCanvasElement | null;
const uiRoot = document.getElementById("ui") as HTMLDivElement | null;
if (!canvas || !uiRoot) throw new Error("CarTrack: #scene or #ui element missing");

const ctx = createContext(canvas);
const track = new Track(HARBOUR_CIRCUIT);
const trackView = buildTrackView(track, ctx.sun);
ctx.scene.add(trackView.group);

const carView = buildCarView();
ctx.scene.add(carView.group);

const effects = buildEffects();
ctx.scene.add(effects.group);

const chase = buildChaseCamera(ctx.camera);
const hud = buildHud(uiRoot);

const input = new InputManager();
input.attach(window);
if (isTouchDevice()) buildTouchControls(uiRoot, input);

type Phase = "countdown" | "racing" | "finished";

interface GameState {
  phase: Phase;
  countdown: number;
  car: CarState;
  race: RaceState;
  prevPos: { x: number; z: number };
  hint: number;
  lastInput: CarInput;
}

function newGame(): GameState {
  const spawn = track.spawnPoint(4, 0);
  const car = createCar(spawn.pos, spawn.heading);
  const proj = track.project(car.pos);
  const race = createRace({ laps: track.def.laps });
  race.t = proj.t;
  return {
    phase: "countdown",
    countdown: 3.6,
    car,
    race,
    prevPos: { x: car.pos.x, z: car.pos.z },
    hint: track.hintFromT(proj.t),
    lastInput: { ...NEUTRAL_INPUT },
  };
}

let game = newGame();
effects.reset();
hud.hideFinish();

function restart(): void {
  game = newGame();
  effects.reset();
  hud.hideFinish();
  hud.hideCountdown();
  fixed.reset();
}

window.addEventListener("cartrack:restart", restart);
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyR") restart();
});

const fixed = new FixedStep(FIXED_DT);
let lastTime = performance.now();
let fps = 60;
let fpsAccum = 0;
let fpsFrames = 0;
let shownCountdown: number | "GO" | null = null;

function simulate(state: GameState, dt: number): void {
  if (state.phase === "countdown") {
    state.countdown -= dt;
    const n = Math.ceil(state.countdown);
    const label: number | "GO" = state.countdown <= 0 ? "GO" : Math.min(3, n);
    if (label !== shownCountdown) {
      shownCountdown = label;
      hud.showCountdown(label);
    }
    if (state.countdown <= -0.6) {
      state.phase = "racing";
      shownCountdown = null;
      hud.hideCountdown();
    }
    // Wheels stay locked during the countdown.
    state.prevPos = { x: state.car.pos.x, z: state.car.pos.z };
    return;
  }

  if (state.phase !== "racing") return;

  const frameInput = input.sample();
  state.lastInput = frameInput;
  state.prevPos = { x: state.car.pos.x, z: state.car.pos.z };

  const proj = track.project(state.car.pos, state.hint);
  state.hint = track.hintFromT(proj.t);
  const onTrack = track.isOnTrack(proj.lateral);

  stepCar(state.car, frameInput, dt, onTrack, DEFAULT_PARAMS);

  // Forward motion along the racing line. Near standstill counts as "not
  // wrong way" so the warning does not flicker at the grid.
  const fwd = forwardFromYaw(state.car.heading);
  const alongTrack = dot2(fwd, proj.tangent) * state.car.forwardSpeed;
  const movingForward = alongTrack >= 0 || Math.abs(state.car.forwardSpeed) < 0.5;
  updateRace(state.race, proj.t, dt, movingForward);

  if (state.race.finished) {
    state.phase = "finished";
    hud.showFinish(state.race);
  }
}

function frame(now: number): void {
  const frameDt = Math.min((now - lastTime) / 1000, 0.25);
  lastTime = now;

  fpsAccum += frameDt;
  fpsFrames++;
  if (fpsAccum >= 0.5) {
    fps = fpsFrames / fpsAccum;
    fpsAccum = 0;
    fpsFrames = 0;
  }

  const steps = fixed.update(frameDt);
  for (let i = 0; i < steps; i++) simulate(game, FIXED_DT);

  const renderDt = Math.max(frameDt, 1 / 240);
  const alpha = game.phase === "countdown" ? 1 : fixed.alpha;

  const braking = game.lastInput.brake > 0 && game.car.forwardSpeed > 0.6;
  carView.update(game.car, alpha, game.prevPos, renderDt, braking);
  effects.update(game.car, renderDt);
  chase.update(game.car, renderDt, game.phase === "countdown" && game.countdown > 3.2);
  trackView.updateShadowTarget(game.car.pos.x, game.car.pos.z);

  hud.update(game.car, game.race, fps);
  if (input.engaged) hud.setEngaged();

  ctx.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
