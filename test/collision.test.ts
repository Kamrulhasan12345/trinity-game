import { describe, it, expect } from "vitest";
import {
  circleVsAABB,
  circleVsCircle,
  circleVsSegment,
  bounceVelocity,
} from "../src/engine/collision.js";

describe("collision", () => {
  const box = { x: 0, y: 0, w: 100, h: 20 };

  it("circle vs AABB detects overlap and separation", () => {
    expect(circleVsAABB({ pos: { x: 50, y: -5 }, radius: 10 }, box)).toBeDefined();
    expect(circleVsAABB({ pos: { x: 50, y: -30 }, radius: 10 }, box)).toBeUndefined();
  });

  it("circle vs AABB normal points out of the top face", () => {
    const c = circleVsAABB({ pos: { x: 50, y: -5 }, radius: 10 }, box)!;
    expect(c.normal.x).toBeCloseTo(0);
    expect(c.normal.y).toBeCloseTo(-1);
    expect(c.depth).toBeCloseTo(5);
  });

  it("circle vs circle overlap + normal", () => {
    const c = circleVsCircle(
      { pos: { x: 0, y: 0 }, radius: 10 },
      { pos: { x: 15, y: 0 }, radius: 10 },
    )!;
    expect(c.depth).toBeCloseTo(5);
    expect(c.normal.x).toBeCloseTo(1);
    expect(circleVsCircle(
      { pos: { x: 0, y: 0 }, radius: 10 },
      { pos: { x: 30, y: 0 }, radius: 10 },
    )).toBeUndefined();
  });

  it("circle vs segment", () => {
    expect(
      circleVsSegment({ pos: { x: 5, y: 5 }, radius: 6 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    ).toBeDefined();
    expect(
      circleVsSegment({ pos: { x: 5, y: 20 }, radius: 6 }, { x: 0, y: 0 }, { x: 10, y: 0 }),
    ).toBeUndefined();
  });

  it("bounceVelocity only reflects motion INTO the surface", () => {
    // moving into floor (down), normal up -> reflected up
    expect(bounceVelocity({ x: 1, y: 5 }, { x: 0, y: -1 })).toEqual({ x: 1, y: -5 });
    // already separating (moving up) -> untouched, no sticking
    expect(bounceVelocity({ x: 1, y: -5 }, { x: 0, y: -1 })).toEqual({ x: 1, y: -5 });
  });
});
