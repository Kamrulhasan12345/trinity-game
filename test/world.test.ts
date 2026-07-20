import { describe, it, expect } from "vitest";
import { World } from "../src/engine/world.js";
import { createBall } from "../src/engine/ball.js";
import { vec } from "../src/engine/vec2.js";
import type { LevelDef } from "../src/levels/types.js";

/** Level with one switch and one door linked to it. */
const makeLevel = (persistent: boolean, reversible: boolean): LevelDef => ({
  id: "t",
  name: "test",
  gravity: vec(0, 0),
  walls: [],
  ballSpawns: [vec(0, 0)],
  goals: [],
  switches: [{ id: "sw1", x: 100, y: 100, radius: 20, persistent, reversible }],
  doors: [{ id: "d1", x: 300, y: 0, w: 20, h: 100, linkedSwitches: ["sw1"] }],
});

describe("World switches & doors", () => {
  it("door opens iff all linked switches are active", () => {
    const w = new World(makeLevel(true, false));
    expect(w.doors[0]!.open).toBe(false);

    const ball = createBall(0, vec(100, 100));
    ball.launched = true;
    w.updateSwitches([ball], 1);
    expect(w.switches[0]!.active).toBe(true);
    expect(w.doors[0]!.open).toBe(true);
  });

  it("persistent switch stays active after the ball leaves", () => {
    const w = new World(makeLevel(true, false));
    const ball = createBall(0, vec(100, 100));
    ball.launched = true;
    ball.localTime = 1;
    w.updateSwitches([ball], 1);

    ball.pos = vec(999, 999); // ball moves away
    w.updateSwitches([ball], 2);
    expect(w.switches[0]!.active).toBe(true);
    expect(w.doors[0]!.open).toBe(true);
  });

  it("non-reversible switch survives an erased future (the paradox)", () => {
    const w = new World(makeLevel(true, false));
    const ball = createBall(0, vec(100, 100));
    ball.launched = true;
    ball.localTime = 2; // activated at local time 2
    w.updateSwitches([ball], 5);
    expect(w.switches[0]!.active).toBe(true);

    // Erase the ball's future past local time 1 (before it hit the switch).
    w.branch(0, 1);
    expect(w.switches[0]!.active).toBe(true); // non-reversible remembers
    expect(w.doors[0]!.open).toBe(true);
  });

  it("reversible switch reverts when its activation is erased", () => {
    const w = new World(makeLevel(true, true));
    const ball = createBall(0, vec(100, 100));
    ball.launched = true;
    ball.localTime = 2;
    w.updateSwitches([ball], 5);
    expect(w.switches[0]!.active).toBe(true);

    w.branch(0, 1); // erase the activation
    expect(w.switches[0]!.active).toBe(false); // reversible forgets
    expect(w.doors[0]!.open).toBe(false); // door re-evaluates and closes
  });
});
