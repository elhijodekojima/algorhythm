# 📋 NEXT_STEPS.md — Active Backlog
> Living document. Updated by AI after every completed task.
> Based on: `GDD.md` v1.0 — 2026-04-21
> Format: `[x]` done · `[/]` in progress · `[ ]` pending

---

## ✅ Sprint 0 — Foundation (DONE)

- [x] **S0-01** · Vite + TypeScript scaffold (`npm init` + manual setup)
- [x] **S0-02** · Install core dependencies (three, howler, midi-file, eslint, prettier, vitest)
- [x] **S0-03** · `vite.config.ts` with path aliases
- [x] **S0-04** · Folder structure: `src/core/`, `src/gfx/`, `src/midi/`, `src/audio/`, `src/entities/`, `src/state/`
- [x] **S0-05** · `eslint.config.js` + `.prettierrc`
- [x] **S0-06** · Google Fonts (Orbitron + Space Grotesk) in `index.html`
- [x] **S0-07** · Vibe Jam 2026 widget in `index.html` ✅
- [x] **S0-08** · `vercel.json` build config
- [x] **S0-09** · First commit + push — initial scaffold pushed to `dev` and merged to `main`

---

## ✅ Sprint 1 — Hello World (DONE)

- [x] **S1-01** · `Renderer.ts` — WebGLRenderer + EffectComposer + UnrealBloomPass
- [x] **S1-02** · `scene.ts` — Scene, PerspectiveCamera, FogExp2
- [x] **S1-03** · `GameLoop.ts` — requestAnimationFrame + THREE.Clock (delta in seconds)
- [x] **S1-04** · Glowing neon cube with emissive material + slow Y rotation
- [x] **S1-05** · `InputManager.ts` — keydown/keyup → Set of held keys, `wasJustPressed()`
- [x] **S1-06** · Cube changes color on lane key press (proof of input pipeline)

---

## 🔴 Sprint 2 — Core Architecture Refactor (GDD Alignment)

> ⚠️ The GDD introduced key changes not in the original plan. This sprint aligns the codebase.

### 2A — Correct Key Mapping (BREAKING CHANGE from Sprint 1)

- [ ] **S2A-01** · Update `InputManager.ts` — new lane key order per GDD §3.1:
  ```
  LANE_KEYS = ['KeyQ','KeyW','KeyE','KeyR','KeyV','KeyB','KeyU','KeyI','KeyO','KeyP']
  ```
  > Note: V and B — NOT home row. These are the 5th and 6th keys on the bottom row.
- [ ] **S2A-02** · Update difficulty key masks in a new `DifficultyConfig.ts`:
  - Easy: lanes [0,1,2,6,7,8] → Q,W,E,I,O,P
  - Medium: lanes [0,1,2,3,6,7,8,9] → Q,W,E,R,U,I,O,P
  - Expert: all 10 lanes

### 2B — Note Types (GDD §3.7)

- [ ] **S2B-01** · Define note type system in `src/midi/noteTypes.ts`:
  ```ts
  type NoteType = 'single' | 'chord' | 'sustain' | 'sustained_chord';
  interface INoteEvent {
    time: number;        // seconds from song start
    duration: number;    // 0 = single/chord, >0 = sustain
    lanes: number[];     // array allows chords (1 lane = simple, 2+ = chord)
    type: NoteType;
  }
  ```
- [ ] **S2B-02** · Note pool — `src/entities/NotePool.ts`
  - Pre-allocate 60 Three.js mesh objects
  - `acquire(note: INoteEvent): PooledNote`
  - `release(note: PooledNote): void`

### 2C — The Note Highway (GDD §5)

- [ ] **S2C-01** · Remove `HelloCube.ts` from scene — replace with `NoteHighway.ts`
- [ ] **S2C-02** · Create `src/entities/NoteHighway.ts`:
  - 10 lane corridor along Z axis
  - Hit Line at `z = 0`, spawn at `z = -SPAWN_DEPTH` (derived from 3s lead time at current bpm)
  - Lane tiles: `PlaneGeometry` with subtle neon grid, one per lane
  - Lane key labels displayed on the hit zone tiles (Q, W, E, R, V, B, U, I, O, P)
- [ ] **S2C-03** · Camera position: slightly above and behind Hit Line looking down the highway
  - Position: `(0, 6, 12)` · LookAt: `(0, 0, -40)` — adjust for best feel
- [ ] **S2C-04** · Note position formula (per GDD §3.2 — 3s lead time):
  ```ts
  const LEAD_TIME = 3.0; // seconds
  note.mesh.position.z = lerp(SPAWN_DEPTH, HIT_LINE_Z, progress);
  // progress = (songTime - (note.time - LEAD_TIME)) / LEAD_TIME
  ```

---

## 🔴 Sprint 3 — Chart System & Test Song

### 3A — Chart Loader

- [ ] **S3A-01** · Create `src/midi/ChartLoader.ts`:
  - Reads JSON chart format
  - Parses `INoteEvent[]` with full type support (single/chord/sustain)
  - Applies difficulty filter (masks lanes per `DifficultyConfig`)
- [ ] **S3A-02** · Create `src/midi/MidiParser.ts`:
  - Parse `.mid` binary with `midi-file`
  - `ticksToSeconds()` with full tempo map (see MEMORY ADR-001)
  - Output: `INoteEvent[]`

### 3B — Song-Test (GDD §8 — Miscelánea obligatoria)

- [ ] **S3B-01** · Create `public/charts/song-test.json` — hardcoded chart with:
  - Simple notes (all 10 lanes)
  - At least 2 chords
  - At least 2 sustained notes
  - At least 1 sustained chord
  - Difficulty: Easy/accessible, ~60–90 seconds
