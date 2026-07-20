import type { Simulation } from "../engine/simulation.js";
import type { InputController } from "../game/input.js";

/** Human label for a ball's time-speed multiplier. */
const formatSpeed = (s: number): string => {
  if (s === 0) return "paused";
  const sign = s < 0 ? "−" : "";
  return `${sign}${Math.abs(s)}×`;
};

/** Top HUD + centre banner. Reads sim/input each frame; no state of its own. */
export class Hud {
  constructor(
    private readonly left: HTMLElement,
    private readonly right: HTMLElement,
    private readonly hint: HTMLElement,
    private readonly banner: HTMLElement,
  ) {}

  update(
    sim: Simulation,
    input: InputController,
    opts: { hasNext: boolean; muted?: boolean },
  ): void {
    this.left.textContent = `${sim.name}`;
    const paused = sim.globalPaused ? "  ⏸ PAUSED" : "";
    const mute = opts.muted ? "  🔇" : "  🔊";
    this.right.textContent = `t = ${sim.globalTime.toFixed(2)}s${paused}${mute}`;

    if (sim.won) {
      this.hint.textContent = opts.hasNext
        ? "press Enter or click for the next kickoff"
        : "press Enter or click for the ultimate kickoff";
      this.banner.textContent = "KICKOFF COMPLETE";
      this.banner.classList.add("show");
      return;
    }
    this.banner.classList.remove("show");

    if (input.mode === "shooting") {
      this.hint.textContent = "Drag from the glowing cannon to kick off";
      return;
    }

    // Time mode: lead with the selected ball + its live speed, then the legend.
    const ball = sim.balls[input.selected];
    const speed = ball ? formatSpeed(ball.timeSpeed) : "—";
    this.hint.innerHTML =
      `<b>Ball ${input.selected + 1} · ${speed}</b>` +
      `<br>1/2/3 select · W play · S pause · X reverse · Q/E speed` +
      `<br>Space global pause · M mute · hold R reset`;
  }
}
