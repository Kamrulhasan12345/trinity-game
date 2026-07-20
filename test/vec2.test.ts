import { describe, it, expect } from "vitest";
import { add, sub, scale, dot, len, normalize, reflect, lerp, vec } from "../src/engine/vec2.js";

describe("vec2", () => {
  it("adds and subtracts", () => {
    expect(add(vec(1, 2), vec(3, 4))).toEqual({ x: 4, y: 6 });
    expect(sub(vec(3, 4), vec(1, 2))).toEqual({ x: 2, y: 2 });
  });

  it("scales and dots", () => {
    expect(scale(vec(2, -3), 2)).toEqual({ x: 4, y: -6 });
    expect(dot(vec(1, 0), vec(0, 1))).toBe(0);
    expect(dot(vec(2, 3), vec(4, 5))).toBe(23);
  });

  it("length and normalize", () => {
    expect(len(vec(3, 4))).toBe(5);
    const n = normalize(vec(3, 4));
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
    expect(normalize(vec(0, 0))).toEqual({ x: 0, y: 0 });
  });

  it("reflect bounces about a normal", () => {
    // ball moving down (+y) hits a floor (normal up, -y) -> moves up
    expect(reflect(vec(0, 5), vec(0, -1))).toEqual({ x: 0, y: -5 });
  });

  it("lerp interpolates", () => {
    expect(lerp(vec(0, 0), vec(10, 20), 0.5)).toEqual({ x: 5, y: 10 });
  });
});
