import { loadMuted, saveMuted } from "../game/progress.js";

/** A play target the reactor can drive — real synth or a test spy. */
export interface Sink {
  kickoff(): void;
  switchOn(): void;
  win(): void;
  collision(): void;
  bounce(): void;
}

type Ctor = new () => AudioContext;

/** Resolve an AudioContext constructor, or null when Web Audio is absent. */
const audioCtor = (): Ctor | null => {
  const w = globalThis as unknown as {
    AudioContext?: Ctor;
    webkitAudioContext?: Ctor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
};

/**
 * Procedural sound effects — no audio assets. Each cue is one or more short
 * oscillator blips shaped by a gain envelope. Construction never throws: when
 * Web Audio is unavailable (tests / old browsers) the instance is inert and
 * every method is a silent no-op. The AudioContext is created lazily and must
 * be unlocked from a user gesture (browser autoplay policy) via `unlock()`.
 */
export class Sfx implements Sink {
  private ctx: AudioContext | null = null;
  private readonly ctor: Ctor | null = audioCtor();
  muted: boolean;

  constructor() {
    this.muted = loadMuted();
  }

  /** True when Web Audio is available in this environment. */
  get available(): boolean {
    return this.ctor !== null;
  }

  /** Resume/create the context after a user gesture. Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctor) return;
    if (!this.ctx) {
      try {
        this.ctx = new this.ctor();
      } catch {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    saveMuted(muted);
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** One shaped oscillator note. `from`/`to` sweep the frequency. */
  private tone(
    from: number,
    to: number,
    start: number,
    dur: number,
    type: OscillatorType,
    peak: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
    // Fast attack, exponential decay — a plucky arcade blip.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private ready(): number | null {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return null;
    return this.ctx.currentTime;
  }

  /** Kickoff: a bright rising blip. */
  kickoff(): void {
    const t = this.ready();
    if (t === null) return;
    this.tone(220, 660, t, 0.14, "triangle", 0.25);
  }

  /** Switch engaged: a crisp high ping. */
  switchOn(): void {
    const t = this.ready();
    if (t === null) return;
    this.tone(880, 1180, t, 0.1, "square", 0.14);
  }

  /** Win: a short three-note brass arpeggio. */
  win(): void {
    const t = this.ready();
    if (t === null) return;
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    notes.forEach((f, i) => this.tone(f, f, t + i * 0.11, 0.24, "sawtooth", 0.2));
  }

  /** Ball-to-ball impact: a low, punchy thud. */
  collision(): void {
    const t = this.ready();
    if (t === null) return;
    this.tone(150, 90, t, 0.12, "triangle", 0.22);
  }

  /** Wall bounce: a very short, quiet high tick (fires often — keep it subtle). */
  bounce(): void {
    const t = this.ready();
    if (t === null) return;
    this.tone(600, 520, t, 0.05, "square", 0.06);
  }
}