- [ ] **S3B-02** · Generate test audio programmatically (Web Audio API synth — no file needed):
  - Create `src/audio/SynthEngine.ts` — generates a simple piano-like tone sequence
  - Matches the chart timestamps
  - Easy to toggle off once real songs are integrated
- [ ] **S3B-03** · Wire song-test to Main Menu — "▶ Play Test Song" button visible immediately

---

## 🔴 Sprint 4 — Audio Engine & Sync

- [ ] **S4-01** · `src/audio/AudioEngine.ts` — Howler.js wrapper
  - `play()`, `pause()`, `seek()`, `currentTime` via `AudioContext`
  - `startTime` captured at playback begin (ADR-004)
- [ ] **S4-02** · Wire `AudioContext.currentTime - startTime` as song position to `NoteHighway`
- [ ] **S4-03** · Handle `visibilitychange` — pause/resume audio + loop gracefully
- [ ] **S4-04** · Manual offset system (GDD §4):
  - Store offset in ms in game settings
  - Apply: `effectiveSongTime = audioTime + offsetMs / 1000`

---

## 🔴 Sprint 5 — Hit Detection & Scoring

- [ ] **S5-01** · `src/core/HitDetector.ts`:
  - Hit window: **±80ms** from note.time (single threshold, no perfect/good split per GDD)
  - Input extra detection: keypress when no note in hit window → miss
  - Input omitted: note passes hit line unplayed → miss
- [ ] **S5-02** · `src/state/ScoreManager.ts`:
  - Score accumulation (+50 per hit, ×combo multiplier)
  - Combo tracking: reset on miss, ×2 at 10, ×3 at 20, ×4 at 30+
  - Sustain scoring: +4 pts/frame while held
- [ ] **S5-03** · `src/state/LifeBar.ts` — GDD §3.4:
  - Starts at 50%
  - Clamps 0–100%
  - Game Over at 0%
  - Changes per difficulty config
- [ ] **S5-04** · Visual feedback (GDD §5):
  - Hit: lane tile flash + 12-particle burst in lane color
  - Miss: note mesh fades to red over 200ms
  - Input extra miss: distorted note sound from SynthEngine
  - Input omitted miss: duck audio volume by -12dB for 300ms
- [ ] **S5-05** · Progress bar: `songTime / totalDuration` (0–100%)

---

## 🔴 Sprint 6 — UI Screens (GDD §6)

- [ ] **S6-01** · Main Menu screen (HTML overlay):
  - Title: ALGORHYTHM in Orbitron neon
  - Top-right: "Start Session" + "Options" buttons
  - Temporary: "▶ Play Test Song" button (removed later)
- [ ] **S6-02** · Options screen:
  - Volume slider (0–100%, default 100%) with audio tick feedback
  - Offset slider (−200ms to +200ms, default 0)
- [ ] **S6-03** · Start Session / Song Selector:
  - 6 song slots in vertical list (`Session #X · [Title]`)
  - Progressive unlock — only #1 unlocked at start
  - Locked songs show unlock condition
  - Song selection → difficulty picker (Easy / Medium / Expert) replaces the list inline
- [ ] **S6-04** · In-game HUD:
  - Score (top right, Orbitron)
  - Combo × multiplier (below score)
  - Progress bar (bottom or top, horizontal)
  - Life bar (vertical, left or right of highway, color-coded per GDD §3.4)
- [ ] **S6-05** · Pause Menu (Esc key):
  - Retry · Main Menu · Song Select · Options
  - Offset change during pause → show restart warning
- [ ] **S6-06** · Results Screen:
  - Win: Score + Accuracy % + Stars (3–6 per GDD §6.6)
  - Fail: "You failed [song] at [X%]"
  - Navigation: Retry · Main Menu · Song Select

---

## 🔴 Sprint 7 — State Machine & Game Flow

- [ ] **S7-01** · `src/state/GameState.ts` — FSM:
  `MAIN_MENU → SONG_SELECT → DIFFICULTY_SELECT → COUNTDOWN → PLAYING → PAUSED → RESULT → GAME_OVER`
- [ ] **S7-02** · Unlock system: persist completed songs in `localStorage`
- [ ] **S7-03** · Countdown (3-2-1-GO) before gameplay starts
- [ ] **S7-04** · Full integration test: main menu → song → play → result → back

---

## 🔴 Sprint 8 — Real Songs & MIDI Pipeline

- [ ] **S8-01** · Add 1st real AI-generated song (MP3 + MIDI chart)
- [ ] **S8-02** · Run `audio-separator` pipeline locally → extract piano stem → Basic Pitch → JSON chart
- [ ] **S8-03** · Add songs 2–6 (progressive unlock order)
- [ ] **S8-04** · Remove Song-Test from main menu

---

## 🔴 Sprint 9 — Polish & Vibe Jam Submission

- [ ] **S9-01** · Vibe Jam portal implementation (optional, see RULES.md)
- [ ] **S9-02** · Performance audit — 60fps on mid-range laptop
- [ ] **S9-03** · Mobile/touch fallback notice (desktop-only game)
- [ ] **S9-04** · Final QA — no loading screen >1 second
- [ ] **S9-05** · Merge `dev` → `main` → Vercel production deploy
- [ ] **S9-06** · Submit: https://forms.gle/bGG4e3uD9PUUJKUc7
- [ ] **S9-07** · Final commit: `chore: production deploy + Vibe Jam submission`

**DEADLINE: 1 MAY 2026 @ 13:37 UTC**

---

## 🎁 Post-Jam Backlog

- [ ] Custom song submission (player uploads audio → Replicate API pipeline → chart generated)
- [ ] Leaderboard (Vercel KV / Supabase)
- [ ] Mobile touch lane support
- [ ] Visual themes / skin system
- [ ] Practice mode (slow note speed)
