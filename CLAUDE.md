# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

**Phase 0 scaffold is built and verified.** A playable slice of **Kickoff Trinity** (jam scope, `prd_2.md`) exists on top of a deterministic engine. The two PRDs remain the design spec:

- `prd.md` — **Timeball Trinity**: the full commercial product vision (6 worlds, ~42 levels, level editor, Electron/Switch ports; ~12-week plan).
- `prd_2.md` — **Kickoff Trinity**: the same game re-scoped as a game-jam submission (theme: "Kickoff"). The scaffold follows this scope. It re-skins every action as a "kickoff" (launch = kickoff, rewind-and-replay = re-kickoff, win = ultimate kickoff).

When the PRDs conflict, prefer `prd.md` for *mechanic and technical* detail and `prd_2.md` for *scope*, and surface the divergence rather than silently picking one.

## Commands

- `npm install` — install deps (TypeScript 5, Vite 5, Vitest 2; no runtime deps).
- `npm run dev` — Vite dev server (defaults to port 5173; the game auto-boots).
- `npm test` — run the Vitest suite once. `npm run test:watch` for watch mode.
- `npx vitest run test/physics.test.ts` — run a single test file.
- `npm run typecheck` — `tsc --noEmit`, strict.
- `npm run build` — typecheck then Vite production build to `dist/`.

**Debug/verification handle:** `main.ts` exposes `window.__game` (`launch`, `setSpeed`, `ball`, `sim`, `won`) so the game can be driven headlessly. The Phase 0 end-to-end check drives it via `playwright-core` + the bundled Chromium (the Playwright MCP's `chrome` channel is not installed here) — see the verify script pattern used during scaffolding.

## Technology stack (in use)

- **TypeScript 5** (strict, `noUncheckedIndexedAccess`), **Vite 5**, **Vitest 2**.
- **Rendering:** HTML5 Canvas 2D game world (`src/render/`) + DOM overlay for UI (`src/ui/` clocks + HUD).
- **Physics:** custom deterministic 2D engine (`src/engine/`) — no external physics library.
- **Web Audio + `localStorage`:** procedural SFX (`src/audio/`) and level-progress / mute persistence (`src/game/progress.ts`) are now wired (polish pass).
- **Not yet added (deferred, per PRDs):** Immer state snapshots, ghost replay. Provisioned for but not wired.

## Code map

- `src/engine/` — the sim-authoritative core. `simulation.ts` orchestrates (integrate → ball-ball collisions → record → switches → win); `physics.ts` steps one ball (± dt) vs static geometry; `ballCollision.ts` resolves elastic ball-to-ball impulses (frozen balls store the impulse, immovable in position); `world.ts` + `causality.ts` hold switch/door state and the branch/erase logic; `timeline.ts` is the derived keyframe recording; `collision.ts`, `vec2.ts`, `constants.ts`, `ball.ts` support them.
- `src/game/` — `gameLoop.ts` (fixed-step accumulator), `input.ts` (mouse kickoff + keyboard time controls, Enter/click to advance on win, `dispose()`), `modes.ts`, `progress.ts` (best-effort `localStorage` for furthest level + mute; all try/catch-guarded, degrades to defaults).
- `src/audio/` — `sfx.ts` (procedural Web Audio synth, no assets; kickoff/switchOn/win/collision/bounce cues, `unlock()` for the autoplay gate, mute persisted; inert no-op when Web Audio absent) + `reactor.ts` (per-level state-diff observer that fires SFX **without touching the engine**, called once per render frame). Launch/switch/win are rising edges of sim state; collision/bounce are diffs of the `Simulation.collisionCount`/`bounceCount` counters — fired at most once per frame each (a frame spans many ticks), so rapid impacts don't machine-gun.
- `src/render/` — `renderer.ts` + `trails.ts`.
- `src/ui/` — `clocks.ts` (per-ball analogue clocks), `hud.ts` (grouped control legend + selected-ball speed readout + 🔊/🔇 glyph), `screens.ts` (thin view controller for the start-menu + finale DOM overlays; reads `loadProgress` to offer Continue).
- `src/levels/` — `types.ts` (level JSON schema); `level-1-1.ts` (single-ball intro), `level-2-1.ts` (hold-a-switch), `level-2-2.ts` (collision launch), `level-3-1.ts` (three-ball simultaneity); `index.ts` (ordered campaign, `getLevel`/`levelCount`). `main.ts` is the front door: with no `?level=N` it shows the start menu (Play always begins at level 1; Continue resumes saved progress), boots directly when `?level=N` is given (1-based; the dev/test bypass every verify script relies on), advances between levels on win, raises the finale overlay after the last level, and owns the session-level audio unlock + `m` mute listeners.
- `test/` — engine + module unit tests. Load-bearing: `physics.test.ts`'s forward-then-reverse round-trip + determinism; `ballCollision.test.ts` (elastic swap, frozen stored-impulse); `simulation.test.ts` multi-ball collision + win cases; `reactor.test.ts` (rising-edge cue firing) + `progress.test.ts` (storage round-trip / graceful degradation) cover the polish pass.

## Core architecture (as implemented)

The game is easy to describe and hard to implement correctly because of the timeline model. How the scaffold resolves it:

- **Sim-authoritative timeline (the key decision).** The live fixed-step simulation is the single source of truth. `Simulation` (`src/engine/simulation.ts`) owns all ball pos/vel + world state. Keyframes (`src/engine/timeline.ts`) are a *derived* recording used only for scrub preview and future ghost replay — they never drive live physics. This is what lets a ball reverse back through a door it just opened (verified end-to-end) and avoids the reverse-vs-recording divergence the PRDs leave ambiguous. **Do not make keyframes authoritative.**

- **Deterministic fixed-step physics.** Semi-implicit Euler at a fixed **120 Hz** timestep (render targets 60 FPS via an accumulator in `gameLoop.ts`). `physics.step(ball, dt, ctx)` accepts a *negative* `dt` for active reverse; to keep the round-trip exact, the operation order flips by sign (velocity-then-position forward; position-then-velocity reverse). The load-bearing invariant — forward then reverse returns to origin within float tolerance — is locked by `test/physics.test.ts`. No RNG, no wall-clock input into physics.

- **Independent per-ball clocks.** Each ball has a `localTime` and a `timeSpeed` ∈ {−2, −1, −0.5, 0, 0.5, 1, 2}. Balls advance by `timeSpeed * dt_global`. `timeSpeed = 0` freezes a ball (still collidable). A ball cannot reverse before `localTime = 0` (clamped in `simulation.ts` with a partial step so it lands exactly on the kickoff state).

- **Branching is an explicit control action, not silent.** Keyframes are recorded only when a ball reaches a *new maximum* localTime. Playing forward (`setTimeSpeed` > 0) from behind that tip erases the future: `timeline.truncateAfter` + `world.branch`. This matches the PRD's explicit re-kickoff model.

- **Reversibility & the causal event log.** `causality.ts` logs each switch change with `causingBall` + `causingBallLocalTime`. `world.branch(ball, t)` invalidates that ball's later events, reverts *reversible* switches to their last valid state, then re-evaluates doors and cascades. Non-reversible switches keep their state — the paradox, covered by `test/world.test.ts`.

- **Doors evaluate; switches carry the flags.** Doors have no latching flag: open iff all linked switches active, re-evaluated every tick (`world.evaluateDoors`). Permanence lives in switch `persistent` (stays on after the ball leaves) and `reversible` (can be undone by erasure). This is `prd.md` §4.5.3's *final* "simplify for clarity" model — that section also contains earlier abandoned drafts in prose; ignore those.

- **Ball-to-ball collisions are live-only and resolved in effective (global) space.** `resolveBallCollisions()` visits pairs in fixed `(i<j)` order (determinism) after integration. Because balls run on independent clocks, `ballCollision.ts` resolves the elastic impulse using each ball's *effective* velocity `vel·timeSpeed` (its true speed through space), then converts the result back to local velocity — otherwise ramming with a fast-forwarded ball under-transfers momentum and the struck ball comes out too slow. A frozen ball (`timeSpeed 0`) has zero effective velocity, never moves positionally, but takes the impulse — stored as the velocity it carries when unpaused (resuming at 1×): the "stored-impulse launch" model (see `level-2-2`). Collisions are NOT bit-exact time-reversible (a head-on stop leaves velocity 0, so reverse can't retrace through it) — an accepted consequence; full symmetric/asymmetric collision causality (prd §4.5.4) is deferred. `resolveBallPair` returns whether a real impulse fired and `physics.step` returns its wall-reflection count; `Simulation` accumulates these into `collisionCount`/`bounceCount` purely so the audio reactor can observe impacts — these tallies are derived, never read back into physics, and don't affect the reverse round-trip.

