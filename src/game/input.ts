import { TIME_SPEEDS, type TimeSpeed } from "../engine/constants.js";
import { len, sub, normalize, scale, vec, type Vec2 } from "../engine/vec2.js";
import type { Simulation } from "../engine/simulation.js";
import type { Mode } from "./modes.js";

const MAX_LAUNCH_SPEED = 520;
const POWER_SCALE = 2.2; // launch speed per pixel of drag

/**
 * Translates keyboard + mouse into simulation commands and holds the small
 * amount of view state the renderer needs (mode, selected ball, live drag).
 */
export class InputController {
  mode: Mode = "shooting";
  selected = 0;
  /** Active aim drag in canvas coordinates, or null. */
  drag: { from: Vec2; to: Vec2 } | null = null;
  private resetHeldSince = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly sim: Simulation,
    private readonly onReset: () => void,
    private readonly onAdvance: () => void,
  ) {
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  /** Remove all listeners so a fresh level can bind its own controller. */
  dispose(): void {
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  /** Index of the next ball awaiting kickoff, or -1 when all launched. */
  nextCannon(): number {
    return this.sim.balls.findIndex((b) => !b.launched);
  }

  private canvasPoint(e: MouseEvent): Vec2 {
    const r = this.canvas.getBoundingClientRect();
    return vec(
      ((e.clientX - r.left) / r.width) * this.canvas.width,
      ((e.clientY - r.top) / r.height) * this.canvas.height,
    );
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (this.mode !== "shooting") return;
    const cannon = this.nextCannon();
    if (cannon < 0) return;
    const spawn = this.sim.balls[cannon]!.pos;
    this.drag = { from: { ...spawn }, to: this.canvasPoint(e) };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.drag) this.drag.to = this.canvasPoint(e);
  };

  private onMouseUp = (): void => {
    if (this.sim.won) {
      this.onAdvance();
      return;
    }
    if (!this.drag) return;
    const cannon = this.nextCannon();
    if (cannon >= 0) {
      const dir = sub(this.drag.to, this.drag.from);
      const speed = Math.min(len(dir) * POWER_SCALE, MAX_LAUNCH_SPEED);
      if (speed > 20) {
        this.sim.launch(cannon, scale(normalize(dir), speed));
        if (this.nextCannon() < 0) {
          this.mode = "time";
          this.selected = 0;
        }
      }
    }
    this.drag = null;
  };

  /** Programmatic kickoff — used by the debug API and tests. */
  launch(index: number, velocity: Vec2): void {
    this.sim.launch(index, velocity);
    if (this.nextCannon() < 0) {
      this.mode = "time";
      this.selected = 0;
    }
  }

  private cycleSpeed(dir: 1 | -1): void {
    const b = this.sim.balls[this.selected];
    if (!b) return;
    const i = TIME_SPEEDS.indexOf(b.timeSpeed);
    const next = TIME_SPEEDS[Math.max(0, Math.min(TIME_SPEEDS.length - 1, i + dir))]!;
    this.sim.setTimeSpeed(this.selected, next as TimeSpeed);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (key === "enter" && this.sim.won) {
      this.onAdvance();
      return;
    }
    if (key === "r") {
      if (this.resetHeldSince === 0) this.resetHeldSince = performance.now();
      else if (performance.now() - this.resetHeldSince > 600) this.onReset();
      return;
    }
    if (this.mode !== "time") return;

    switch (key) {
      case "1": case "2": case "3": {
        const idx = Number(key) - 1;
        if (idx < this.sim.balls.length) this.selected = idx;
        break;
      }
      case " ":
        e.preventDefault();
        this.sim.setGlobalPaused(!this.sim.globalPaused);
        break;
      case "w": this.sim.setTimeSpeed(this.selected, 1); break;
      case "s": this.sim.setTimeSpeed(this.selected, 0); break;
      case "x": this.sim.setTimeSpeed(this.selected, -1); break;
      case "e": this.cycleSpeed(1); break;
      case "q": this.cycleSpeed(-1); break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.key.toLowerCase() === "r") this.resetHeldSince = 0;
  };
}
