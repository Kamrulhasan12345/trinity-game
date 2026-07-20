import { DT } from "../engine/constants.js";
import type { Simulation } from "../engine/simulation.js";

/**
 * Fixed-timestep loop: physics advances in whole DT (120 Hz) steps via an
 * accumulator, decoupled from the render frame rate (rAF, ~60 fps). This keeps
 * simulation deterministic regardless of display refresh (prd §8.2).
 */
export class GameLoop {
  private acc = 0;
  private last = 0;
  private running = false;

  constructor(
    private readonly sim: Simulation,
    private readonly render: () => void,
  ) {}

  start(): void {
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    // Cap the frame delta so a background tab can't spiral the accumulator.
    const frameDt = Math.min((now - this.last) / 1000, 0.25);
    this.last = now;
    this.acc += frameDt;

    let steps = 0;
    while (this.acc >= DT && steps < 600) {
      this.sim.tick();
      this.acc -= DT;
      steps++;
    }

    this.render();
    requestAnimationFrame(this.frame);
  };
}
