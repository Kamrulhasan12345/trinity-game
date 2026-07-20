import type { Sink } from "./sfx.js";

/**
 * The read-only slice of a Simulation the reactor diffs. Declared structurally
 * so `Simulation` satisfies it without a compile-time import, and tests can pass
 * a plain stub. All fields are read, never written.
 */
export interface Observable {
  balls: ReadonlyArray<{ launched: boolean }>;
  world: { switches: ReadonlyArray<{ active: boolean }> };
  won: boolean;
  /** Monotonic tallies of collision/bounce events (see Simulation). */
  collisionCount: number;
  bounceCount: number;
}

/**
 * Turns simulation state changes into sound cues without touching the engine.
 * `observe(sim)` is called once per render frame and fires the sink on rising
 * edges only: a new ball launched, a switch flipping on, or the level being won.
 * State is compared against the previous frame's snapshot, so steady state is
 * silent and each event fires exactly once. One instance per level (its
 * snapshot resets when a fresh Reactor is built in `boot`).
 */
export class Reactor {
  private launchedCount = 0;
  private switchesOn: boolean[] = [];
  private won = false;
  private collisions = 0;
  private bounces = 0;
  private primed = false;

  constructor(private readonly sink: Sink) {}

  observe(sim: Observable): void {
    const launched = sim.balls.reduce((n, b) => n + (b.launched ? 1 : 0), 0);
    const switches = sim.world.switches.map((s) => s.active);

    // The first frame only seeds the baseline (e.g. a level that spawns with a
    // ball already launched must not blast a kickoff on load).
    if (!this.primed) {
      this.launchedCount = launched;
      this.switchesOn = switches;
      this.won = sim.won;
      this.collisions = sim.collisionCount;
      this.bounces = sim.bounceCount;
      this.primed = true;
      return;
    }

    if (launched > this.launchedCount) this.sink.kickoff();

    for (let i = 0; i < switches.length; i++) {
      if (switches[i] && !this.switchesOn[i]) this.sink.switchOn();
    }

    if (sim.won && !this.won) this.sink.win();

    // Collisions/bounces are counters, not edges: a render frame may span many
    // physics ticks, so fire once per frame when the tally grew (no machine-gun).
    if (sim.collisionCount > this.collisions) this.sink.collision();
    if (sim.bounceCount > this.bounces) this.sink.bounce();

    this.launchedCount = launched;
    this.switchesOn = switches;
    this.won = sim.won;
    this.collisions = sim.collisionCount;
    this.bounces = sim.bounceCount;
  }
}
