import { describe, it, expect } from "vitest";
import { Reactor, type Observable } from "../src/audio/reactor.js";
import type { Sink } from "../src/audio/sfx.js";

/** A Sink that counts calls. */
const spy = () => {
  const calls = { kickoff: 0, switchOn: 0, win: 0, collision: 0, bounce: 0 };
  const sink: Sink = {
    kickoff: () => void calls.kickoff++,
    switchOn: () => void calls.switchOn++,
    win: () => void calls.win++,
    collision: () => void calls.collision++,
    bounce: () => void calls.bounce++,
  };
  return { sink, calls };
};

/** Mutable stub matching the Observable slice. */
const stub = (): Observable & {
  balls: { launched: boolean }[];
  world: { switches: { active: boolean }[] };
  won: boolean;
  collisionCount: number;
  bounceCount: number;
} => ({
  balls: [{ launched: false }, { launched: false }],
  world: { switches: [{ active: false }] },
  won: false,
  collisionCount: 0,
  bounceCount: 0,
});

describe("Reactor", () => {
  it("first observe only primes the baseline (no cues on load)", () => {
    const { sink, calls } = spy();
    const sim = stub();
    sim.balls[0]!.launched = true; // spawns already launched
    sim.collisionCount = 5; // pretend history exists on the priming frame
    sim.bounceCount = 9;
    new Reactor(sink).observe(sim);
    expect(calls).toEqual({ kickoff: 0, switchOn: 0, win: 0, collision: 0, bounce: 0 });
  });

  it("fires kickoff when a ball becomes launched", () => {
    const { sink, calls } = spy();
    const sim = stub();
    const r = new Reactor(sink);
    r.observe(sim); // prime
    sim.balls[0]!.launched = true;
    r.observe(sim);
    expect(calls.kickoff).toBe(1);
    r.observe(sim); // steady state — silent
    expect(calls.kickoff).toBe(1);
  });

  it("fires switchOn only on the false→true edge", () => {
    const { sink, calls } = spy();
    const sim = stub();
    const r = new Reactor(sink);
    r.observe(sim);
    sim.world.switches[0]!.active = true;
    r.observe(sim);
    r.observe(sim); // still on — no repeat
    expect(calls.switchOn).toBe(1);
    // Releasing then re-pressing fires again.
    sim.world.switches[0]!.active = false;
    r.observe(sim);
    sim.world.switches[0]!.active = true;
    r.observe(sim);
    expect(calls.switchOn).toBe(2);
  });

  it("fires win once when the level is won", () => {
    const { sink, calls } = spy();
    const sim = stub();
    const r = new Reactor(sink);
    r.observe(sim);
    sim.won = true;
    r.observe(sim);
    r.observe(sim);
    expect(calls.win).toBe(1);
  });

  it("fires collision once per frame the tally grows, regardless of jump size", () => {
    const { sink, calls } = spy();
    const sim = stub();
    const r = new Reactor(sink);
    r.observe(sim); // prime
    sim.collisionCount += 3; // several collisions in one render frame
    r.observe(sim);
    expect(calls.collision).toBe(1); // one sound, not three
    r.observe(sim); // no growth — silent
    expect(calls.collision).toBe(1);
    sim.collisionCount += 1;
    r.observe(sim);
    expect(calls.collision).toBe(2);
  });

  it("fires bounce when the bounce tally grows", () => {
    const { sink, calls } = spy();
    const sim = stub();
    const r = new Reactor(sink);
    r.observe(sim);
    sim.bounceCount += 2;
    r.observe(sim);
    expect(calls.bounce).toBe(1);
    r.observe(sim);
    expect(calls.bounce).toBe(1);
  });

  it("does not fire win when a level spawns already won", () => {
    const { sink, calls } = spy();
    const sim = stub();
    sim.won = true;
    const r = new Reactor(sink);
    r.observe(sim); // prime with won already true
    r.observe(sim);
    expect(calls.win).toBe(0);
  });
});
