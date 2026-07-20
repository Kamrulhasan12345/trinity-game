import { BALL_RADIUS, type TimeSpeed } from "./constants.js";
import { clone, vec, type Vec2 } from "./vec2.js";
import { Timeline } from "./timeline.js";

/**
 * A ball is the unit the player manipulates in time. Its live pos/vel are the
 * authoritative state (the simulation is sim-authoritative); `timeline` is a
 * *derived* recording used only for scrub preview and ghost replay.
 */
export interface Ball {
  index: number; // 0..2, colour-matched to a goal
  pos: Vec2;
  vel: Vec2;
  radius: number;
  mass: number;
  /** Local clock, advances by timeSpeed * dt_global each global tick. */
  localTime: number;
  /** Current per-ball time multiplier. */
  timeSpeed: TimeSpeed;
  /** True once launched from its cannon in the shooting phase. */
  launched: boolean;
  /** Derived keyframe recording (scrubbing / ghosts). */
  timeline: Timeline;
}

export const createBall = (index: number, spawn: Vec2): Ball => ({
  index,
  pos: clone(spawn),
  vel: vec(0, 0),
  radius: BALL_RADIUS,
  mass: 1,
  localTime: 0,
  timeSpeed: 1,
  launched: false,
  timeline: new Timeline(),
});
