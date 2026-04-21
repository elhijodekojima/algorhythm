# 📋 NEXT_STEPS.md — Active Backlog

> Living document. Updated by AI after every completed task.
> Format: `[x]` done · `[/]` in progress · `[ ]` pending

---

## 🏁 Sprint 0 — Foundation & Environment Setup

- [ ] **S0-01** · Initialize Vite + TypeScript project (`npm create vite@latest ./`)
  - Choose `vanilla-ts` template
  - Confirm `tsconfig.json` has `strict: true` and all rules from `STYLE_LOCK.md`
- [ ] **S0-02** · Install core dependencies
  ```bash
  npm install three howler midi-file
  npm install -D @types/three typescript eslint prettier vitest
  ```
- [ ] **S0-03** · Configure `vite.config.ts` (aliases, base path for Vercel)
- [ ] **S0-04** · Create folder structure as defined in `README.md`
  - `src/core/` · `src/gfx/` · `src/midi/` · `src/audio/` · `src/entities/` · `src/state/`
- [ ] **S0-05** · Set up `eslint.config.js` + `.prettierrc` with settings from `STYLE_LOCK.md`
- [ ] **S0-06** · Add Google Fonts (`Orbitron` + `Space Grotesk`) to `index.html`
- [ ] **S0-07** · Add Vibe Jam widget to `index.html` (**REQUIRED — do not skip**)
  ```html
  <script async src="https://vibej.am/2026/widget.js"></script>
  ```
- [ ] **S0-08** · Create `vercel.json` with build config
- [ ] **S0-09** · Initial commit and push to GitHub
  ```
  git commit -m "chore: initialize project scaffold"
  ```

---

## 🧊 Sprint 1 — Render a Cube & Keyboard Input (Hello World)

- [ ] **S1-01** · Create `src/gfx/renderer.ts` — Three.js `WebGLRenderer` setup
  - Canvas fills viewport, bg color `#05040f`, `antialias: true`
  - `EffectComposer` + `UnrealBloomPass` initialized (values from `STYLE_LOCK.md`)
- [ ] **S1-02** · Create `src/gfx/scene.ts` — Scene, camera (PerspectiveCamera), `FogExp2`
  - Camera: `fov=60`, position `(0, 4, 8)`, looking at `(0, 0, -10)`
- [ ] **S1-03** · Create `src/core/GameLoop.ts` — `requestAnimationFrame` loop
  - Uses `THREE.Clock` for delta. Calls `update(delta)` then `render()`
- [ ] **S1-04** · Render a **glowing neon cube** centered at origin
  - `MeshStandardMaterial` with `emissive: 0xb36bff`, `emissiveIntensity: 1.2`
  - Cube slowly rotates on Y axis — visual proof that the loop works
- [ ] **S1-05** · Create `src/core/InputManager.ts` — Keyboard event listener
  - Tracks `Set<string>` of currently held keys
  - Exposes `isDown(key: string): boolean` and `wasJustPressed(key: string): boolean`
- [ ] **S1-06** · Log pressed key to console + change cube's emissive color on keypress
  - Proof that input pipeline is wired to the game loop
- [ ] **S1-07** · Commit: `feat: render hello world cube with keyboard input`

---

## 🎵 Sprint 2 — MIDI Parser & Note Highway

- [ ] **S2-01** · Create `src/midi/midiParser.ts` — Load and parse a `.mid` file
  - Use `midi-file` library
  - Implement `ticksToSeconds()` with full tempo map support (see `MEMORY.md PROBLEM-001`)
  - Output: `NoteEvent[]` array sorted by time
- [ ] **S2-02** · Create `src/midi/laneMapper.ts` — Map MIDI pitches to lane indices
  - Auto-detect pitch range from chart
  - Map to N lanes (default: 10 for home row setup)
- [ ] **S2-03** · Write unit tests for parser + mapper (Vitest)
  - Test multi-tempo MIDI file
  - Test pitch range detection
  - Test lane mapping edge cases
- [ ] **S2-04** · Create `src/entities/NoteHighway.ts` — The 3D note highway
  - Z-axis corridor: spawn at `z=-80`, hit zone at `z=0`
  - Lane tiles: `PlaneGeometry` textured with subtle grid
- [ ] **S2-05** · Create `src/entities/Note.ts` — Pooled note mesh
  - Object pool of 50 pre-created note boxes
  - Position derived from `currentTime` and `LEAD_TIME` (see `MEMORY.md PROBLEM-002`)
- [ ] **S2-06** · Simulate note highway with test MIDI data (no audio yet)
  - Notes should scroll at correct speed
- [ ] **S2-07** · Commit: `feat: MIDI parser + 3D note highway`

---

## 🔊 Sprint 3 — Audio Engine & Sync

- [ ] **S3-01** · Create `src/audio/AudioEngine.ts` — Howler.js wrapper
  - Load song audio file, expose `play()`, `pause()`, `seek()`, `currentTime`
- [ ] **S3-02** · Implement master clock sync
  - `startTime = audioContext.currentTime` on play
  - All note logic uses `audioContext.currentTime - startTime`
- [ ] **S3-03** · Wire audio + MIDI: notes scroll in true sync with music
- [ ] **S3-04** · Handle tab visibility (`visibilitychange`) — pause/resume gracefully
- [ ] **S3-05** · Commit: `feat: audio engine + MIDI sync`

---

## 🎮 Sprint 4 — Hit Detection & Scoring

- [ ] **S4-01** · Define hit windows: Perfect (±40ms), Good (±80ms), Miss (>80ms)
- [ ] **S4-02** · Create `src/core/HitDetector.ts` — Compare key press timing against note events
- [ ] **S4-03** · Create `src/state/ScoreManager.ts` — Score, combo, multiplier
- [ ] **S4-04** · Visual hit feedback: lane flash + particle burst on Perfect hit
- [ ] **S4-05** · Visual miss feedback: camera shake
- [ ] **S4-06** · Create HUD: score, combo, song progress bar (vanilla DOM)
- [ ] **S4-07** · Commit: `feat: hit detection + scoring + HUD`

---

## 🏁 Sprint 5 — Song Select & Game Flow

- [ ] **S5-01** · Create `src/state/GameState.ts` — FSM: `IDLE → LOADING → PLAYING → RESULT`
- [ ] **S5-02** · Song select screen (minimal, speed > beauty for jam deadline)
- [ ] **S5-03** · Result screen: score, accuracy %, star rating
- [ ] **S5-04** · Implement Vibe Jam portal (optional but recommended — see `RULES.md`)
- [ ] **S5-05** · Final QA: no loading screen longer than 1 second
- [ ] **S5-06** · Deploy to Vercel production
- [ ] **S5-07** · Submit to Vibe Jam 2026 via: https://forms.gle/bGG4e3uD9PUUJKUc7
- [ ] **S5-08** · Final commit: `chore: production deploy + jam submission`

---

## 🎁 Backlog / Nice-to-Have (Post-Deadline)

- [ ] Leaderboard (Vercel KV or Supabase)
- [ ] Mobile touch lane support
- [ ] Custom song upload (user provides MIDI + audio)
- [ ] Visual themes / skin system
- [ ] Practice mode (slow down note speed)
- [ ] MIDI import from URL
