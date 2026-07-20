import type { Simulation } from "../engine/simulation.js";
import type { InputController } from "../game/input.js";
import { BALL_COLORS } from "../game/modes.js";
import { Trails } from "./trails.js";

const BRASS = "#c9a86a";
const BRASS_DIM = "#6b5836";

/** Canvas 2D renderer for the clockwork arena. Pure draw; reads sim state. */
export class Renderer {
  private readonly trails = new Trails();

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly width: number,
    private readonly height: number,
  ) {}

  reset(): void {
    this.trails.clear();
  }

  draw(sim: Simulation, input: InputController): void {
    const g = this.ctx;
    g.clearRect(0, 0, this.width, this.height);
    this.drawGrid();

    // Walls.
    for (const w of sim.world.walls) {
      g.fillStyle = "#241d3f";
      g.fillRect(w.x, w.y, w.w, w.h);
      g.strokeStyle = BRASS_DIM;
      g.lineWidth = 2;
      g.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    }

    // Doors (time gates).
    for (const d of sim.world.doors) {
      const { x, y, w, h } = d.def;
      if (d.open) {
        g.strokeStyle = "rgba(201,168,106,0.35)";
        g.setLineDash([6, 8]);
        g.lineWidth = 2;
        g.strokeRect(x, y, w, h);
        g.setLineDash([]);
      } else {
        g.fillStyle = BRASS;
        g.fillRect(x, y, w, h);
        g.fillStyle = "rgba(0,0,0,0.25)";
        for (let ry = y + 6; ry < y + h - 4; ry += 12) g.fillRect(x + 3, ry, w - 6, 4);
      }
    }

    // Switches (trigger plates).
    for (const s of sim.world.switches) {
      const c = s.active ? "#49f08a" : "#e0556a";
      g.strokeStyle = c;
      g.lineWidth = 3;
      for (const r of [s.def.radius, s.def.radius * 0.6]) {
        g.beginPath();
        g.arc(s.def.x, s.def.y, r, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = c;
      g.globalAlpha = s.active ? 0.35 : 0.12;
      g.beginPath();
      g.arc(s.def.x, s.def.y, s.def.radius * 0.3, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }

    // Goals (clock-face rings, colour-matched to balls).
    for (const goal of sim.goals) {
      const color = BALL_COLORS[goal.ballIndex % BALL_COLORS.length]!;
      const occupied = withinGoal(sim, goal);
      g.strokeStyle = color;
      g.globalAlpha = occupied ? 1 : 0.55;
      g.lineWidth = occupied ? 4 : 2;
      g.beginPath();
      g.arc(goal.x, goal.y, goal.radius, 0, Math.PI * 2);
      g.stroke();
      // Tick marks.
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r0 = goal.radius - 6;
        g.beginPath();
        g.moveTo(goal.x + Math.cos(a) * r0, goal.y + Math.sin(a) * r0);
        g.lineTo(goal.x + Math.cos(a) * goal.radius, goal.y + Math.sin(a) * goal.radius);
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    // Balls + trails.
    for (const ball of sim.balls) {
      if (!ball.launched) continue;
      const color = BALL_COLORS[ball.index % BALL_COLORS.length]!;
      this.trails.push(ball.index, ball.pos);
      this.trails.draw(g, ball.index, color);

      g.save();
      g.shadowColor = color;
      g.shadowBlur = 18;
      g.fillStyle = color;
      g.beginPath();
      g.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
      g.fill();
      g.restore();

      if (input.mode === "time" && input.selected === ball.index) {
        g.strokeStyle = "#ffffff";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(ball.pos.x, ball.pos.y, ball.radius + 5, 0, Math.PI * 2);
        g.stroke();
      }
    }

    // Kickoff cannons + aim line for unlaunched balls.
    const cannon = input.nextCannon();
    if (input.mode === "shooting" && cannon >= 0) {
      const spawn = sim.balls[cannon]!.pos;
      const color = BALL_COLORS[cannon % BALL_COLORS.length]!;
      g.fillStyle = color;
      g.globalAlpha = 0.4;
      g.beginPath();
      g.arc(spawn.x, spawn.y, 10, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      if (input.drag) {
        g.strokeStyle = color;
        g.lineWidth = 2;
        g.setLineDash([4, 6]);
        g.beginPath();
        g.moveTo(input.drag.from.x, input.drag.from.y);
        g.lineTo(input.drag.to.x, input.drag.to.y);
        g.stroke();
        g.setLineDash([]);
      }
    }
  }

  private drawGrid(): void {
    const g = this.ctx;
    g.strokeStyle = "rgba(120,90,190,0.06)";
    g.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, this.height);
      g.stroke();
    }
    for (let y = 0; y < this.height; y += 40) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(this.width, y);
      g.stroke();
    }
  }
}

const withinGoal = (
  sim: Simulation,
  goal: { ballIndex: number; x: number; y: number; radius: number },
): boolean => {
  const b = sim.balls[goal.ballIndex];
  if (!b || !b.launched) return false;
  const dx = b.pos.x - goal.x;
  const dy = b.pos.y - goal.y;
  return dx * dx + dy * dy <= goal.radius * goal.radius;
};
