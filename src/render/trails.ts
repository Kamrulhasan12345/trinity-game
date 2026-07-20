import type { Vec2 } from "../engine/vec2.js";

const MAX_TRAIL = 48;

/** Short fading position trail per ball, kept in view-space (not simulation). */
export class Trails {
  private points = new Map<number, Vec2[]>();

  push(index: number, pos: Vec2): void {
    let arr = this.points.get(index);
    if (!arr) {
      arr = [];
      this.points.set(index, arr);
    }
    const last = arr[arr.length - 1];
    if (last && Math.abs(last.x - pos.x) < 0.5 && Math.abs(last.y - pos.y) < 0.5) return;
    arr.push({ x: pos.x, y: pos.y });
    if (arr.length > MAX_TRAIL) arr.shift();
  }

  draw(g: CanvasRenderingContext2D, index: number, color: string): void {
    const arr = this.points.get(index);
    if (!arr || arr.length < 2) return;
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i - 1]!;
      const b = arr[i]!;
      g.globalAlpha = (i / arr.length) * 0.5;
      g.strokeStyle = color;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  clear(): void {
    this.points.clear();
  }
}
