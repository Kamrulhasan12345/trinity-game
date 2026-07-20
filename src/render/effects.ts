import type { Simulation } from "../engine/simulation.js";
import { BALL_COLORS } from "../game/modes.js";

const SWITCH_GREEN = "#49f08a";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string; grav: number;
}
interface Ring {
  x: number; y: number; r: number; maxR: number;
  life: number; maxLife: number; color: string; width: number;
}

/** Random in [-1, 1). */
const r1 = () => Math.random() * 2 - 1;

/**
 * Purely cosmetic canvas effects layer. It observes the (authoritative) sim each
 * render frame and spawns particles/rings on rising edges — the same event
 * signals the audio Reactor uses — but never writes to the sim and runs on a
 * wall-clock render timer, so determinism is untouched. Additive blending gives
 * the neon "juice" look. Counts are capped for performance.
 */
export class Effects {
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private flash = 0;
  private shakeMag = 0;

  // Event-diff baseline (mirrors the reactor).
  private primed = false;
  private launched = 0;
  private collisions = 0;
  private bounces = 0;
  private switchesOn: boolean[] = [];
  private goalsOccupied: boolean[] = [];
  private won = false;

  constructor(private readonly width: number, private readonly height: number) {}

  reset(): void {
    this.particles = [];
    this.rings = [];
    this.flash = 0;
    this.shakeMag = 0;
    this.primed = false;
    this.switchesOn = [];
    this.goalsOccupied = [];
  }

  /** Diff sim state and spawn effects on rising edges. */
  observe(sim: Simulation): void {
    const launched = sim.balls.reduce((n, b) => n + (b.launched ? 1 : 0), 0);
    const switches = sim.world.switches.map((s) => s.active);
    const goals = sim.goals.map((goal) => occupied(sim, goal));

    if (!this.primed) {
      this.launched = launched;
      this.collisions = sim.collisionCount;
      this.bounces = sim.bounceCount;
      this.switchesOn = switches;
      this.goalsOccupied = goals;
      this.won = sim.won;
      this.primed = true;
      return;
    }

    // Kickoff: whichever launched ball is newest (simple + cheap for <=3 balls).
    if (launched > this.launched) {
      const b = [...sim.balls].reverse().find((x) => x.launched);
      if (b) this.kickoff(b.pos.x, b.pos.y, BALL_COLORS[b.index % BALL_COLORS.length]!);
    }

    if (sim.collisionCount > this.collisions) {
      const p = closestPairMidpoint(sim);
      if (p) this.burst(p.x, p.y, "#ffffff", 16, 190, 0.9, 2.6);
    }

    if (sim.bounceCount > this.bounces) {
      const p = ballNearestWall(sim);
      if (p) this.burst(p.x, p.y, p.color, 5, 90, 0.35, 1.8);
    }

    for (let i = 0; i < switches.length; i++) {
      if (switches[i] && !this.switchesOn[i]) {
        const s = sim.world.switches[i]!.def;
        this.rings.push({ x: s.x, y: s.y, r: s.radius * 0.4, maxR: s.radius * 2.4,
          life: 0.6, maxLife: 0.6, color: SWITCH_GREEN, width: 3 });
      }
    }

    for (let i = 0; i < goals.length; i++) {
      if (goals[i] && !this.goalsOccupied[i]) {
        const goal = sim.goals[i]!;
        const color = BALL_COLORS[goal.ballIndex % BALL_COLORS.length]!;
        this.rings.push({ x: goal.x, y: goal.y, r: goal.radius, maxR: goal.radius * 2.1,
          life: 0.7, maxLife: 0.7, color, width: 4 });
        this.burst(goal.x, goal.y, color, 14, 150, 0.7, 2.4);
      }
    }

    if (sim.won && !this.won) this.win();

    this.launched = launched;
    this.collisions = sim.collisionCount;
    this.bounces = sim.bounceCount;
    this.switchesOn = switches;
    this.goalsOccupied = goals;
    this.won = sim.won;
  }

  /** A radial spark burst plus an expanding ring. */
  private kickoff(x: number, y: number, color: string): void {
    this.burst(x, y, color, 18, 220, 0.55, 2.6);
    this.rings.push({ x, y, r: 8, maxR: 60, life: 0.45, maxLife: 0.45, color, width: 3 });
    this.shakeMag = Math.max(this.shakeMag, 3);
  }

