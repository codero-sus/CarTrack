/**
 * On-screen touch controls. Only mounted when the device reports a coarse
 * pointer, so desktop players never see them.
 *
 * These write straight into the InputManager's touch flags rather than
 * synthesising key events, which keeps the simulation device-agnostic.
 */
import type { InputManager } from "../platform/input";
import type { TouchState } from "../platform/input";

export interface TouchControls {
  root: HTMLElement;
  destroy(): void;
}

export function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 0)
  );
}

export function buildTouchControls(parent: HTMLElement, input: InputManager): TouchControls {
  const root = document.createElement("div");
  root.className = "touch";
  parent.appendChild(root);

  const leftPad = document.createElement("div");
  leftPad.className = "touch-pad touch-left";
  const rightPad = document.createElement("div");
  rightPad.className = "touch-pad touch-right";
  root.appendChild(leftPad);
  root.appendChild(rightPad);

  interface ButtonSpec {
    label: string;
    action: keyof TouchState;
    cls: string;
  }

  const specs: ButtonSpec[] = [
    { label: "NITRO", action: "nitro", cls: "btn-nitro" },
    { label: "BRAKE", action: "brake", cls: "btn-brake" },
    { label: "DRIFT", action: "handbrake", cls: "btn-drift" },
    { label: "GAS", action: "throttle", cls: "btn-gas" },
  ];

  const cleanups: (() => void)[] = [];

  function bind(node: HTMLElement, action: keyof TouchState): void {
    const on = (e: Event) => {
      e.preventDefault();
      input.touch[action] = true;
      node.classList.add("active");
      input.engaged = true;
    };
    const off = (e: Event) => {
      e.preventDefault();
      input.touch[action] = false;
      node.classList.remove("active");
    };
    node.addEventListener("pointerdown", on);
    node.addEventListener("pointerup", off);
    node.addEventListener("pointercancel", off);
    node.addEventListener("pointerleave", off);
    cleanups.push(() => {
      node.removeEventListener("pointerdown", on);
      node.removeEventListener("pointerup", off);
      node.removeEventListener("pointercancel", off);
      node.removeEventListener("pointerleave", off);
    });
  }

  for (const spec of specs) {
    const btn = document.createElement("button");
    btn.className = `touch-btn ${spec.cls}`;
    btn.type = "button";
    btn.textContent = spec.label;
    rightPad.appendChild(btn);
    bind(btn, spec.action);
  }

  const steerBtns: [string, keyof TouchState][] = [
    ["\u25c0", "left"],
    ["\u25b6", "right"],
  ];
  for (const [label, action] of steerBtns) {
    const btn = document.createElement("button");
    btn.className = "touch-btn btn-steer";
    btn.type = "button";
    btn.textContent = label;
    leftPad.appendChild(btn);
    bind(btn, action);
  }

  function destroy(): void {
    for (const fn of cleanups) fn();
    root.remove();
  }

  return { root, destroy };
}
