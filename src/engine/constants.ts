/**
 * Engine-wide constants. Physics runs at a fixed timestep so that reverse
 * simulation is the exact inverse of forward simulation (determinism is a
 * hard requirement — see CLAUDE.md "Core architecture").
 */

/** Physics ticks per second. All simulation advances in whole DT steps. */
export const PHYSICS_HZ = 120;

/** Fixed global timestep in seconds. */
export const DT = 1 / PHYSICS_HZ;

/** Selectable per-ball time-speed multipliers (prd_2 §4.3.1). */
export const TIME_SPEEDS = [-2, -1, -0.5, 0, 0.5, 1, 2] as const;
export type TimeSpeed = (typeof TIME_SPEEDS)[number];

/** Max recorded history per ball: 5 minutes at PHYSICS_HZ (prd §8.2). */
export const MAX_KEYFRAMES = 5 * 60 * PHYSICS_HZ; // 36_000

/** Ball collision radius (world units / pixels). */
export const BALL_RADIUS = 12;

/** Floating-point tolerance for reversibility / equality checks. */
export const EPSILON = 1e-9;
