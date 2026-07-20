import type { LevelDef } from "./types.js";

const FRAME = [
  { x: 40, y: 40, w: 880, h: 20 },
  { x: 40, y: 540, w: 880, h: 20 },
  { x: 40, y: 40, w: 20, h: 520 },
  { x: 900, y: 40, w: 20, h: 520 },
];

/**
 * World 3-1 "Trinity". Three balls, three lanes, zero gravity. Each ball must
 * sit in its colour-matched goal at the SAME global instant. Kick each down its
 * lane and pause it in its goal; the win only fires when all three are occupied
 * simultaneously. Teaches the simultaneous-kickoff win condition.
 */
export const LEVEL_3_1: LevelDef = {
  id: "3-1",
  name: "Trinity",
  gravity: { x: 0, y: 0 },
  walls: FRAME,
  ballSpawns: [
    { x: 120, y: 150 },
    { x: 120, y: 300 },
    { x: 120, y: 450 },
  ],
  goals: [
    { ballIndex: 0, x: 820, y: 150, radius: 30 },
    { ballIndex: 1, x: 820, y: 300, radius: 30 },
    { ballIndex: 2, x: 820, y: 450, radius: 30 },
  ],
  switches: [],
  doors: [],
};
