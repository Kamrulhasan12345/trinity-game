# Timeball Trinity

## Full Product Requirements Document

**A 2D Web-Based Time-Manipulation Puzzle Game**

---

### Table of Contents

1. [Executive Summary](#executive-summary)
2. [Game Overview](#game-overview)
3. [Core Gameplay Loop](#core-gameplay-loop)
4. [Detailed Mechanics](#detailed-mechanics)
   - [4.1 Shooting Phase](#41-shooting-phase)
   - [4.2 Ball Physics](#42-ball-physics)
   - [4.3 Time Manipulation System](#43-time-manipulation-system)
   - [4.4 World State & Objects](#44-world-state--objects)
   - [4.5 Reversibility & Causality](#45-reversibility--causality)
   - [4.6 Ball-to-Ball Interactions](#46-ball-to-ball-interactions)
   - [4.7 Win Condition](#47-win-condition)
5. [Controls & User Interface](#controls--user-interface)
6. [Level Design & Progression](#level-design--progression)
7. [Art & Audio Direction](#art--audio-direction)
8. [Technical Requirements](#technical-requirements)
9. [Development Milestones](#development-milestones)
10. [Open Questions & Risks](#open-questions--risks)

---

## 1. Executive Summary

_Timeball Trinity_ is a single‑player 2D physics puzzle game where the player shoots three coloured balls into a level and then independently controls each ball’s flow of time—pausing, rewinding, and fast‑forwarding—to solve intricate spatial puzzles. The game’s central fantasy is that of a **time conductor**, orchestrating a ballet of paradoxes where cause no longer precedes effect. By actively driving balls backwards through altered environments, erasing unwanted futures, and choosing which objects remember deleted events, the player bends the rules of causality to guide all three balls to their goals simultaneously.

The game is built for the browser using a custom deterministic physics engine and a TypeScript + Canvas 2D stack, enabling precise timeline branching and frame‑perfect replay without requiring any installation.

---

## 2. Game Overview

### 2.1 High Concept

**Three balls. Three clocks. Infinite timeline trickery.**  
Aim, shoot, then control time for each ball individually. Rewind a ball through the door it just opened, freeze another mid‑air to use as a stepping stone, and erase a future where you failed. Solve puzzles by rewriting history—one ball at a time.

### 2.2 Target Audience

- Puzzle game enthusiasts who enjoy _Braid_, _The Talos Principle_, _Portal_, and _Recur_.
- Players who love “aha!” moments born from non‑linear time mechanics.
- Age rating: Everyone (E), with accessibility options.

### 2.3 Platform & Business Model

- **Primary:** Web (desktop & mobile browsers) – played directly via URL.
- **Secondary (future):** Standalone desktop via Electron, Nintendo Switch.
- **Monetization:** Premium single purchase (or free demo with full unlock), no ads, no microtransactions.

### 2.4 Unique Selling Points

- **Independent per‑ball time control:** Each ball has its own timeline and speed multiplier; combine forward, reverse, pause, and slow‑motion simultaneously.
- **Active reverse driving:** Rewinding is not a passive replay; it is a live physics simulation where the ball can interact with the current (possibly altered) environment. The player literally drives the ball backwards.
- **Timeline branching & causality:** Erasing a ball’s future can revert “reversible” objects, while “non‑reversible” objects stubbornly remember their state, enabling paradox puzzles.
- **Ball‑to‑ball collisions across time:** Balls moving at different time speeds can collide, creating emergent solutions that defy normal chronology.

---

## 3. Core Gameplay Loop

1. **Plan & Shoot**  
   The player aims and launches three balls one after another from fixed spawn cannons. Each launch uses a drag‑and‑release slingshot mechanic with a power gauge.

2. **Observe & Intervene**  
   Once the balls are in motion, time runs globally. The player watches the deterministic physics unfold: balls roll, bounce, hit switches, and open doors.

3. **Manipulate Time**  
   At any moment, the player can independently change any ball’s time speed:
   - **Forward** (1×, 0.5×, 2×) – normal/slow/fast forward.
   - **Pause** (0×) – ball freezes in place.
   - **Reverse** (–1×, –0.5×, –2×) – ball moves backwards, actively steered, obeying physics in the current world state.

4. **Rewrite History**  
   If the player rewinds a ball past a key moment and then plays it forward again, the original future beyond that point is **erased**. The world reacts accordingly: reversible objects linked to that ball’s actions may revert, while non‑reversible objects keep their state.

5. **Reach the Goals**  
   The level contains three coloured goal portals (cyan, magenta, yellow). The player must have all three balls inside their respective goals **at the same global moment**. When this happens, the level is complete.

---

## 4. Detailed Mechanics

### 4.1 Shooting Phase

- The level begins in **Shooting Mode**. Time is paused globally.
- Ball spawn points are clearly marked. The player must launch Ball 1, then Ball 2, then Ball 3.
- **Control:** Drag from the spawn point to set angle and power (power is proportional to drag distance). Releasing launches the ball.
- Balls can be launched with an initial velocity in any direction (not just gravity‑affected arcs; some puzzles feature zero‑gravity or upward launches).
- Once all three balls are launched, the game transitions to **Time Manipulation Mode**.

### 4.2 Ball Physics

All physics are **deterministic**—given the same initial state and environment, a ball’s trajectory will be identical every time. This is essential for rewind accuracy.

- **Physics model:** Rigid body with mass, velocity, and position. Constant gravity (adjustable per level), no angular momentum (balls are treated as point masses for simplicity, though they have a visual radius for collision).
- **Collision detection:**
  - Ball vs static geometry: circle‑to‑AABB and circle‑to‑line‑segment.
  - Ball vs ball: circle‑circle.
- **Collision response:** Perfectly elastic collisions by default (restitution = 1.0) to make puzzles clean and reversible. Some special surfaces (bounce pads) can override.
- **Integration:** Semi‑implicit Euler with a fixed physics timestep of **120 Hz** (dt = 1/120 s).
  - Forward step:

    ```
    v(t+dt) = v(t) + a(t)*dt
    x(t+dt) = x(t) + v(t+dt)*dt
    ```

  - Reverse step (used during active reverse simulation):

    ```
    x(t-dt) = x(t) - v(t)*dt
    v(t-dt) = v(t) - a(t-dt)*dt   // acceleration recalculated at new position
    ```

    This ensures that a forward step followed by an identical reverse step returns the ball to its original state (floating‑point tolerance).
- **Determinism guarantees:** Collision pairs are processed in a fixed, sorted order. No external inputs (time, RNG) influence physics. All numbers are 64‑bit floats (native JS `number`).

### 4.3 Time Manipulation System

#### 4.3.1 Independent Clocks

Each ball has a local time variable `localTime`, which advances at a rate `timeSpeed * Δt_global`.  
`timeSpeed` can be any of: –2, –1, –0.5, 0, 0.5, 1, 2.

- When `timeSpeed != 0`, the ball’s physics are stepped using `dt_local = timeSpeed * dt_global`.  
  If `dt_local` is positive, the ball moves forward; if negative, it moves in reverse, **actively simulating physics backwards** in the current environment.

- When `timeSpeed == 0`, the ball is frozen; it does not move and does not participate in collisions (it can still be hit by other balls—see §4.6).

#### 4.3.2 Active Reverse (not mere playback)

Reverse is **not** a replay of recorded positions. It is a full physics simulation with a negative time step, meaning:

- The ball genuinely moves backwards through the current world.
- It can pass through doors that are now open (even if they were closed when it originally passed that spot).
- It can collide with other balls and static geometry while moving backwards.
- The player is effectively “driving” the ball in reverse.

This is what enables the core paradox: rewinding a ball through a door that it itself opened.

#### 4.3.3 Timeline Recording & Scrubbing

Even though reverse is simulated, the game also **records** each ball’s trajectory as a series of keyframes (position, velocity, timestamp) at every physics tick. This recorded data serves three purposes:

1. **Scrubbing (visual preview):** While global time is paused, the player can drag a ball’s playhead along its timeline. The ball’s ghost smoothly interpolates (lerps) between the two nearest keyframes, showing where the ball has been or would go if re‑simulated from that point. Scrubbing does not alter the world.
2. **Ghost replays:** After completing a level, the player can share their solution as a sequence of keyframes.
3. **Fallback for re‑winding into the unknown:** When the player scrubs to a past time and then commits (“set local time to here”), the ball’s future beyond that point is **deleted**. The active timeline’s keyframes beyond the scrub point are discarded.

**Scrubbing vs active reverse:**

- Scrubbing: drag a slider, see a ghost, no physics happen, the world doesn’t change.
- Active reverse: set speed to –1×, the ball moves backwards and interacts with everything, the world state may change (switches triggered, etc.), and the original future is only erased when the player later plays forward again from a past point, explicitly branching.

#### 4.3.4 Timeline Branching (Erasing the Future)

When the player scrubs to a past point and then sets the ball to **Play Forward**, or when they reverse the ball past a key moment and then reverse direction, the original future from that point onward is **deleted**. This is the act of “creating a new branch.”

- All events caused by the ball in the deleted future are evaluated (see §4.5).
- Reversible objects that were changed by those events revert. Non‑reversible objects remain.
- The ball’s local time is now set to the branch point, and it begins a new forward simulation in the (possibly altered) world.

---

### 4.4 World State & Objects

#### 4.4.1 Switches

- **Trigger:** Activated when any ball’s center overlaps its trigger zone (AABB or circle).
- **Latching behavior:** Once activated, a switch normally stays on _unless_ it is marked **reversible** and the causal event that activated it gets erased (see §4.5).
- Visual: red when off, green when on.

#### 4.4.2 Doors

- **State:** Closed (solid AABB) or Open (no collision).
- **Linkage:** A door opens when **all** switches linked to it are activated.
- A door can also be marked **reversible**; if so, it will close again when the conditions that opened it are reverted. Non‑reversible doors stay open forever once opened.

#### 4.4.3 Moving Platforms

- Traverse a fixed path (waypoints) driven by global time.
- Affect balls via contact (the ball moves with the platform).
- Are always **non‑reversible** (their motion is part of the fixed environment).

#### 4.4.4 Bounce Pads & Conveyors

- Bounce pad: on contact, imparts a fixed velocity impulse to the ball (overrides normal collision).
- Conveyor belt: a zone that applies a constant horizontal velocity to any ball inside it.
- Both operate on global time and are inherently non‑reversible.

#### 4.4.5 One‑Way Gates & Glass Walls

- One‑way gate: allows balls to pass only in a specific direction (e.g., left‑to‑right). If a ball approaches from the wrong side, it collides.
- Glass wall: destroyed when hit by a ball with speed above a threshold. Destruction is permanent and non‑reversible (unless specifically marked reversible for a puzzle).

#### 4.4.6 Death Zones & Hazards

- Touching a death zone (spikes, acid) instantly **resets** the ball: it returns to its spawn point and its timeline is **not** erased—rather, it continues from that new position in global time, but the player cannot rewind before the reset (the recording is cleared from the point of death forward). This forces a fresh attempt for that ball.

---

### 4.5 Reversibility & Causality

This is the heart of the puzzle design: choosing which objects remember deleted events.

#### 4.5.1 The `reversible` Property

Every interactive object can be flagged as **reversible** or **non‑reversible** in the level data.

- **Non‑reversible (default for most objects):** Once its state changes (switch activated, door opened), that change is permanent for the remainder of the level, regardless of any timeline rewrites. The object is effectively “outside” the ball’s timeline.
- **Reversible:** Its state is tied to the causal chain of the ball that changed it. If the ball’s future that contained the triggering action is deleted, the object reverts to its previous state.

#### 4.5.2 Causal Event Log

The game maintains a global log of cause‑and‑effect:

```
Event {
  id: number;
  globalTime: number;
  causingBall: number;          // which ball (0,1,2) was involved
  causingBallLocalTime: number; // local time of that ball when the event occurred
  targetObject: string;         // object ID (switch, door, etc.)
  action: "activate" | "deactivate" | "open" | "close" | "destroy" …
  newState: any;                // snapshot of the object's new state
}
```

When a ball’s future beyond a certain local time is erased:

1. All events caused by that ball with `causingBallLocalTime > branchLocalTime` are marked as **invalid**.
2. For each affected object, if it is **reversible**, its state is rolled back to the last valid event (if any) or its default state.
3. Doors re‑evaluate their switch conditions based on the new switch states.
4. If rolling back creates a cascade (a door closing because its switch reverted), that cascade is processed immediately.

#### 4.5.3 Example: The Paradox Door

- Switch A is **non‑reversible**. Door A is **reversible**.
- Ball 1 rolls over Switch A → Switch A activates (permanent). Door A opens (reversible).
- Player rewinds Ball 1 to before it hit the switch, then drives it in reverse through the now‑open Door A (because reverse sees the current open door).
- Then player plays Ball 1 forward again from that past point. The future where it hit the switch is erased.
  - Switch A: non‑reversible → stays activated.
  - Door A: reversible, but it re‑evaluates its switches: Switch A is still on → Door A remains open (it doesn't close because the condition is still satisfied, even though the original "door opened" event was linked to Ball 1’s erased future? Actually we need careful logic: the door opened because the switch activated. The switch activation is non‑reversible and independent. So even though the original opening event might be tagged as caused by Ball 1, the door’s state is determined by the current switch state, not the causal chain. To handle this elegantly, **doors don't store their open state as a simple latched flag; they always evaluate their switch conditions.** So a door is open if all its linked switches are active. If a switch is non‑reversible and active, the door stays open, regardless of erased events. If the switch were reversible and reverted, the door would close. So the `reversible` flag on a door controls whether the door _can close again_ when conditions change. If a door is non‑reversible, it latches open permanently once opened, even if its switches later deactivate. This gives the level designer three levels of paradox depth.)

**Refined door model:**

- A door has a list of required switches and a `latching` flag.
  - If `latching = false` (reversible), the door is open only as long as all switches are active. If a switch deactivates, the door closes.
  - If `latching = true` (non‑reversible), the door opens permanently the first time all switches are active, and stays open forever, even if switches later turn off.
- Switches have their own `latching` property: if `false`, a switch deactivates when no ball is on it (momentary). If `true`, it stays on permanently once triggered. This interacts with erasure: a latching switch will remain on even if the causing ball’s future is deleted (unless the switch is also reversible—meaning its latched state can be undone by erasure).

We'll simplify for clarity:

- Each switch has a `persistent` boolean and a `reversible` boolean.
  - `persistent = true`: once activated, stays on unless reverted by erasure.
  - `reversible = true`: can be reverted if the ball’s erasure removes the activation event.
- Doors evaluate their switch conditions every frame. If all switches are on, door is open; else closed. There's no separate latching on doors—level designers use switch persistence to control door latching.

This system is powerful yet understandable.

#### 4.5.4 Ball‑to‑Ball Collision Causality

When Ball A and Ball B collide at a global time T, the collision is an event caused by both. If later Ball A’s timeline is erased past T, what happens to Ball B?

Two modes, selectable per level or per ball:

- **Symmetric (default):** The collision only exists if both balls’ timelines still contain it. If Ball A erases the collision, Ball B’s timeline is also invalidated from that point, and Ball B is **re‑simulated** from the collision moment without the impact. This means Ball B’s path changes retroactively—it never “remembers” the hit.
- **Asymmetric (paradox):** Ball B is treated as non‑reversible regarding that collision. Even if Ball A rewinds, Ball B retains its post‑collision velocity and path. This creates a ghost impact: Ball B was hit by a ball that now never existed.

In early puzzles, symmetric is the rule; later, asymmetric collisions introduce mind‑bending paradoxes.

---

### 4.6 Ball‑to‑Ball Interactions

- Balls occupy the same physical space; they can collide if their global times overlap and their centers come within a collision distance.
- When balls move at different speeds (one forward, one paused, one reverse), the timing of collisions can be precisely controlled.
- Example: Ball 1 (forward) hits Ball 2 (paused), launching Ball 2 into a goal. Ball 3 (reverse) later hits Ball 2 again from the other side, altering its course.
- All collisions are resolved using standard 2D elastic circle‑circle physics, and the resulting velocity changes are recorded in both balls’ timelines at that global moment.

---

### 4.7 Win Condition

- The level has three goal portals, each colour‑matched to a ball (cyan, magenta, yellow).
- At the end of every physics frame, the game checks: are all three balls simultaneously within their respective goal zones? If yes, the level is won.
- “Simultaneously” means at the same global time `t`. Because balls can be paused inside goals while the other balls are manipulated, this encourages orchestrated timing.

---

## 5. Controls & User Interface

### 5.1 Shooting Mode Controls

| Action       | Keyboard + Mouse          | Description                            |
| ------------ | ------------------------- | -------------------------------------- |
| Aim          | Mouse position            | Aim line from spawn to cursor          |
| Charge power | Hold Left Mouse Button    | Power is proportional to drag distance |
| Shoot        | Release LMB               | Ball launches                          |
| Cancel/Reset | Right Mouse Button or `R` | Resets current ball’s aim              |

### 5.2 Time Manipulation Mode Controls

| Action                 | Key                    | Description                                                                                                                            |
| ---------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Select Ball 1 / 2 / 3  | `1`, `2`, `3`          | Click on ball or its clock also works                                                                                                  |
| Pause/Play Global Time | `Space`                | Toggle; hold for temporary pause                                                                                                       |
| Set Forward (1×)       | `W`                    |                                                                                                                                        |
| Set Pause (0×)         | `S`                    | Freeze selected ball                                                                                                                   |
| Set Reverse (–1×)      | `X`                    | Active reverse control                                                                                                                 |
| Faster / Slower        | `E` / `Q`              | Cycles speed multipliers (0.5×, 1×, 2×, etc.)                                                                                          |
| Scrub Timeline         | `A`/`D` or mouse wheel | When global time paused, moves playhead of selected ball along its recorded timeline (ghost preview). Hold `Shift` for frame‑by‑frame. |
| Commit Scrub           | `Enter` or click       | Sets ball’s local time to scrubbed point, erasing future.                                                                              |
| Reset Level            | Hold `R` 1s            | Full restart                                                                                                                           |

### 5.3 UI Layout (Web)

- **Canvas:** Main game area, shows level, balls, objects, trails.
- **Overlay (DOM):**
  - **Clocks:** Three circular analogue clocks at the bottom, one per ball. Each shows a sweep hand indicating local time progress, colour‑coded border, speed indicator (►, ⏸, ◄, 2×). Click to select.
  - **HUD:** Top left: level name/number. Top right: global time counter, pause indicator.
  - **Controls panel:** Subtle on‑screen hints for keys (can be hidden).
  - **Menu:** Escape brings pause menu with options, restart, level select.

---

## 6. Level Design & Progression

### 6.1 World Structure

- **World 1 – “The First Tick” (4 levels):** One active ball. Introduce shooting, forward motion, simple switch+door. Switches are non‑reversible, doors latch. No rewind.
- **World 2 – “Pause & Play” (6 levels):** Two balls. Independent pause; show that one ball can hold a switch while the other passes through a door. Introduce latching switches.
- **World 3 – “The Rewind” (8 levels):** Unlock reverse time for one ball (later both). First “hit switch, rewind through open door” paradox. Switches still non‑reversible.
- **World 4 – “Causality” (8 levels):** Introduces **reversible** objects. Levels require erasing futures to reset switches/doors. Players must understand branching.
- **World 5 – “Collision Course” (8 levels):** Ball‑to‑ball collisions, symmetric causality. Use one ball to redirect another across time.
- **World 6 – “Grandfather Paradox” (8 levels):** Three‑ball simultaneity, asymmetric collision persistence, advanced branching puzzles where objects remember states across erased timelines.
- **Bonus – “Timeless” (endless/community):** User‑generated levels, extreme challenges.

### 6.2 Puzzle Design Principles

- Each puzzle has a single intended “elegant” solution, but emergent physics may allow alternatives.
- Levels teach one new concept at a time and then combine them.
- Metrics: 2–5 minutes per puzzle for average player.
- All levels built as JSON objects (see Technical Requirements), enabling a level editor.

---

## 7. Art & Audio Direction

### 7.1 Visual Style (2D)

- **Theme:** “Clockwork laboratory in a cosmic void.” Brass, copper, dark indigo, and glowing neon accents.
- **Background:** Layered parallax of giant gears and pendulums, starfield.
- **Walls & platforms:** Brass‑edged panels with subtle grid lines and rivet textures.
- **Balls:** Brightly glowing orbs with colour‑coded trails (cyan, magenta, yellow). Trails persist but fade.
- **Switches:** Concentric rings that pulse cyan when active.
- **Doors:** Brass iris that opens like a camera aperture.
- **Goals:** Rotating clock‑face rings matching ball colours.
- **Particles:** Golden sparks on collision, purple paradox distortion when a timeline is erased.
- **UI clocks:** Styled to look like ornate pocket watches.

### 7.2 Audio

- **Music:** Layered lo‑fi electronic. Three layers (ambient, pulse, arpeggio) that crossfade based on number of balls moving and whether any is reversing.
- **SFX:**
  - Bounce: soft tick, pitch varies with speed.
  - Switch activation: mechanical clunk + chime.
  - Door open/close: sliding metal.
  - Reverse loop: tape‑stop effect when speed flips.
  - Timeline erased: reversed granular synth sweep.
- **Web Audio implementation:** All sounds generated or pre‑loaded as short samples, manipulated in real‑time.

---

## 8. Technical Requirements

### 8.1 Technology Stack

- **Language:** TypeScript 5 (strict mode)
- **Bundler:** Vite
- **Rendering:** HTML5 Canvas 2D API for the game world; DOM overlay for UI.
- **Physics:** Custom deterministic 2D engine (no external physics library). Fixed timestep 120 Hz, semi‑implicit Euler.
- **State management:** Immutable snapshots via Immer for undo/scrubbing.
- **Level data:** TypeScript objects / JSON.
- **Audio:** Web Audio API.
- **Save:** `localStorage` for progress, settings; ghost replays as compressed JSON.

### 8.2 Deterministic Physics & Timeline System

- Physics step function `step(ball, dt)` called with **dt** that can be positive or negative.
- Each ball holds a ring buffer of keyframes (position, velocity, localTime, globalTime). Maximum 5 minutes of history at 120 Hz (~36k entries).
- Scrubbing reads keyframes; active reverse calls `step` with `dt = -1/120`.
- When a future is erased, keyframes beyond the branch point are truncated. The causal event log prunes events for that ball beyond the branch.

### 8.3 Level Format (Example)

```typescript
{
  "id": "3-4",
  "name": "Rewind Through the Gate",
  "gravity": { "x": 0, "y": 800 },
  "walls": [ {"x":100,"y":200,"w":600,"h":20}, ... ],
  "ballSpawns": [ {"x":150,"y":300}, {"x":500,"y":300}, {"x":800,"y":300} ],
  "goals": [
    {"ballIndex":0, "x":900, "y":100, "radius":40},
    ...
  ],
  "switches": [
    {"id":"sw1", "x":300,"y":380,"radius":25, "persistent":true, "reversible":false}
  ],
  "doors": [
    {"id":"door1", "x":600,"y":350,"w":20,"h":100, "linkedSwitches":["sw1"]}
  ],
  "bouncePads": [],
  ...
}
```

### 8.4 Performance Targets

- 60 FPS render, 120 Hz physics on mid‑range laptop.
- Total JS heap < 100 MB.
- Initial load < 500 KB (code split).

---

## 9. Development Milestones

| Phase                                 | Duration | Deliverables                                                                                                                                                             |
| ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Phase 0: Foundation**               | 1 week   | Vite+TS project, Canvas game loop, fixed‑step physics, basic ball rendering, simple wall collisions.                                                                     |
| **Phase 1: One‑Ball Core**            | 2 weeks  | Shooting mechanic, forward/reverse/pause, keyframe recording + scrubbing, switches & doors (persistent, non‑reversible), 3 tutorial levels.                              |
| **Phase 2: Two Balls & Branching**    | 2 weeks  | Two independent clocks, timeline branching (erase future), reversible objects, causal event log, 6 levels.                                                               |
| **Phase 3: Three Balls & Collisions** | 2 weeks  | Three‑ball setup, ball‑ball collisions, symmetric causality, goal simultaneous check, World 3 & 4 levels (~10 levels).                                                   |
| **Phase 4: Full Polish**              | 3 weeks  | Asymmetric collisions, moving platforms, bounce pads, conveyors, death zones, full art & audio integration, UI clocks, level select, save system, accessibility options. |
| **Phase 5: Testing & Launch**         | 2 weeks  | External playtest (10+), balance, bug fixes, Vercel deployment, itch.io page, community level support basics.                                                            |

---

## 10. Open Questions & Risks

1. **Complexity of causality UI:** How to visually communicate to the player which objects are reversible and when a timeline erasure will revert something. Suggestion: colour‑coded glows (purple for reversible, gold for non‑reversible) and a brief “paradox alert” animation when an object changes state due to erasure.
2. **Ball‑to‑ball asymmetric collisions:** Could feel unfair if not taught well. Dedicate a full world to it with clear ghost‑ball visual feedback when a ghost collision happens.
3. **Touch controls:** Full touch support (drag to shoot, swipe on clocks to scrub) is needed for mobile but adds complexity. Prioritize keyboard/mouse for v1.0, add touch later.
4. **Determinism across browsers:** JS floating‑point can differ slightly. Use Math.fround where needed and test on Chrome/Firefox/Safari. Accept that replays may not be byte‑perfect across engines, but visual tolerance is okay.
5. **Level editor:** A built‑in editor would greatly extend longevity; plan for it post‑launch.

---

_End of PRD_
