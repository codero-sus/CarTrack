/**
 * Input collection. Keyboard, gamepad and touch all funnel into one CarInput.
 *
 * Touch sets flags on this object directly (see ui/touch.ts) rather than
 * synthesising key events, so the game logic never has to know the device.
 */
import { clamp } from "../core/math";
import { NEUTRAL_INPUT, type CarInput } from "../core/car";

export interface TouchState {
  left: boolean;
  right: boolean;
  throttle: boolean;
  brake: boolean;
  handbrake: boolean;
  nitro: boolean;
}

const KEY_MAP: Record<string, keyof TouchState> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "throttle",
  KeyW: "throttle",
  ArrowDown: "brake",
  KeyS: "brake",
  Space: "handbrake",
  ShiftLeft: "nitro",
  ShiftRight: "nitro",
};

export class InputManager {
  readonly touch: TouchState = {
    left: false,
    right: false,
    throttle: false,
    brake: false,
    handbrake: false,
    nitro: false,
  };

  private readonly keys: TouchState = {
    left: false,
    right: false,
    throttle: false,
    brake: false,
    handbrake: false,
    nitro: false,
  };

  /** True once any input is seen, so the UI can hide the control hints. */
  engaged = false;
  gamepadIndex: number | null = null;

  private readonly onKeyDown = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (!action) return;
    // Stop Space/arrow keys from scrolling the page.
    e.preventDefault();
    this.keys[action] = true;
    this.engaged = true;
  };

  private readonly onKeyUp = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (!action) return;
    this.keys[action] = false;
  };

  private readonly onBlur = () => {
    // Losing focus with a key held down would otherwise stick the throttle on.
    for (const k of Object.keys(this.keys) as (keyof TouchState)[]) this.keys[k] = false;
  };

  private readonly onGamepadConnected = (e: GamepadEvent) => {
    this.gamepadIndex = e.gamepad.index;
    this.engaged = true;
  };

  attach(target: Window = window): void {
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("blur", this.onBlur);
    target.addEventListener("gamepadconnected", this.onGamepadConnected);
  }

  detach(target: Window = window): void {
    target.removeEventListener("keydown", this.onKeyDown);
    target.removeEventListener("keyup", this.onKeyUp);
    target.removeEventListener("blur", this.onBlur);
    target.removeEventListener("gamepadconnected", this.onGamepadConnected);
  }

  /** Blend keyboard, gamepad and touch into one frame's input. */
  sample(): CarInput {
    const gp = this.readGamepad();

    const left = this.keys.left || this.touch.left || gp.left;
    const right = this.keys.right || this.touch.right || gp.right;
    const throttle = this.keys.throttle || this.touch.throttle || gp.throttle > 0;
    const brake = this.keys.brake || this.touch.brake || gp.throttle < 0;
    const handbrake = this.keys.handbrake || this.touch.handbrake || gp.handbrake;
    const nitro = this.keys.nitro || this.touch.nitro || gp.nitro;

    if (left || right || throttle || brake || handbrake || nitro) this.engaged = true;

    let steer = 0;
    if (left) steer -= 1;
    if (right) steer += 1;
    // Analog input wins over digital when a pad is present.
    if (Math.abs(gp.steer) > 0.12) steer = clamp(gp.steer, -1, 1);

    return {
      steer,
      throttle: throttle ? 1 : 0,
      brake: brake ? 1 : 0,
      handbrake,
      nitro,
    };
  }

  private readGamepad(): {
    steer: number;
    throttle: number;
    left: boolean;
    right: boolean;
    handbrake: boolean;
    nitro: boolean;
  } {
    const idle = { steer: 0, throttle: 0, left: false, right: false, handbrake: false, nitro: false };
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads.find((p) => p !== null && p.connected) ?? null;
    if (!pad) return idle;
    this.gamepadIndex = pad.index;

    // Standard mapping: axis 0 = left stick X, button 7 = right trigger,
    // button 6 = left trigger, button 0 = A/cross, button 1 = B/circle.
    const steer = pad.axes[0] ?? 0;
    const rt = pad.buttons[7]?.value ?? 0;
    const lt = pad.buttons[6]?.value ?? 0;
    const throttle = rt > 0.05 ? rt : pad.buttons[0]?.pressed ? 1 : 0;
    const brakeAmt = lt > 0.05 ? -lt : pad.buttons[1]?.pressed ? -1 : 0;
    return {
      steer,
      throttle: throttle + brakeAmt,
      left: (pad.buttons[14]?.pressed ?? false) || steer < -0.5,
      right: (pad.buttons[15]?.pressed ?? false) || steer > 0.5,
      handbrake: pad.buttons[2]?.pressed ?? false,
      nitro: pad.buttons[5]?.pressed ?? false,
    };
  }
}

export { NEUTRAL_INPUT };
