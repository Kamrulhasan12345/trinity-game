# Kickoff Trinity

**Full Product Requirements Document (PRD)**  
_A Game Jam Submission – Theme: “Kickoff”_

---

## 1. Executive Summary

_Kickoff Trinity_ is a 2D physics puzzle game where you launch three time‑charged balls into a clockwork arena, then independently control each ball’s timeline—pausing, rewinding, and re‑kicking them from any moment in their past. The core fantasy is that of a **time conductor** orchestrating a perfectly synchronized kickoff sequence: every launch, every reversal, and every goal is a new **kickoff** moment. The game turns the jam theme into a deep mechanic: your first kickoff starts the clock, and only by re‑kicking history can you solve paradoxes and bring all three balls home at once.

Built for the browser with a custom deterministic physics engine, _Kickoff Trinity_ delivers frame‑perfect replay, timeline branching, and a causality system that lets players rewrite the rules of cause and effect.

---

## 2. Game Overview

### 2.1 High Concept

**Three balls. Three clocks. Infinite re‑kickoffs.**  
Aim, kickoff each ball into the level, then bend time for each one independently. Rewind a ball through the door it just opened, freeze another mid‑air as a stepping stone, and delete a future where you failed. The goal: get all three balls into their colour‑matched **kickoff goal zones** at the exact same global moment.

### 2.2 Target Audience

- Puzzle fans who enjoy _Braid_, _The Talos Principle_, _Portal_, or _Recur_.
- Players who love “aha!” moments born from non‑linear time mechanics.
- Age rating: Everyone (E), with accessibility options.

### 2.3 Platform & Business Model

- **Primary:** Web (desktop & mobile browsers) – playable instantly via URL.
- **Future:** Standalone desktop, Nintendo Switch.
- **Monetization:** Free demo with full unlock, or premium single purchase – no ads, no microtransactions.

### 2.4 Unique Selling Points

- **Independent per‑ball time control:** Each ball has its own clock and speed multiplier. Combine forward, pause, reverse, and slow‑motion simultaneously.
- **Active re‑kickoff:** Rewinding is not a passive replay; you literally drive the ball backwards in real‑time, reacting to the changed environment.
- **Timeline branching & causality:** Deleting a ball’s future can revert “reversible” objects, while “non‑reversible” ones stubbornly remember their state – perfect for paradox puzzles.
- **Ball‑to‑ball collisions across time:** Balls moving at different speeds can collide, creating emergent solutions that defy normal chronology.

---

## 3. Core Gameplay Loop

1. **Kickoff Phase**  
   The level begins in Kickoff Mode (global time paused). You aim and launch three balls, one after another, from fixed kickoff cannons. The launch itself is a “kickoff” – the moment the ball’s personal timeline begins.

2. **Orchestrate Time**  
   Once the balls are in motion, time runs globally. You watch the deterministic physics play out: balls roll, bounce, trigger switches, and open doors.

3. **Re‑Kickoff & Rewind**  
   At any moment you can independently change any ball’s time flow:
   - **Pause** the ball mid‑flight.
   - **Reverse** it, actively driving it backwards through the current arena.
   - **Scrub** its timeline to any past moment, erasing its future, and then **re‑kickoff** – playing it forward again from that point into a now‑different world.

4. **Rewrite History**  
   When you re‑kickoff a ball from a past moment, the original future is deleted. Reversible objects linked to that ball’s actions reset, while non‑reversible objects keep their state, enabling paradoxes.

5. **Synchronized Kickoff Goal**  
   Three colour‑coded **goal zones** (cyan, magenta, yellow) await. To win, all three balls must be inside their respective goals at the exact same global instant. This is your ultimate kickoff – the moment all timelines converge.

---

## 4. Detailed Mechanics

### 4.1 Kickoff Phase (Shooting)

- Global time is paused.
- Each ball’s **kickoff cannon** is highlighted. You must launch Ball 1, then Ball 2, then Ball 3.
- **Control:** Drag from the cannon to set angle and power (power = drag distance). Release to kickoff.
- Balls can be launched in any direction, including zero‑gravity puzzles.
- Once all three balls are kicked off, the game enters **Time Manipulation Mode**.

### 4.2 Ball Physics

All physics are deterministic – essential for accurate rewind.

