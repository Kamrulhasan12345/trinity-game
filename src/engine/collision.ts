import { add, dot, len, normalize, reflect, scale, sub, type Vec2 } from "./vec2.js";

/** Axis-aligned box: (x,y) is top-left corner, w/h extents. */
export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Circle {
  pos: Vec2;
  radius: number;
}

/** Result of a circle collision: the surface normal and penetration depth. */
export interface Contact {
  normal: Vec2; // unit, pointing OUT of the surface toward the circle
  depth: number; // positive overlap distance
}

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** Circle vs AABB. Returns undefined when not overlapping. */
export const circleVsAABB = (c: Circle, b: AABB): Contact | undefined => {
  const cx = clamp(c.pos.x, b.x, b.x + b.w);
  const cy = clamp(c.pos.y, b.y, b.y + b.h);
  const dx = c.pos.x - cx;
  const dy = c.pos.y - cy;
  const distSq = dx * dx + dy * dy;

  if (distSq > c.radius * c.radius) return undefined;

  if (distSq > 1e-12) {
    const dist = Math.sqrt(distSq);
    return { normal: { x: dx / dist, y: dy / dist }, depth: c.radius - dist };
  }
  // Center is inside the box: push out along the least-penetrated axis.
  const left = c.pos.x - b.x;
  const right = b.x + b.w - c.pos.x;
  const top = c.pos.y - b.y;
  const bottom = b.y + b.h - c.pos.y;
  const min = Math.min(left, right, top, bottom);
  let normal: Vec2;
  if (min === left) normal = { x: -1, y: 0 };
  else if (min === right) normal = { x: 1, y: 0 };
  else if (min === top) normal = { x: 0, y: -1 };
  else normal = { x: 0, y: 1 };
  return { normal, depth: c.radius + min };
};

/** Circle vs line segment [a,b] with the segment's own half-thickness 0. */
export const circleVsSegment = (
  c: Circle,
  a: Vec2,
  b: Vec2,
): Contact | undefined => {
  const ab = sub(b, a);
  const t = clamp(dot(sub(c.pos, a), ab) / (dot(ab, ab) || 1), 0, 1);
  const closest = add(a, scale(ab, t));
  const d = sub(c.pos, closest);
  const dist = len(d);
  if (dist > c.radius) return undefined;
  const normal = dist > 1e-9 ? normalize(d) : { x: 0, y: -1 };
  return { normal, depth: c.radius - dist };
};

/** Circle vs circle. Returns undefined when separated. */
export const circleVsCircle = (a: Circle, b: Circle): Contact | undefined => {
  const d = sub(b.pos, a.pos);
  const dist = len(d);
  const r = a.radius + b.radius;
  if (dist > r) return undefined;
  const normal = dist > 1e-9 ? normalize(d) : { x: 1, y: 0 };
  return { normal, depth: r - dist };
};

/**
 * Elastic bounce of a velocity off a static surface (restitution = 1).
 *
 * Reflects only when the ball is positionally travelling INTO the surface, so a
 * ball already separating is left untouched (prevents sticking). `travelSign`
 * is the sign of the timestep: +1 forward (motion follows `vel`), −1 during
 * active reverse (motion is `-vel`). Using it — rather than `vel` alone — is
 * what lets reverse retrace a bounce instead of sticking at the wall.
 */
export const bounceVelocity = (vel: Vec2, normal: Vec2, travelSign = 1): Vec2 => {
  if (travelSign * dot(vel, normal) >= 0) return { x: vel.x, y: vel.y };
  return reflect(vel, normal);
};
