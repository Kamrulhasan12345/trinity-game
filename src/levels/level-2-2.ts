import type { LevelDef } from "./types.js";

const FRAME = [
  { x: 40, y: 40, w: 880, h: 20 },
  { x: 40, y: 540, w: 880, h: 20 },
  { x: 40, y: 40, w: 20, h: 520 },
  { x: 900, y: 40, w: 20, h: 520 },
];

/**
 * World 2-2 "The Break". Two balls, zero gravity — a collision showcase. Ball 1
 * (magenta) is parked mid-arena and PAUSED as a launch pad. Ball 0 (cyan) is
 * kicked into it head-on: the elastic swap stops Ball 0 dead — right inside its
 * own goal — while Ball 1 stores the full impulse. Unpause Ball 1 and it fires
 * along the stored velocity into the far goal, so both balls sit in their goals
 * at once. Teaches stored-impulse launch (a struck paused ball fires when its
 * clock resumes). Head-on stop leaves Ball 0 at rest, so no reverse is needed.
 */
export const LEVEL_2_2: LevelDef = {
  id: "2-2",
  name: "The Break",
  gravity: { x: 0, y: 0 },
  walls: FRAME,
  ballSpawns: [
    { x: 150, y: 300 },
    { x: 500, y: 300 }, // launch pad — pause it here
  ],
  goals: [
    // Centred on Ball 0's head-on stopping point (≈ x 476, 24 short of the pad).
    { ballIndex: 0, x: 474, y: 300, radius: 34 },
    { ballIndex: 1, x: 840, y: 300, radius: 30 },
  ],
  switches: [],
  doors: [],
};
