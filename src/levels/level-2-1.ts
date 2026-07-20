import type { LevelDef } from "./types.js";

/** Shared arena border frame (960×600 canvas). */
const FRAME = [
  { x: 40, y: 40, w: 880, h: 20 },
  { x: 40, y: 540, w: 880, h: 20 },
  { x: 40, y: 40, w: 20, h: 520 },
  { x: 900, y: 40, w: 20, h: 520 },
];

/**
 * World 2-1 "Pause & Play". Two balls, zero gravity. Ball 0 (cyan) rolls onto a
 * momentary trigger plate and is PAUSED there to hold it down — keeping the
 * time gate in Ball 1's lane open. Ball 1 (magenta) rolls through the open gate
 * to its goal; then Ball 0 is unpaused and continues to its own goal. Teaches
 * independent clocks + using a frozen ball to hold a switch.
 */
export const LEVEL_2_1: LevelDef = {
  id: "2-1",
  name: "Pause & Play",
  gravity: { x: 0, y: 0 },
  walls: FRAME,
  ballSpawns: [
    { x: 120, y: 200 },
    { x: 120, y: 400 },
  ],
  goals: [
    { ballIndex: 0, x: 820, y: 200, radius: 30 },
    { ballIndex: 1, x: 820, y: 400, radius: 30 },
  ],
  switches: [
    // Momentary (not persistent): only held while a ball sits on it.
    { id: "plate", x: 400, y: 200, radius: 30, persistent: false, reversible: false },
  ],
  doors: [
    // Blocks Ball 1's lane (y≈400) until the plate is held.
    { id: "gate", x: 400, y: 360, w: 20, h: 80, linkedSwitches: ["plate"] },
  ],
};
