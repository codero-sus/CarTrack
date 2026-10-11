/**
 * HUD and overlays. Plain DOM rather than canvas so text stays crisp at any
 * device pixel ratio and is readable by screen readers.
 */
import type { CarState } from "../core/car";
import { kph } from "../core/car";
import type { RaceState } from "../core/race";
import { formatTime } from "../core/race";

export interface Hud {
  root: HTMLElement;
  update(car: CarState, race: RaceState, fps: number): void;
  showCountdown(n: number | "GO"): void;
  hideCountdown(): void;
  showFinish(race: RaceState): void;
  hideFinish(): void;
  setEngaged(): void;
}

function el(tag: string, cls: string, parent: HTMLElement): HTMLElement {
  const node = document.createElement(tag);
  node.className = cls;
  parent.appendChild(node);
  return node;
}

export function buildHud(parent: HTMLElement): Hud {
  const root = el("div", "hud", parent);

  const speedBox = el("div", "hud-speed", root);
  const speedValue = el("div", "hud-speed-value", speedBox);
  const speedUnit = el("div", "hud-speed-unit", speedBox);
  speedUnit.textContent = "km/h";

  const nitroWrap = el("div", "hud-nitro", root);
  const nitroFill = el("div", "hud-nitro-fill", nitroWrap);
  const nitroLabel = el("div", "hud-nitro-label", nitroWrap);
  nitroLabel.textContent = "NITRO";

  const listBox = el("div", "hud-times", root);
  const lapLine = el("div", "hud-line", listBox);
  const timeLine = el("div", "hud-line", listBox);
  const bestLine = el("div", "hud-line hud-line-dim", listBox);
  const fpsLine = el("div", "hud-line hud-line-dim", listBox);

  const warn = el("div", "hud-warn", root);
  warn.textContent = "WRONG WAY";

  const countdown = el("div", "hud-countdown", parent);
  const finish = el("div", "hud-finish", parent);
  const finishCard = el("div", "hud-finish-card", finish);
  el("div", "hud-finish-title", finishCard).textContent = "RACE COMPLETE";
  const finishList = el("div", "hud-finish-list", finishCard);
  const finishRestart = el("button", "hud-button", finishCard);
  finishRestart.textContent = "Race again (R)";

  const hints = el("div", "hud-hints", parent);
  hints.innerHTML =
    "<b>W / &uarr;</b> throttle &nbsp; <b>S / &darr;</b> brake &nbsp; <b>A D / &larr; &rarr;</b> steer " +
    "&nbsp; <b>Shift</b> nitro &nbsp; <b>Space</b> handbrake &nbsp; <b>R</b> restart";

  let lastLapFlash = 0;

  function update(car: CarState, race: RaceState, fps: number): void {
    speedValue.textContent = String(Math.round(kph(car)));
    nitroFill.style.width = `${Math.round(car.nitro * 100)}%`;
    nitroWrap.classList.toggle("boosting", car.boosting);
    speedBox.classList.toggle("off-track", !car.onTrack);

    const total = race.config.laps;
    lapLine.textContent = `LAP ${Math.min(race.lap + 1, total)} / ${total}`;
    timeLine.textContent = `TIME ${formatTime(race.lapTime)}`;
    bestLine.textContent = `BEST ${race.bestLap === null ? "--:--.---" : formatTime(race.bestLap)}`;
    fpsLine.textContent = `${Math.round(fps)} fps`;

    warn.classList.toggle("show", race.wrongWay);

    if (race.lastLap && race.lastLap.isBest) {
      lastLapFlash = 1.6;
      bestLine.classList.add("flash");
    }
    if (lastLapFlash > 0) {
      lastLapFlash -= 1 / 60;
      if (lastLapFlash <= 0) bestLine.classList.remove("flash");
    }
  }

  function showCountdown(n: number | "GO"): void {
    countdown.textContent = String(n);
    countdown.classList.add("show");
    countdown.classList.toggle("go", n === "GO");
  }

  function hideCountdown(): void {
    countdown.classList.remove("show");
  }

  function showFinish(race: RaceState): void {
    finishList.replaceChildren();
    race.lapTimes.forEach((t, i) => {
      const row = el("div", "hud-finish-row", finishList);
      el("span", "hud-finish-lap", row).textContent = `Lap ${i + 1}`;
      const isBest = race.bestLap !== null && Math.abs(t - race.bestLap) < 1e-6;
      el("span", isBest ? "hud-finish-time best" : "hud-finish-time", row).textContent = formatTime(t);
    });
    const total = el("div", "hud-finish-row total", finishList);
    el("span", "hud-finish-lap", total).textContent = "Total";
    el("span", "hud-finish-time", total).textContent = formatTime(race.totalTime);
    finish.classList.add("show");
  }

  function hideFinish(): void {
    finish.classList.remove("show");
  }

  function setEngaged(): void {
    hints.classList.add("faded");
  }

  finishRestart.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("cartrack:restart"));
  });

  return { root, update, showCountdown, hideCountdown, showFinish, hideFinish, setEngaged };
}
