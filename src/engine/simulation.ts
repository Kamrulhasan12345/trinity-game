import { DT, EPSILON, type TimeSpeed } from "./constants.js";
import { step, type PhysicsContext } from "./physics.js";
import { createBall, type Ball } from "./ball.js";
import { World } from "./world.js";
import { resolveBallPair } from "./ballCollision.js";
import type { LevelDef } from "../levels/types.js";
import type { Vec2 } from "./vec2.js";

/**
 * Authoritative fixed-step simulator. Live ball pos/vel + world state are the
 * single source of truth. Each global tick advances every launched ball by
 * dt_local = timeSpeed * DT (may be negative → active reverse against the
 * current world). Keyframes are recorded only when a ball reaches a NEW
 * maximum localTime; replaying forward from behind that tip erases the future.
 */
export class Simulation {
  readonly balls: Ball[];
  readonly world: World;
  globalTime = 0;
  /** Global pause gate (Space). When true, no ball advances. */
  globalPaused = false;
  won = false;
  /** Monotonic event tallies for SFX (derived; never read back into physics). */
  collisionCount = 0;
  bounceCount = 0;

  constructor(private readonly level: LevelDef) {
    this.balls = level.ballSpawns.map((s, i) => createBall(i, s));
    this.world = new World(level);
  }

  get goals() {
    return this.level.goals;
  }

  get name(): string {
    return this.level.name;
  }

  private ctx(): PhysicsContext {
    return { gravity: this.world.gravity, solids: this.world.solids() };
  }

  /** Kickoff: give a ball its launch velocity and start its clock. */
  launch(index: number, velocity: Vec2): void {
    const ball = this.balls[index];
    if (!ball || ball.launched) return;
    ball.vel = { ...velocity };
    ball.launched = true;
    ball.timeSpeed = 1;
    ball.timeline.record({
      pos: ball.pos,
      vel: ball.vel,
      localTime: ball.localTime,
      globalTime: this.globalTime,
    });
  }

  /**
   * Set a ball's time speed. Playing forward (speed > 0) from a local time
   * behind the recorded tip is a branch: the future is erased and reversible
   * world state rolls back (prd §4.3.3).
   */
  setTimeSpeed(index: number, speed: TimeSpeed): void {
    const ball = this.balls[index];
    if (!ball || !ball.launched) return;
    if (speed > 0 && ball.localTime < ball.timeline.latestLocalTime() - EPSILON) {
      ball.timeline.truncateAfter(ball.localTime);
      this.world.branch(index, ball.localTime);
    }
    ball.timeSpeed = speed;
  }

  setGlobalPaused(paused: boolean): void {
    this.globalPaused = paused;
  }

  /** Advance the whole simulation one fixed global tick. */
  tick(): void {
    if (this.globalPaused || this.won) return;
    this.globalTime += DT;

    const ctx = this.ctx();
    // 1. Integrate each launched, running ball against the static world.
    for (const ball of this.balls) {
      if (!ball.launched || ball.timeSpeed === 0) continue;

      const dtLocal = ball.timeSpeed * DT;
      // Clamp at the kickoff moment: a ball cannot reverse before local time 0.
      // Step by exactly the remaining time so it lands precisely on localTime 0
      // (a plain skip would leave it one tick short of its launch state).
      if (dtLocal < 0 && ball.localTime + dtLocal < 0) {
        if (ball.localTime > 0) this.bounceCount += step(ball, -ball.localTime, ctx);
        ball.localTime = 0;
        ball.timeSpeed = 0;
        continue;
      }

      this.bounceCount += step(ball, dtLocal, ctx);
      ball.localTime += dtLocal;
    }

    // 2. Resolve ball-to-ball collisions (post-integration, deterministic order).
    this.resolveBallCollisions();

    // 3. Record keyframes AFTER collisions, only when extending history to a new
    // maximum local time (so the derived recording reflects post-impact state).
    for (const ball of this.balls) {
      if (!ball.launched) continue;
      if (ball.localTime > ball.timeline.latestLocalTime() + EPSILON) {
        ball.timeline.record({
          pos: ball.pos,
          vel: ball.vel,
          localTime: ball.localTime,
          globalTime: this.globalTime,
        });
      }
    }

    this.world.updateSwitches(this.balls, this.globalTime);
    this.checkWin();
  }

  /**
   * Elastic ball-ball collisions, live each tick. Pairs are visited in a fixed
   * (i<j) order for determinism. A frozen ball (timeSpeed 0) still takes a
   * velocity impulse — stored until the player unpauses it — but is not moved.
   */
  private resolveBallCollisions(): void {
    const n = this.balls.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = this.balls[i]!;
        const b = this.balls[j]!;
        if (!a.launched || !b.launched) continue;
        const ca = { pos: a.pos, vel: a.vel, radius: a.radius, mass: a.mass, timeSpeed: a.timeSpeed };
        const cb = { pos: b.pos, vel: b.vel, radius: b.radius, mass: b.mass, timeSpeed: b.timeSpeed };
        if (resolveBallPair(ca, cb)) this.collisionCount++;
        a.pos = ca.pos; a.vel = ca.vel;
        b.pos = cb.pos; b.vel = cb.vel;
      }
    }
  }

  /** All goals occupied by their matched balls at this same global tick. */
  private checkWin(): void {
    // A level with no goals is never won (guard against [].every() === true).
    if (this.level.goals.length === 0) return;
    const ok = this.level.goals.every((g) => {
      const ball = this.balls[g.ballIndex];
      if (!ball || !ball.launched) return false;
      const dx = ball.pos.x - g.x;
      const dy = ball.pos.y - g.y;
      return dx * dx + dy * dy <= g.radius * g.radius;
    });
    if (ok) this.won = true;
  }

  allLaunched(): boolean {
    return this.balls.every((b) => b.launched);
  }
}
