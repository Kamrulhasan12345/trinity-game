/** Two top-level control modes (prd §3). */
export type Mode = "shooting" | "time";

/** Ball colours, matched to goals (cyan, magenta, yellow). */
export const BALL_COLORS = ["#39d6ff", "#ff4fd8", "#ffd23f"] as const;

export const speedGlyph = (speed: number): string => {
  if (speed === 0) return "⏸";
  if (speed < 0) return `◄ ${Math.abs(speed)}×`;
  return `► ${speed}×`;
};