- **Model:** Rigid body with mass, velocity, position. Constant gravity (per‑level), no angular momentum (visual radius for collision).
- **Collision detection:** Ball‑vs‑wall (circle/AABB & circle/line), ball‑vs‑ball (circle‑circle).
- **Collision response:** Perfectly elastic by default (restitution = 1.0). Some surfaces override (e.g. bounce pads).
- **Integrator:** Semi‑implicit Euler at 120 Hz fixed timestep.
  - Forward: `v(t+dt) = v(t) + a(t)*dt; x(t+dt) = x(t) + v(t+dt)*dt`
  - Reverse: `x(t-dt) = x(t) - v(t)*dt; v(t-dt) = v(t) - a(t-dt)*dt`
- **Determinism:** Collision pairs processed in fixed, sorted order. No external randomness. All numbers are 64‑bit floats.

### 4.3 Time Manipulation System

#### 4.3.1 Independent Clocks

Each ball has a `localTime` that advances as `timeSpeed * Δt_global`.  
`timeSpeed` can be –2, –1, –0.5, 0, 0.5, 1, 2.

- **Active reverse (–1×):** The ball is simulated with negative timestep. It genuinely moves backwards in the current arena, can pass through now‑open doors, collide with other balls, and re‑trigger switches.
- **Pause (0×):** Frozen. Does not move but can be hit by other balls.
- **Fast/Slow motion:** For fine‑tuning synchronized arrivals.

#### 4.3.2 Timeline Recording & Scrubbing

Every physics tick the ball’s state (position, velocity) is recorded as a keyframe. This data serves:

- **Scrubbing (visual preview):** With global time paused, drag the playhead to lerp between keyframes and preview the ball’s ghost.
- **Ghost replays:** For sharing solutions.
- **Basis for erasure:** When you scrub to a past moment and **commit**, the future keyframes beyond that point are discarded.

#### 4.3.3 Re‑Kickoff (Timeline Branching)

When you scrub to a past moment and then set the ball to **Play Forward**, you **re‑kickoff** the ball from that point. The original future is deleted.

- All events caused by that ball in the deleted future are evaluated against the reversibility rules.
- Reversible objects revert, non‑reversible stay.
- The ball begins a fresh forward simulation in the altered world.

### 4.4 World State & Objects

#### Switches (“Trigger Plates”)

- Activated when any ball touches their zone.
- **persistent:** If true, once activated it stays on unless reverted by erasure. If false, it deactivates immediately when the ball leaves.
- **reversible:** If true, erasing the activation event will turn it off. Non‑reversible switches stay on forever.

#### Doors (“Time Gates”)

- Doors evaluate their linked switches every frame. If all switches are active, the door is open; else closed.
- No separate latching property – use switch persistence to control permanence.

#### Moving Platforms, Bounce Pads, Conveyors, One‑Way Gates, Glass Walls

- Operate on global time, generally non‑reversible (exceptions possible for advanced puzzles).
- Standard behaviours as described in the original PRD.

### 4.5 Reversibility & Causality (The Kickoff Paradox Engine)

Every object interaction is logged:

```
Event {
  ballID, ballLocalTime, targetObject, action, newState
}
```

When a ball’s future beyond a certain local time is erased:

1. All its events after that point are invalidated.
2. For each affected object, if reversible, it reverts to the state of the last valid event (or default).
3. Doors re‑evaluate switch conditions.
4. Collisions: By default, collisions are **symmetric** – both balls’ futures are invalidated from that point if one ball erases the collision. Later levels introduce **asymmetric** (paradox) collisions, where one ball retains the effect.

### 4.6 Ball‑to‑Ball Collisions

- Balls can collide at shared global times.
- With one ball paused and another moving, you can build precise launches.
- With one ball reversing and another moving forward, you can create a second kickoff mid‑air.

### 4.7 Win Condition – Synchronized Kickoff Goal

- Three goal zones, each matched to a ball colour.
- At the end of every frame, check if all three balls overlap their goals simultaneously.
- This is the **ultimate kickoff** – the moment all timelines converge, and the level is won.

---

## 5. Controls & User Interface (Kickoff Themed)

### 5.1 Kickoff Mode (Shooting)

| Action               | Input          |
| -------------------- | -------------- |
| Aim                  | Mouse position |
| Charge kickoff power | Hold LMB       |
| Kickoff              | Release LMB    |
| Reset aim            | RMB or `R`     |

### 5.2 Time Manipulation Mode

| Action                    | Key                                  |
| ------------------------- | ------------------------------------ |
| Select Ball 1/2/3         | `1`, `2`, `3` or click               |
| Pause/Play Global Time    | `Space`                              |
| Set Forward (1×)          | `W`                                  |
| Pause Ball (0×)           | `S`                                  |
| Reverse Ball (–1×)        | `X`                                  |
| Speed Up/Down             | `E` / `Q`                            |
| Scrub Timeline            | `A`/`D` or mouse wheel (when paused) |
| Re‑Kickoff (commit scrub) | `Enter` or click                     |
| Reset Level               | Hold `R`                             |

