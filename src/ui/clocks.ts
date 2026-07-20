import type { Simulation } from "../engine/simulation.js";
import type { InputController } from "../game/input.js";
import { BALL_COLORS, speedGlyph } from "../game/modes.js";

/**
 * DOM overlay of one analogue clock per ball, showing local time as a sweeping
 * hand plus a speed indicator. Clicking a clock selects that ball.
 */
export class Clocks {
  private readonly faces: {
    root: HTMLElement;
    hand: HTMLElement;
    label: HTMLElement;
  }[] = [];

  constructor(container: HTMLElement, sim: Simulation, input: InputController) {
    for (const ball of sim.balls) {
      const color = BALL_COLORS[ball.index % BALL_COLORS.length]!;
      const root = document.createElement("div");
      root.style.cssText = `width:72px;height:92px;display:flex;flex-direction:column;
        align-items:center;gap:6px;cursor:pointer;user-select:none;opacity:0.55;
        transition:opacity 0.15s;`;
      const dial = document.createElement("div");
      dial.style.cssText = `position:relative;width:56px;height:56px;border-radius:50%;
        border:3px solid ${color};background:#120e2a;box-shadow:0 0 12px ${color}55;`;
      const hand = document.createElement("div");
      hand.style.cssText = `position:absolute;left:50%;top:50%;width:2px;height:22px;
        background:${color};transform-origin:bottom center;transform:translate(-50%,-100%);`;
      dial.appendChild(hand);
      const label = document.createElement("div");
      label.style.cssText = `font-size:11px;color:${color};letter-spacing:0.04em;`;
      root.append(dial, label);
      root.addEventListener("click", () => {
        if (input.mode === "time") input.selected = ball.index;
      });
      container.appendChild(root);
      this.faces.push({ root, hand, label });
    }
  }

  update(sim: Simulation, input: InputController): void {
    sim.balls.forEach((ball, i) => {
      const face = this.faces[i];
      if (!face) return;
      // One full sweep every 4 seconds of local time.
      const angle = (ball.localTime / 4) * 360;
      face.hand.style.transform = `translate(-50%,-100%) rotate(${angle}deg)`;
      const sel = input.mode === "time" && input.selected === i;
      face.root.style.opacity = ball.launched ? (sel ? "1" : "0.7") : "0.35";
      face.label.textContent = ball.launched ? speedGlyph(ball.timeSpeed) : "—";
    });
  }
}
