import { describe, it, expect } from "vitest";
import { Timeline } from "../src/engine/timeline.js";
import { vec } from "../src/engine/vec2.js";

const kf = (t: number, x: number) => ({
  pos: vec(x, 0),
  vel: vec(1, 0),
  localTime: t,
  globalTime: t,
});

describe("Timeline", () => {
  it("records and reports latest local time", () => {
    const tl = new Timeline();
    tl.record(kf(0, 0));
    tl.record(kf(1, 10));
    expect(tl.length).toBe(2);
    expect(tl.latestLocalTime()).toBe(1);
  });

  it("samples a ghost position by lerping between keyframes", () => {
    const tl = new Timeline();
    tl.record(kf(0, 0));
    tl.record(kf(2, 20));
    expect(tl.sampleAt(1)!.x).toBeCloseTo(10);
    // clamps outside recorded range
    expect(tl.sampleAt(-5)!.x).toBeCloseTo(0);
    expect(tl.sampleAt(99)!.x).toBeCloseTo(20);
  });

  it("truncateAfter drops the erased future, keeps the branch frame", () => {
    const tl = new Timeline();
    for (let t = 0; t <= 5; t++) tl.record(kf(t, t * 10));
    const dropped = tl.truncateAfter(2);
    expect(dropped).toBe(3); // t=3,4,5 removed
    expect(tl.latestLocalTime()).toBe(2);
  });
});
