import { describe, it, expect } from "vitest";
import { resolveBallPair, type Collider } from "../src/engine/ballCollision.js";
import { vec } from "../src/engine/vec2.js";

const mk = (
  x: number,
  y: number,
  vx: number,
  vy: number,
  timeSpeed = 1,
): Collider => ({ pos: vec(x, y), vel: vec(vx, vy), radius: 12, mass: 1, timeSpeed });

describe("resolveBallPair", () => {
  it("head-on equal masses swap velocity (elastic, restitution 1)", () => {
    const a = mk(0, 0, 100, 0);
    const b = mk(18, 0, 0, 0); // overlapping (dist 18 < 24)
    const hit = resolveBallPair(a, b);
    expect(hit).toBe(true); // a real impulse was applied
    expect(a.vel.x).toBeCloseTo(0);
    expect(b.vel.x).toBeCloseTo(100);
  });

  it("returns false when there is no impulse (separating / not overlapping)", () => {
    const separating = resolveBallPair(mk(0, 0, -100, 0), mk(18, 0, 0, 0));
    expect(separating).toBe(false);
    const apart = resolveBallPair(mk(0, 0, 100, 0), mk(40, 0, 0, 0));
    expect(apart).toBe(false);
  });

  it("conserves total momentum", () => {
    const a = mk(0, 0, 80, 20);
    const b = mk(16, 6, -10, 0);
    const p0 = a.vel.x + b.vel.x;
    const q0 = a.vel.y + b.vel.y;
    resolveBallPair(a, b);
    expect(a.vel.x + b.vel.x).toBeCloseTo(p0);
    expect(a.vel.y + b.vel.y).toBeCloseTo(q0);
  });

  it("does nothing when the pair is already separating", () => {
    const a = mk(0, 0, -100, 0); // moving away from b
    const b = mk(18, 0, 0, 0);
    resolveBallPair(a, b);
    expect(a.vel.x).toBeCloseTo(-100);
    expect(b.vel.x).toBeCloseTo(0);
  });

  it("does nothing when the pair is not overlapping", () => {
    const a = mk(0, 0, 100, 0);
    const b = mk(40, 0, 0, 0); // dist 40 > 24
    resolveBallPair(a, b);
    expect(a.vel.x).toBeCloseTo(100);
    expect(b.vel.x).toBeCloseTo(0);
  });

  it("a frozen struck ball takes stored velocity but does NOT move positionally", () => {
    const a = mk(0, 0, 100, 0);
    const b = mk(18, 0, 0, 0, 0); // frozen target (timeSpeed 0)
    const bx = b.pos.x;
    resolveBallPair(a, b);
    expect(b.vel.x).toBeCloseTo(100); // impulse stored
    expect(b.pos.x).toBeCloseTo(bx); // immovable position
    expect(a.pos.x).toBeLessThan(0); // only the mover is depenetrated
  });

  it("resolves in effective space: a fast-forwarded striker transfers its true speed", () => {
    // A moves at local 100 but at 2× — an effective 200 through space. Head-on
    // into a resting ball, the struck ball should leave at an effective 200
    // (local 200 at 1×), not the local 100 a naive resolver would give.
    const a = mk(0, 0, 100, 0, 2);
    const b = mk(18, 0, 0, 0, 1);
    resolveBallPair(a, b);
    expect(b.vel.x).toBeCloseTo(200); // effective speed transferred, not local 100
    expect(a.vel.x).toBeCloseTo(0); // striker stops in effective space
  });

  it("separates overlapping moving balls so they no longer overlap", () => {
    const a = mk(0, 0, 60, 0);
    const b = mk(16, 0, -60, 0);
    resolveBallPair(a, b);
    const dx = b.pos.x - a.pos.x;
    const dy = b.pos.y - a.pos.y;
    expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(24 - 1e-6);
  });
});