- **Win condition** is *simultaneity*: all matched balls inside their color-matched goals (cyan/magenta/yellow) at the same global instant, checked at end of each physics frame. A level with zero goals never wins (guard against `[].every()` returning true).

- **Levels are data.** Levels are JSON/typed TS objects (see `prd.md` §8.3 for the schema: `walls`, `ballSpawns`, `goals`, `switches` with `persistent`/`reversible`, `doors` with `linkedSwitches`, etc.). This is meant to enable a level editor later.

## What's deferred (structures provisioned, not built)

Per jam scope: Worlds 3–6 content, reversible-object (World 4) puzzles, collision *causality* under branching (symmetric re-sim + asymmetric paradox), moving platforms/bounce pads/conveyors/hazards, timeline scrubbing UI (`A`/`D`), art/audio, level editor, `localStorage` save, ghost replay, and `Math.fround` cross-browser hardening. These slot into the existing interfaces without rearchitecting. **Built through Phase 1:** the deterministic engine, single-ball reverse/branch, switch/door causality, live ball-to-ball collisions, four levels (Worlds 1–3), and win-advance progression.

Known risks from the PRDs still to handle deliberately: **death zones** (irreversible, path-dependent — fights the reversible model), **cross-browser float determinism** (replay sharing may desync; `Math.fround` suggested), and **asymmetric collisions** (highest-UX-risk, thinnest-specified, quarantined to World 6).

## graphify note

The user's global config wires in a `graphify` knowledge-graph workflow that expects `graphify-out/graph.json`. No graph has been built for this repo yet. Now that real source exists under `src/`, running `/graphify .` to build a queryable graph is worthwhile if the codebase grows.
