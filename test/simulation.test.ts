import { describe, it, expect } from "vitest";
import { Simulation } from "../src/engine/simulation.js";
import { vec } from "../src/engine/vec2.js";
import type { LevelDef } from "../src/levels/types.js";

/** Zero-gravity corridor: ball rolls right past a switch toward a goal. */
const level: LevelDef = {
  id: "1-1t",
  name: "sim test",
  gravity: vec(0, 0),
  walls: [],
  ballSpawns: [vec(0, 100)],
  goals: [{ ballIndex: 0, x: 400, y: 100, radius: 20 }],
  switches: [{ id: "sw1", x: 150, y: 100, radius: 20, persistent: true, reversible: false }],
  doors: [{ id: "d1", x: 250, y: 60, w: 20, h: 80, linkedSwitches: ["sw1"] }],
};

describe("Simulation", () => {
  it("advances a launched ball forward and reverse returns it", () => {
    const sim = new Simulation(level);
    sim.launch(0, vec(100, 0));
    for (let i = 0; i < 60; i++) sim.tick();
    const xForward = sim.balls[0]!.pos.x;
    expect(xForward).toBeGreaterThan(0);

    sim.setTimeSpeed(0, -1);
    for (let i = 0; i < 60; i++) sim.tick();
    expect(sim.balls[0]!.pos.x).toBeCloseTo(0, 3);
    expect(sim.balls[0]!.localTime).toBeCloseTo(0, 3);
  });

  it("hitting a switch opens the linked door", () => {
    const sim = new Simulation(level);
    sim.launch(0, vec(100, 0));
    // Ball moves 100 px/s. Switch zone reaches x≈118 (150 − radius 32);
    // 200 ticks ≈ x=167, safely inside the trigger.
    for (let i = 0; i < 200; i++) sim.tick();
    expect(sim.world.switches[0]!.active).toBe(true);
    expect(sim.world.doors[0]!.open).toBe(true);
  });

  it("reversing through the now-open door and replaying keeps it open (non-reversible)", () => {
    const sim = new Simulation(level);
    sim.launch(0, vec(100, 0));
    for (let i = 0; i < 400; i++) sim.tick(); // ~x=333: past switch AND through door
    expect(sim.world.doors[0]!.open).toBe(true);
    const passedX = sim.balls[0]!.pos.x;
    expect(passedX).toBeGreaterThan(270);

    // Reverse back to before the switch.
    sim.setTimeSpeed(0, -1);
    while (sim.balls[0]!.localTime > 0.5) sim.tick();
    expect(sim.balls[0]!.pos.x).toBeLessThan(150);

    // Replay forward from the past — this branches (erases future).
    sim.setTimeSpeed(0, 1);
    for (let i = 0; i < 5; i++) sim.tick();
    // Switch is non-reversible: the door stays open despite the erased future.
    expect(sim.world.switches[0]!.active).toBe(true);
    expect(sim.world.doors[0]!.open).toBe(true);
  });

  it("wins when the ball rests inside its goal", () => {
    const sim = new Simulation(level);
    sim.launch(0, vec(100, 0));
    // Goal at x=400 radius 20 → win when x≥380 (~n=456). 700 ticks is ample.
    for (let i = 0; i < 700 && !sim.won; i++) {
      sim.tick();
      // Freeze the ball once it reaches the goal so it stays put.
      if (Math.abs(sim.balls[0]!.pos.x - 400) < 10) sim.setTimeSpeed(0, 0);
    }
    expect(sim.won).toBe(true);
  });
});

/** Open zero-gravity arena for multi-ball collision tests. */
const arena = (spawns: [number, number][], goals: LevelDef["goals"]): LevelDef => ({
  id: "multi",
  name: "multi",
  gravity: vec(0, 0),
  walls: [],
  ballSpawns: spawns.map(([x, y]) => vec(x, y)),
  goals,
  switches: [],
  doors: [],
});

