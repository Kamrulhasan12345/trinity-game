import type { AABB } from "./collision.js";
import { CausalLog } from "./causality.js";
import type { Ball } from "./ball.js";
import type { DoorDef, LevelDef, SwitchDef } from "../levels/types.js";

export interface SwitchState {
  def: SwitchDef;
  active: boolean;
}

export interface DoorState {
  def: DoorDef;
  open: boolean;
}

/**
 * Runtime world state: switches, doors, and the causal log. Doors are never
 * latched — a door is open iff all its linked switches are active, evaluated
 * every tick (prd §4.5.3 resolved model). Permanence lives entirely in switch
 * `persistent` / `reversible` flags.
 */
export class World {
  readonly gravity: { x: number; y: number };
  readonly walls: AABB[];
  readonly switches: SwitchState[];
  readonly doors: DoorState[];
  readonly log = new CausalLog();
  private readonly byId = new Map<string, SwitchState>();

  constructor(level: LevelDef) {
    this.gravity = { ...level.gravity };
    this.walls = level.walls.map((w) => ({ ...w }));
    this.switches = level.switches.map((def) => ({ def, active: false }));
    this.doors = level.doors.map((def) => ({ def, open: false }));
    for (const s of this.switches) this.byId.set(s.def.id, s);
    this.evaluateDoors();
  }

  /** Solid AABBs for physics this tick: walls + every currently-closed door. */
  solids(): AABB[] {
    const out: AABB[] = this.walls.slice();
    for (const d of this.doors) {
      if (!d.open) out.push({ x: d.def.x, y: d.def.y, w: d.def.w, h: d.def.h });
    }
    return out;
  }

  /**
   * Update switches from ball overlaps and log the causal events. Called once
   * per global tick after balls have moved.
   */
  updateSwitches(balls: Ball[], globalTime: number): void {
    for (const s of this.switches) {
      const hitter = balls.find((b) => b.launched && overlapsSwitch(b, s.def));

      if (hitter && !s.active) {
        s.active = true;
        this.log.record({
          globalTime,
          causingBall: hitter.index,
          causingBallLocalTime: hitter.localTime,
          targetId: s.def.id,
          action: "activate",
          newState: true,
        });
      } else if (!hitter && s.active && !s.def.persistent) {
        s.active = false;
        // Momentary release. Attribute to the ball that most recently held it
        // is unnecessary for Phase 0; record as an untracked deactivate.
        this.log.record({
          globalTime,
          causingBall: -1,
          causingBallLocalTime: 0,
          targetId: s.def.id,
          action: "deactivate",
          newState: false,
        });
      }
    }
    this.evaluateDoors();
  }

  /** A door is open exactly when all its linked switches are active. */
  evaluateDoors(): void {
    for (const d of this.doors) {
      d.open = d.def.linkedSwitches.every((id) => this.byId.get(id)?.active === true);
    }
  }

  /**
   * Erase ball `ball`'s future past `branchLocalTime`: invalidate its later
   * causal events, roll back reversible switches to their last valid (or
   * default) state, then re-evaluate doors and cascade. Non-reversible
   * switches keep their state (the paradox).
   */
  branch(ball: number, branchLocalTime: number): void {
    const affected = this.log.invalidateFutureOf(ball, branchLocalTime);
    for (const id of affected) {
      const s = this.byId.get(id);
      if (!s || !s.def.reversible) continue; // non-reversible remembers
      const last = this.log.lastValidState(id);
      s.active = last ?? false; // default state is off
    }
    this.evaluateDoors();
  }
}

const overlapsSwitch = (ball: Ball, def: SwitchDef): boolean => {
  const dx = ball.pos.x - def.x;
  const dy = ball.pos.y - def.y;
  return dx * dx + dy * dy <= (def.radius + ball.radius) * (def.radius + ball.radius);
};
