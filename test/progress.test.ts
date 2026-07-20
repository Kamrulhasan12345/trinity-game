import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadProgress,
  saveProgress,
  loadMuted,
  saveMuted,
} from "../src/game/progress.js";

/** Minimal in-memory localStorage stand-in. */
const mockStorage = (): Storage => {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, v),
  };
};

const g = globalThis as unknown as { localStorage?: Storage };

describe("progress persistence", () => {
  afterEach(() => {
    delete g.localStorage;
  });

  describe("with storage available", () => {
    beforeEach(() => {
      g.localStorage = mockStorage();
    });

    it("defaults to level 0 before anything is saved", () => {
      expect(loadProgress()).toBe(0);
    });

    it("round-trips the saved level index", () => {
      saveProgress(3);
      expect(loadProgress()).toBe(3);
    });

    it("is monotonic — a lower save never lowers the record", () => {
      saveProgress(4);
      saveProgress(1);
      expect(loadProgress()).toBe(4);
    });

    it("ignores negative or non-finite indices", () => {
      saveProgress(2);
      saveProgress(-1);
      saveProgress(Number.NaN);
      expect(loadProgress()).toBe(2);
    });

    it("round-trips the mute flag (default false)", () => {
      expect(loadMuted()).toBe(false);
      saveMuted(true);
      expect(loadMuted()).toBe(true);
      saveMuted(false);
      expect(loadMuted()).toBe(false);
    });
  });

  describe("without storage (node / blocked)", () => {
    it("loadProgress defaults to 0 and saves are no-ops", () => {
      expect(g.localStorage).toBeUndefined();
      expect(loadProgress()).toBe(0);
      expect(() => saveProgress(5)).not.toThrow();
      expect(loadProgress()).toBe(0);
    });

    it("mute helpers default false and do not throw", () => {
      expect(loadMuted()).toBe(false);
      expect(() => saveMuted(true)).not.toThrow();
    });
  });

  describe("when storage access throws", () => {
    beforeEach(() => {
      Object.defineProperty(g, "localStorage", {
        configurable: true,
        get() {
          throw new Error("blocked");
        },
      });
    });
    afterEach(() => {
      delete g.localStorage;
    });

    it("degrades to defaults instead of propagating", () => {
      expect(loadProgress()).toBe(0);
      expect(() => saveProgress(3)).not.toThrow();
      expect(loadMuted()).toBe(false);
    });
  });
});