describe("Simulation — ball-to-ball collisions", () => {
  it("a moving ball transfers momentum to a struck moving ball", () => {
    const sim = new Simulation(arena([[100, 100], [300, 100]], []));
    sim.launch(0, vec(120, 0)); // ball 0 heads right toward ball 1
    sim.launch(1, vec(0, 0)); // ball 1 sits (running clock, speed 1)
    let collided = false;
    for (let i = 0; i < 200; i++) {
      sim.tick();
      if (sim.balls[1]!.vel.x > 1) { collided = true; break; }
    }
    expect(collided).toBe(true);
    for (let i = 0; i < 30; i++) sim.tick(); // let the struck ball travel
    expect(sim.balls[1]!.pos.x).toBeGreaterThan(300); // pushed forward
  });

  it("a fast-forwarded striker transfers its full effective speed", () => {
    const sim = new Simulation(arena([[100, 100], [500, 100]], []));
    sim.launch(0, vec(150, 0));
    sim.launch(1, vec(0, 0));
    sim.setTimeSpeed(0, 2); // striker at 2× → effective 300 through space
    for (let i = 0; i < 400; i++) {
      sim.tick();
      if (sim.balls[1]!.vel.x > 1) break;
    }
    // Struck ball (1×) should carry the effective closing speed (~300), not 150.
    expect(sim.balls[1]!.vel.x).toBeGreaterThan(280);
  });

  it("a struck PAUSED ball stores the impulse and launches when unpaused", () => {
    const sim = new Simulation(arena([[100, 100], [300, 100]], []));
    sim.launch(0, vec(150, 0));
    sim.launch(1, vec(0, 0));
    sim.setTimeSpeed(1, 0); // ball 1 frozen — a launch pad

    const parkedX = sim.balls[1]!.pos.x;
    for (let i = 0; i < 200; i++) {
      sim.tick();
      if (sim.balls[1]!.vel.x > 1) break;
    }
    // Frozen ball took stored velocity but did NOT move while paused.
    expect(sim.balls[1]!.vel.x).toBeGreaterThan(1);
    expect(sim.balls[1]!.pos.x).toBeCloseTo(parkedX, 3);

    // Unpause: it now flies along the stored velocity.
    sim.setTimeSpeed(1, 1);
    for (let i = 0; i < 60; i++) sim.tick();
    expect(sim.balls[1]!.pos.x).toBeGreaterThan(parkedX + 20);
  });

  it("counts a ball-to-ball impact in collisionCount (for SFX)", () => {
    const sim = new Simulation(arena([[100, 100], [300, 100]], []));
    sim.launch(0, vec(160, 0));
    sim.launch(1, vec(0, 0));
    expect(sim.collisionCount).toBe(0);
    for (let i = 0; i < 200 && sim.collisionCount === 0; i++) sim.tick();
    expect(sim.collisionCount).toBeGreaterThan(0);
  });

  it("counts a wall bounce in bounceCount (for SFX)", () => {
    const walled: LevelDef = {
      ...arena([[100, 100]], []),
      walls: [{ x: 200, y: 0, w: 20, h: 400 }], // solid wall to the right
    };
    const sim = new Simulation(walled);
    sim.launch(0, vec(300, 0)); // fire the ball straight into it
    expect(sim.bounceCount).toBe(0);
    for (let i = 0; i < 200 && sim.bounceCount === 0; i++) sim.tick();
    expect(sim.bounceCount).toBeGreaterThan(0);
  });

  it("three balls in their goals at the same tick wins", () => {
    const sim = new Simulation(
      arena(
        [[100, 100], [100, 300], [100, 500]],
        [
          { ballIndex: 0, x: 100, y: 100, radius: 20 },
          { ballIndex: 1, x: 100, y: 300, radius: 20 },
          { ballIndex: 2, x: 100, y: 500, radius: 20 },
        ],
      ),
    );
    // Launch all three; each already spawns inside its own goal, so freezing
    // them there yields simultaneous occupancy.
    sim.launch(0, vec(0, 0));
    sim.launch(1, vec(0, 0));
    sim.launch(2, vec(0, 0));
    for (let i = 0; i < 3; i++) sim.setTimeSpeed(i, 0);
    sim.tick();
    expect(sim.won).toBe(true);
  });
});
