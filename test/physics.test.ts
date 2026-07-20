import { describe, it, expect } from "vitest";
import { step, type PhysicsContext } from "../src/engine/physics.js";
import { createBall } from "../src/engine/ball.js";
import { DT } from "../src/engine/constants.js";
import { vec } from "../src/engine/vec2.js";

const freeFall: PhysicsContext = { gravity: vec(0, 800), solids: [] };

describe("physics.step", () => {
  it("forward then reverse returns to origin (the core invariant)", () => {
    const ball = createBall(0, vec(100, 100));
    ball.vel = vec(50, -30);
    ball.launched = true;
    const x0 = { ...ball.pos };
    const v0 = { ...ball.vel };

    // Simulate 600 forward ticks then 600 reverse ticks.
    for (let i = 0; i < 600; i++) step(ball, DT, freeFall);
    for (let i = 0; i < 600; i++) step(ball, -DT, freeFall);

    expect(ball.pos.x).toBeCloseTo(x0.x, 6);
    expect(ball.pos.y).toBeCloseTo(x0.y, 6);
    expect(ball.vel.x).toBeCloseTo(v0.x, 6);
    expect(ball.vel.y).toBeCloseTo(v0.y, 6);
  });

  it("is deterministic: identical inputs produce identical trajectories", () => {
    const run = () => {
      const b = createBall(0, vec(0, 0));
      b.vel = vec(120, -200);
      b.launched = true;
      const path: number[] = [];
      for (let i = 0; i < 300; i++) {
        step(b, DT, freeFall);
        path.push(b.pos.x, b.pos.y);
      }
      return path;
    };
    expect(run()).toEqual(run());
  });

  it("gravity accelerates a dropped ball downward", () => {
    const ball = createBall(0, vec(0, 0));
    ball.launched = true;
    for (let i = 0; i < 120; i++) step(ball, DT, freeFall); // ~1 second
    expect(ball.vel.y).toBeCloseTo(800, 3);
    expect(ball.pos.y).toBeGreaterThan(390); // ~0.5*g*t^2 ≈ 403
  });

  it("reverse retraces through a wall bounce (does not stick)", () => {
    // Zero gravity, a vertical wall. Ball flies right, bounces, returns; then
    // reversing the same number of steps must retrace back to the origin.
    // Regression: reverse used to stick at the wall because the bounce test
    // used velocity direction instead of positional travel direction.
    const wall = { x: 200, y: 0, w: 20, h: 400 };
    const ctx: PhysicsContext = { gravity: vec(0, 0), solids: [wall] };
    const ball = createBall(0, vec(100, 100));
    ball.vel = vec(240, 0);
    ball.launched = true;

    const N = 80;
    for (let i = 0; i < N; i++) step(ball, DT, ctx);
    expect(ball.vel.x).toBeLessThan(0); // bounced, now heading back
    for (let i = 0; i < N; i++) step(ball, -DT, ctx);

    expect(ball.pos.x).toBeCloseTo(100, 3);
    expect(ball.vel.x).toBeCloseTo(240, 3);
  });

  it("bounces elastically off a solid floor (restitution 1)", () => {
    const floor = { x: -100, y: 100, w: 400, h: 20 };
    const ctx: PhysicsContext = { gravity: vec(0, 0), solids: [floor] };
    const ball = createBall(0, vec(0, 80));
    ball.vel = vec(0, 200); // moving down toward floor at y=100
    ball.launched = true;
    for (let i = 0; i < 60; i++) step(ball, DT, ctx);
    // After bouncing with no gravity, it should be heading back up.
    expect(ball.vel.y).toBeLessThan(0);
    expect(Math.abs(ball.vel.y)).toBeCloseTo(200, 1);
  });
});
