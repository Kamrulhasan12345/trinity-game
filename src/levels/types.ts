import type { AABB } from "../engine/collision.js";
import type { Vec2 } from "../engine/vec2.js";

/** Static level definition — serialisable JSON (prd §8.3). */
export interface LevelDef {
  id: string;
  name: string;
  gravity: Vec2;
  walls: AABB[];
  ballSpawns: Vec2[]; // 1..3 spawns; drives how many balls the level uses
  goals: GoalDef[];
  switches: SwitchDef[];
  doors: DoorDef[];
}

export interface GoalDef {
  ballIndex: number; // which ball must occupy this goal
  x: number;
  y: number;
  radius: number;
}

export interface SwitchDef {
  id: string;
  x: number;
  y: number;
  radius: number;
  /** Stays active after the ball leaves (else momentary). */
  persistent: boolean;
  /** Erasing the activating event can turn it back off. */
  reversible: boolean;
}

export interface DoorDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  linkedSwitches: string[]; // open iff ALL are active
}
