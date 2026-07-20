/**
 * Causal event log. Records every object state change tagged with which ball
 * caused it and that ball's local time. When a ball's future is erased
 * (re-kickoff / branch), events it caused after the branch point are
 * invalidated, and reversible objects roll back (prd §4.5.2).
 */

export type CausalAction = "activate" | "deactivate";

export interface CausalEvent {
  id: number;
  globalTime: number;
  causingBall: number;
  causingBallLocalTime: number;
  targetId: string; // switch id
  action: CausalAction;
  /** Object state AFTER this event (for rollback to last-valid). */
  newState: boolean;
  valid: boolean;
}

export class CausalLog {
  private events: CausalEvent[] = [];
  private nextId = 0;

  record(e: Omit<CausalEvent, "id" | "valid">): CausalEvent {
    const ev: CausalEvent = { ...e, id: this.nextId++, valid: true };
    this.events.push(ev);
    return ev;
  }

  all(): readonly CausalEvent[] {
    return this.events;
  }

  /**
   * Invalidate valid events caused by `ball` with localTime strictly after
   * `branchLocalTime`. Returns the set of target object ids that were touched,
   * so the caller can roll back the reversible ones.
   */
  invalidateFutureOf(ball: number, branchLocalTime: number): Set<string> {
    const affected = new Set<string>();
    for (const ev of this.events) {
      if (
        ev.valid &&
        ev.causingBall === ball &&
        ev.causingBallLocalTime > branchLocalTime
      ) {
        ev.valid = false;
        affected.add(ev.targetId);
      }
    }
    return affected;
  }

  /**
   * Last still-valid state recorded for `targetId`, or undefined if none —
   * meaning the object should return to its default state.
   */
  lastValidState(targetId: string): boolean | undefined {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const ev = this.events[i]!;
      if (ev.valid && ev.targetId === targetId) return ev.newState;
    }
    return undefined;
  }

  clear(): void {
    this.events = [];
    this.nextId = 0;
  }
}
