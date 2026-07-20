import type { LevelDef } from "./types.js";

/**
 * World 1-1 "First Kickoff". One ball, zero gravity. The ball rolls right
 * across a trigger plate that opens a time gate, then reaches its goal beyond
 * the gate. Reversing (X) drives the ball back through the gate it just opened
 * — the Phase 0 demonstration of active reverse against the current world.
 */
export const LEVEL_1_1: LevelDef = {
  id: "1-1",
  name: "First Kickoff",
  gravity: { x: 0, y: 0 },
  walls: [
    { x: 40, y: 40, w: 880, h: 20 }, // top
    { x: 40, y: 540, w: 880, h: 20 }, // bottom
    { x: 40, y: 40, w: 20, h: 520 }, // left
    { x: 900, y: 40, w: 20, h: 520 }, // right
  ],
  ballSpawns: [{ x: 130, y: 300 }],
  goals: [{ ballIndex: 0, x: 840, y: 300, radius: 34 }],
  switches: [
    { id: "sw1", x: 480, y: 300, radius: 28, persistent: true, reversible: false },
  ],
  doors: [
    { id: "gate1", x: 650, y: 170, w: 20, h: 260, linkedSwitches: ["sw1"] },
  ],
};
