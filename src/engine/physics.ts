import { circleVsAABB, type AABB, bounceVelocity } from "./collision.js";
import { add, dot, scale, type Vec2 } from "./vec2.js";
import type { Ball } from "./ball.js";

/** Everything a physics step needs from the world, decoupled from World. */
export interface PhysicsContext {
  gravity: Vec2;
  /** Solid AABBs to collide against: level walls + any currently-closed door. */
  solids: AABB[];
}

/**
 * Advance one ball by `dt` seconds. `dt` may be negative for active reverse.
 *
 * Invertibility: forward uses semi-implicit Euler (velocity then position);
 * reverse uses the exact inverse order (position then velocity), so
 * step(+dt) followed by step(-dt) returns pos/vel to their originals within
 * float tolerance under constant acceleration (prd §4.2). Collisions are
 * resolved against the CURRENT world each step — this is what lets a ball
 * reverse back through a door that is now open (the core mechanic).
 *
 * Returns the number of wall reflections that occurred this step (for SFX
 * counting only — it does not influence physics).
 */
export const step = (ball: Ball, dt: number, ctx: PhysicsContext): number => {
  const a = ctx.gravity;

  if (dt >= 0) {
    ball.vel = add(ball.vel, scale(a, dt));
    ball.pos = add(ball.pos, scale(ball.vel, dt));
  } else {
    // Reverse: move position by the still-current velocity first, then undo
    // the velocity kick. This is the algebraic inverse of the forward branch.
    ball.pos = add(ball.pos, scale(ball.vel, dt));
    ball.vel = add(ball.vel, scale(a, dt));
  }

  return resolveStatic(ball, ctx.solids, dt);
};

/**
 * Depenetrate + elastically reflect the ball off each solid it overlaps. The
 * bounce decision uses the sign of `dt` so that during active reverse (dt < 0),
 * where the ball travels opposite to its velocity, it still reflects when
 * moving positionally into a surface — letting reverse retrace a bounce.
 *
 * Returns the count of *actual* reflections (velocity flipped, not mere
 * depenetration) — mirrors `bounceVelocity`'s own reflect condition.
 */
const resolveStatic = (ball: Ball, solids: AABB[], dt: number): number => {
  const travelSign = dt < 0 ? -1 : 1;
  let reflections = 0;
  for (const box of solids) {
    const contact = circleVsAABB({ pos: ball.pos, radius: ball.radius }, box);
    if (!contact) continue;
    // Push the ball out of the surface, then bounce its velocity. A reflection
    // only happens when the ball is travelling into the surface.
    ball.pos = add(ball.pos, scale(contact.normal, contact.depth));
    if (travelSign * dot(ball.vel, contact.normal) < 0) reflections++;
    ball.vel = bounceVelocity(ball.vel, contact.normal, travelSign);
  }
  return reflections;
};
