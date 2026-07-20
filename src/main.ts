import { Simulation } from "./engine/simulation.js";
import { GameLoop } from "./game/gameLoop.js";
import { InputController } from "./game/input.js";
import { Renderer } from "./render/renderer.js";
import { Clocks } from "./ui/clocks.js";
import { Hud } from "./ui/hud.js";
import { Screens } from "./ui/screens.js";
import { getLevel, levelCount } from "./levels/index.js";
import { Sfx } from "./audio/sfx.js";
import { Reactor } from "./audio/reactor.js";
import { saveProgress } from "./game/progress.js";
import type { Vec2 } from "./engine/vec2.js";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const clocksEl = document.getElementById("clocks")!;
const hud = new Hud(
  document.getElementById("hud-left")!,
  document.getElementById("hud-right")!,
  document.getElementById("hint")!,
  document.getElementById("banner")!,
);

const renderer = new Renderer(ctx, canvas.width, canvas.height);

// Procedural audio. One instance for the session; unlocked on first gesture.
const sfx = new Sfx();
// First user interaction satisfies the browser autoplay gate. `m` toggles mute.
window.addEventListener("pointerdown", () => sfx.unlock(), { once: false });
window.addEventListener("keydown", (e) => {
  sfx.unlock();
  if (e.key.toLowerCase() === "m") sfx.toggleMuted();
});

const screens = new Screens(
  document.getElementById("menu")!,
  document.getElementById("finale")!,
  document.getElementById("menu-play") as HTMLButtonElement,
  document.getElementById("menu-continue") as HTMLButtonElement,
  document.getElementById("finale-replay") as HTMLButtonElement,
  { onPlay: () => boot(0), onContinue: (n) => boot(n), onReplay: () => boot(0) },
);

let current: { input: InputController; loop: GameLoop } | null = null;

/** Stop the running level and clear its debug handle (used before an overlay). */
function teardown() {
  current?.input.dispose();
  current?.loop.stop();
  current = null;
}

/** Tear down the running level (if any) and build the given one. */
function boot(levelIndex: number) {
  teardown();
  screens.hide();

  const level = getLevel(levelIndex);
  const sim = new Simulation(level);
  renderer.reset();
  clocksEl.replaceChildren();
  saveProgress(levelIndex); // reaching a level records it as progress
  const reactor = new Reactor(sfx);

  const hasNext = levelIndex < levelCount() - 1;
  const input = new InputController(
    canvas,
    sim,
    () => boot(levelIndex), // reset current level
    // Advance on win: next level, or the finale after the last one.
    () => (hasNext ? boot(levelIndex + 1) : showFinale()),
  );
  const clocks = new Clocks(clocksEl, sim, input);

  const loop = new GameLoop(sim, () => {
    reactor.observe(sim);
    renderer.draw(sim, input);
    clocks.update(sim, input);
    hud.update(sim, input, { hasNext, muted: sfx.muted });
  });
  loop.start();
  current = { input, loop };

  // Debug/verification handle: drive the game headlessly from console/tests.
  (window as unknown as { __game: unknown }).__game = {
    sim,
    input,
    levelIndex,
    launch: (i: number, v: Vec2) => input.launch(i, v),
    setSpeed: (i: number, s: number) => sim.setTimeSpeed(i, s as never),
    ball: (i: number) => sim.balls[i],
    won: () => sim.won,
  };
}

/** End the run: stop the game and raise the finale/credits overlay. */
function showFinale() {
  teardown();
  screens.showFinale();
}

// Boot flow: `?level=N` (1-based) jumps straight in for dev/tests; otherwise the
// start menu is the front door (Play always begins at level 1).
const levelParam = new URLSearchParams(location.search).get("level");
if (levelParam !== null) {
  const n = Number(levelParam) - 1;
  boot(Number.isFinite(n) && n >= 0 ? Math.min(n, levelCount() - 1) : 0);
} else {
  screens.showMenu();
}
