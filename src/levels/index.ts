import { LEVEL_1_1 } from "./level-1-1.js";
import { LEVEL_2_1 } from "./level-2-1.js";
import { LEVEL_2_2 } from "./level-2-2.js";
import { LEVEL_3_1 } from "./level-3-1.js";
import type { LevelDef } from "./types.js";

/** Ordered campaign. */
export const LEVELS: LevelDef[] = [LEVEL_1_1, LEVEL_2_1, LEVEL_2_2, LEVEL_3_1];

export const getLevel = (index: number): LevelDef =>
  LEVELS[index] ?? LEVELS[0]!;

export const levelCount = (): number => LEVELS.length;