  private win(): void {
    // Confetti raining across the top of the arena, in the three ball colours.
    for (let i = 0; i < 90; i++) {
      const color = BALL_COLORS[i % BALL_COLORS.length]!;
      this.particles.push({
        x: Math.random() * this.width,
        y: -10 - Math.random() * 60,
        vx: r1() * 60,
        vy: 90 + Math.random() * 140,
        life: 1.6 + Math.random() * 0.9,
        maxLife: 2.5,
        size: 2.5 + Math.random() * 3,
        color,
        grav: 120,
      });
    }
    this.flash = 0.5;
    this.shakeMag = Math.max(this.shakeMag, 7);
  }

  private burst(
    x: number, y: number, color: string,
    count: number, speed: number, life: number, size: number,
  ): void {
    if (this.particles.length > 500) return; // hard cap
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.65);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: life * (0.6 + Math.random() * 0.4), maxLife: life,
        size: size * (0.6 + Math.random() * 0.6), color, grav: 0,
      });
    }
  }

  update(dt: number): void {
    const d = Math.min(dt, 0.05); // clamp to avoid huge steps on tab refocus
    for (const p of this.particles) {
      p.x += p.vx * d; p.y += p.vy * d; p.vy += p.grav * d; p.life -= d;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const r of this.rings) {
      r.r = r.r + (r.maxR - r.r) * Math.min(1, d * 8); // ease outward
      r.life -= d;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - d * 1.6);
    if (this.shakeMag > 0) this.shakeMag = Math.max(0, this.shakeMag - d * 22);
  }

  /** Current screen-shake offset (renderer translates the world by this). */
  shakeOffset(): { x: number; y: number } {
    if (this.shakeMag <= 0) return { x: 0, y: 0 };
    return { x: r1() * this.shakeMag, y: r1() * this.shakeMag };
  }

  /** Draw particles + rings (world space, additive). Call inside the shake. */
  drawWorld(g: CanvasRenderingContext2D): void {
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const r of this.rings) {
      g.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.8;
      g.strokeStyle = r.color;
      g.lineWidth = r.width;
      g.beginPath();
      g.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      g.stroke();
    }
    for (const p of this.particles) {
      g.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  /** Full-screen flash overlay (screen space, unshaken). */
  drawOverlay(g: CanvasRenderingContext2D): void {
    if (this.flash <= 0) return;
    g.save();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = this.flash;
    g.fillStyle = "#3a2f5a";
    g.fillRect(0, 0, this.width, this.height);
    g.restore();
  }
}

const occupied = (
  sim: Simulation,
  goal: { ballIndex: number; x: number; y: number; radius: number },
): boolean => {
  const b = sim.balls[goal.ballIndex];
  if (!b || !b.launched) return false;
  const dx = b.pos.x - goal.x;
  const dy = b.pos.y - goal.y;
  return dx * dx + dy * dy <= goal.radius * goal.radius;
};

/** Midpoint of the closest pair of launched balls (spark origin for a hit). */
const closestPairMidpoint = (sim: Simulation): { x: number; y: number } | null => {
  const launched = sim.balls.filter((b) => b.launched);
  let best = Infinity;
  let mid: { x: number; y: number } | null = null;
  for (let i = 0; i < launched.length; i++) {
    for (let j = i + 1; j < launched.length; j++) {
      const a = launched[i]!.pos, b = launched[j]!.pos;
      const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      if (d < best) { best = d; mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    }
  }
  return mid;
};

/** The launched ball closest to any wall, with its colour (bounce origin). */
const ballNearestWall = (
  sim: Simulation,
): { x: number; y: number; color: string } | null => {
  let best = Infinity;
  let out: { x: number; y: number; color: string } | null = null;
  for (const b of sim.balls) {
    if (!b.launched) continue;
    for (const w of sim.world.walls) {
      const cx = Math.max(w.x, Math.min(b.pos.x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(b.pos.y, w.y + w.h));
      const d = (b.pos.x - cx) ** 2 + (b.pos.y - cy) ** 2;
      if (d < best) {
        best = d;
        out = { x: b.pos.x, y: b.pos.y, color: BALL_COLORS[b.index % BALL_COLORS.length]! };
      }
    }
  }
  return out;
};
