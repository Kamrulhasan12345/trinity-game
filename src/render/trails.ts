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
    const n = arr.length;
    g.save();
    g.globalCompositeOperation = "lighter"; // additive glow streak
    g.strokeStyle = color;
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let i = 1; i < n; i++) {
      const a = arr[i - 1]!;
      const b = arr[i]!;
      const t = i / n; // 0 = oldest tail, 1 = newest head
      g.globalAlpha = t * t * 0.6; // steeper falloff toward the tail
      g.lineWidth = 0.5 + t * 5; // taper thin tail -> thick head
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    g.restore();
    g.globalAlpha = 1;
  }

  clear(): void {
    this.points.clear();
  }
}
