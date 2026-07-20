import { loadProgress } from "../game/progress.js";

/** Callbacks the screens fire; wiring lives in main. */
export interface ScreenCallbacks {
  /** Start a fresh run from the first level. */
  onPlay(): void;
  /** Resume at a saved level index (0-based). */
  onContinue(levelIndex: number): void;
  /** Replay from the first level after the finale. */
  onReplay(): void;
}

/**
 * Thin view controller for the two full-screen DOM overlays — the start menu
 * and the finale — layered over the canvas. Holds no game state; it only shows
 * and hides overlays and forwards button clicks to injected callbacks (mirrors
 * how `Hud` is a pure view). The Continue button is populated from saved
 * progress each time the menu is shown.
 */
export class Screens {
  constructor(
    private readonly menu: HTMLElement,
    private readonly finale: HTMLElement,
    private readonly playBtn: HTMLButtonElement,
    private readonly continueBtn: HTMLButtonElement,
    private readonly replayBtn: HTMLButtonElement,
    cb: ScreenCallbacks,
  ) {
    this.playBtn.addEventListener("click", () => {
      this.hide();
      cb.onPlay();
    });
    this.replayBtn.addEventListener("click", () => {
      this.hide();
      cb.onReplay();
    });
    this.continueBtn.addEventListener("click", () => {
      const level = loadProgress();
      this.hide();
      cb.onContinue(level);
    });
  }

  /** Show the start menu; offer Continue only when there is real progress. */
  showMenu(): void {
    const level = loadProgress();
    if (level > 0) {
      this.continueBtn.textContent = `CONTINUE — LEVEL ${level + 1}`;
      this.continueBtn.style.display = "";
    } else {
      this.continueBtn.style.display = "none";
    }
    this.finale.classList.remove("show");
    this.menu.classList.add("show");
  }

  showFinale(): void {
    this.menu.classList.remove("show");
    this.finale.classList.add("show");
  }

  hide(): void {
    this.menu.classList.remove("show");
    this.finale.classList.remove("show");
  }
}