### 5.3 UI Layout

- **Game Canvas:** The clockwork arena with balls, trails, and goals.
- **DOM Overlay:**
  - **Kickoff Clocks:** Three circular analogue clocks (bottom) with glowing coloured hands. Show local time and speed.
  - **HUD:** Level name, global time, pause indicator.
  - **Kickoff Goal Meter:** A small synchronisation indicator showing whether goals are occupied.

---

## 6. Level Design & Progression

### 6.1 World Structure

- **World 1 – “First Kickoff” (4 levels):** One ball, no rewind. Learn to kickoff, hit switches, open gates.
- **World 2 – “Pause & Play” (6 levels):** Two balls, independent pause. Use one ball to hold a switch for the other.
- **World 3 – “Re‑Kickoff” (8 levels):** Unlock reverse. Perform the classic “kickoff, hit switch, rewind through open gate, re‑kickoff” paradox.
- **World 4 – “Causality” (8 levels):** Reversible objects appear. Players must erase futures to reset doors.
- **World 5 – “Collision Course” (8 levels):** Ball‑to‑ball collisions. Use one ball to re‑kickoff another via impact.
- **World 6 – “Grandfather Kickoff” (8 levels):** Three‑ball symmetry, asymmetric paradox collisions.
- **Bonus – “Eternal Kickoff” (community):** Infinite community levels.

### 6.2 Puzzle Design Principles

- Each puzzle introduces one new concept and combines it with previous ones.
- Targeted solving time: 2–5 minutes.
- Levels defined as JSON for easy editing.

---

## 7. Art & Audio Direction – “Chrono‑Sport Aesthetic”

### 7.1 Visual Style

- **Theme:** Futuristic time‑sport arena inside a cosmic clockwork.
- **Colour Palette:** Dark indigo background, brass and copper structures, neon cyan/magenta/yellow for balls and trails.
- **Kickoff Cannons:** Sleek metallic launchers with glowing energy coils.
- **Balls:** Glowing orbs with streaking time trails.
- **Goals:** Spinning clock‑face rings matching ball colours.
- **UI Clocks:** Styled like coach’s stopwatches, with digital readouts and sweeping hands.

### 7.2 Audio

- **Music:** Lo‑fi electronic with stadium‑like pulse. Layers intensify with more active balls and reverse play.
- **SFX:**
  - Kickoff launch: sharp “whoosh” + deep thud.
  - Bounce: tick with pitch based on speed.
  - Switch: mechanical clunk + whistle.
  - Reverse: vinyl‑stop effect.
  - Timeline erased: reversed synth sweep.

---

## 8. Technical Requirements

- **Stack:** TypeScript 5, Vite, Canvas 2D, DOM overlay.
- **Physics:** Custom deterministic engine, 120 Hz fixed timestep, semi‑implicit Euler.
- **Timeline Storage:** Ring buffer per ball (5 min history at 120 Hz).
- **Causality Engine:** Event log with pruning on branch.
- **Level Format:** JSON with typed interfaces.
- **Save:** localStorage, ghost replay as compressed JSON.
- **Performance:** 60 FPS, heap <100 MB, initial load <500 KB.

---

## 9. Development Milestones (Game Jam Fast‑Track)

| Phase                          | Duration | Deliverables                                                                              |
| ------------------------------ | -------- | ----------------------------------------------------------------------------------------- |
| **Phase 0: Core Kickoff**      | 1–2 days | Canvas game loop, physics + reverse, one‑ball shooting, switch & door, keyframe scrubber. |
| **Phase 1: Multi‑ball & Time** | 2–3 days | Two/three balls, independent clocks, branch/re‑kickoff, causal log.                       |
| **Phase 2: Levels & Polish**   | 2–3 days | World 1–3 levels, art assets, basic audio, UI clocks, win condition.                      |
| **Phase 3: Jam Polish**        | 1 day    | Tutorial text, bug fixes, theme dressing, build & deploy.                                 |

---

## 10. Kickoff Theme Integration Summary

- **“Kickoff” as launch:** Every ball’s first movement is a kickoff from a cannon.
- **“Kickoff” as reset:** A re‑kickoff from a past moment rewrites history.
- **“Kickoff” as victory:** The final synchronized goal is the ultimate kickoff, where three timelines meet.
- **Visual & audio language:** Sporty time‑bending aesthetic reinforces the theme.

---

_End of PRD – Good luck with the jam!_
