import { MAX_KEYFRAMES } from "./constants.js";
import { clone, lerp, type Vec2 } from "./vec2.js";

/** One recorded moment of a ball. Recording is DERIVED, never authoritative. */
export interface Keyframe {
  pos: Vec2;
  vel: Vec2;
  localTime: number;
  globalTime: number;
}

/**
 * Append-only recording of a ball's states, capped at MAX_KEYFRAMES.
 *
 * Used only for: (1) scrub preview — lerp a ghost between keyframes with no
 * physics and no world change; (2) future ghost-replay sharing. Committing a
 * scrub / re-kickoff truncates every keyframe after the branch point so the
 * recording never contradicts the (now erased) future.
 */
export class Timeline {
  private frames: Keyframe[] = [];

  get length(): number {
    return this.frames.length;
  }

  /** Records are stored newest-last. Oldest is dropped once capped. */
  record(kf: Keyframe): void {
    this.frames.push({
      pos: clone(kf.pos),
      vel: clone(kf.vel),
      localTime: kf.localTime,
      globalTime: kf.globalTime,
    });
    if (this.frames.length > MAX_KEYFRAMES) this.frames.shift();
  }

  latest(): Keyframe | undefined {
    return this.frames[this.frames.length - 1];
  }

  earliestLocalTime(): number {
    return this.frames[0]?.localTime ?? 0;
  }

  latestLocalTime(): number {
    return this.latest()?.localTime ?? 0;
  }

  /**
   * Ghost position for a scrub playhead at `localTime`, lerped between the two
   * nearest keyframes. Clamps to the recorded range. No side effects.
   */
  sampleAt(localTime: number): Vec2 | undefined {
    const n = this.frames.length;
    if (n === 0) return undefined;
    if (localTime <= this.frames[0]!.localTime) return clone(this.frames[0]!.pos);
    const last = this.frames[n - 1]!;
    if (localTime >= last.localTime) return clone(last.pos);

    // Linear scan is fine for scrub preview (paused, once per drag frame).
    for (let i = 1; i < n; i++) {
      const b = this.frames[i]!;
      if (b.localTime >= localTime) {
        const a = this.frames[i - 1]!;
        const span = b.localTime - a.localTime;
        const t = span <= 0 ? 0 : (localTime - a.localTime) / span;
        return lerp(a.pos, b.pos, t);
      }
    }
    return clone(last.pos);
  }

  /**
   * Discard every keyframe strictly after `localTime` (branch/erase). Keeps the
   * frame at exactly localTime if present. Returns the number dropped.
   */
  truncateAfter(localTime: number): number {
    const before = this.frames.length;
    this.frames = this.frames.filter((f) => f.localTime <= localTime);
    return before - this.frames.length;
  }

  clear(): void {
    this.frames = [];
  }
}
