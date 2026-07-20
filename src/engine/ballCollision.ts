import { circleVsCircle } from "./collision.js";
import { add, dot, scale, sub, type Vec2 } from "./vec2.js";

/** The subset of a Ball that collision resolution needs. */
export interface Collider {
  pos: Vec2;
  /** Velocity in the ball's OWN local time. */
  vel: Vec2;
  radius: number;
  mass: number;
  /** Per-ball time multiplier; 0 = frozen (immovable in position). */
  timeSpeed: number;
}

/**
 * Resolve one elastic (restitution 1) ball-ball collision in place.
 *
 * Balls run on independent clocks, so a ball's true speed *through space* is
 * `vel * timeSpeed`, not `vel`. The collision is therefore resolved in this
 * effective (global-space) velocity — otherwise ramming with a fast-forwarded
 * ball would under-transfer momentum and the struck ball would come out far too
 * slow. Results are converted back to each ball's local velocity afterwards.
 *
 * A frozen ball (timeSpeed 0) has zero effective velocity and never moves
 * positionally, but still receives the impulse — stored as the velocity it will
 * carry when unpaused (i.e. resuming at 1×). Separating or non-overlapping pairs
 * are no-ops, which also prevents re-resolving against a frozen ball each tick.
 *
 * Returns `true` iff a real elastic impulse was applied (a genuine collision),
 * `false` for non-overlapping / separating / depenetration-only — used purely to
 * count collision events for SFX; it does not affect physics.
 */
export const resolveBallPair = (a: Collider, b: Collider): boolean => {
  const contact = circleVsCircle(
    { pos: a.pos, radius: a.radius },
    { pos: b.pos, radius: b.radius },
  );
  if (!contact) return false;
  const n = contact.normal; // unit, from a toward b

  // Effective (global-space) velocities.
  const aEff = scale(a.vel, a.timeSpeed);
  const bEff = scale(b.vel, b.timeSpeed);

  // Skip if already separating (relative effective velocity along n points apart).
  const vrel = dot(sub(bEff, aEff), n);
  if (vrel >= 0) {
    depenetrate(a, b, contact.depth, n);
    return false;
  }

  // Elastic impulse magnitude along the contact normal (global-space momentum).
  const invA = 1 / a.mass;
  const invB = 1 / b.mass;
  const j = (-(1 + 1) * vrel) / (invA + invB);
  const aEff2 = sub(aEff, scale(n, j * invA));
  const bEff2 = add(bEff, scale(n, j * invB));

  // Convert back to local velocity. A frozen ball resumes at 1×, so its stored
  // local velocity equals its effective velocity.
  a.vel = scale(aEff2, 1 / (a.timeSpeed || 1));
  b.vel = scale(bEff2, 1 / (b.timeSpeed || 1));

  depenetrate(a, b, contact.depth, n);
  return true;
};

/** Push the pair apart by `depth`, weighting by positional mobility. */
const depenetrate = (a: Collider, b: Collider, depth: number, n: Vec2): void => {
  const moveA = a.timeSpeed === 0 ? 0 : 1;
  const moveB = b.timeSpeed === 0 ? 0 : 1;
  const total = moveA + moveB;
  if (total === 0) return; // both frozen: nothing moves
  a.pos = sub(a.pos, scale(n, depth * (moveA / total)));
  b.pos = add(b.pos, scale(n, depth * (moveB / total)));
};
