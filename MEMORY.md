# 🧠 MEMORY.md — Decision Register & Project Log

> This is the living memory of the Algorhythm project. Every major decision, solved problem, and open question is documented here. The AI assistant must update this file whenever an architectural decision is made.

---

## Project Status

| Field | Value |
|-------|-------|
| **Phase** | 🟡 Initialization |
| **Sprint** | 0 — Foundation |
| **Date Initialized** | 2026-04-21 |
| **Deadline** | 2026-05-01 @ 13:37 UTC (Vibe Jam 2026) |
| **Build Status** | ❌ Not started |
| **Deployment** | ❌ Not deployed |
| **Widget Installed** | ❌ Pending |

---

## Architecture Decisions

### ADR-001 — Vite as Build Tool (2026-04-21)
- **Decision**: Use Vite + TypeScript, not webpack or Parcel.
- **Reason**: Instant HMR, native ESM, simplest Vercel integration, and zero-config TypeScript support.
- **Alternatives Considered**: Create React App (too heavy), webpack (too much config), esbuild standalone (missing HMR).
- **Status**: ✅ Accepted

### ADR-002 — No UI Framework (2026-04-21)
- **Decision**: Vanilla DOM for the HUD. No React, Vue, or Svelte.
- **Reason**: The game loop is the rendering surface at 60fps. A reactive framework's reconciliation overhead inside `animate()` would cause jank. HUD updates are infrequent (score, combo) and don't justify the overhead.
- **Status**: ✅ Accepted

### ADR-003 — `midi-file` as MIDI Parser (2026-04-21)
- **Decision**: Use the `midi-file` npm package to parse MIDI files in-browser.
- **Reason**: Zero server dependency. Lightweight (<10KB). Returns a typed, traversable JSON object. Can be lazy-loaded per song.
- **Upgrade Path**: If BPM tempo map handling gets complex, upgrade to `@tonejs/midi`.
- **Status**: ✅ Accepted (evaluate upgrade at Sprint 2)

### ADR-004 — AudioContext as Master Clock (2026-04-21)
- **Decision**: `AudioContext.currentTime` is the single source of truth for all timing in the game.
- **Reason**: `Date.now()` drifts under tab focus loss and system load. `AudioContext` is tied directly to the audio hardware on all modern browsers.
- **Implementation Note**: Song start time is captured as `startTime = audioContext.currentTime` at the moment audio playback begins. All note timestamps are compared against `audioContext.currentTime - startTime`.
- **Status**: ✅ Accepted

### ADR-005 — Note Object Pooling (2026-04-21)
- **Decision**: Notes (Three.js meshes) will be managed with an object pool, not created/destroyed per note event.
- **Reason**: Creating and garbage-collecting Three.js meshes during gameplay causes frame drops. A pool of ~50 pre-created note objects covers most charts without allocation.
- **Status**: 📋 Planned (Sprint 2)

---

## Open Problems & Planned Solutions

### PROBLEM-001 — MIDI Tempo Map Complexity
**Description**: MIDI files can contain multiple `setTempo` events (BPM changes). Converting MIDI ticks to absolute seconds requires accumulating all tempo changes up to each event.

**Planned Solution**:
```ts
// Pseudo-algorithm for tick-to-seconds conversion:
function ticksToSeconds(targetTick: number, tempoMap: ITempoEvent[], ticksPerBeat: number): number {
  let elapsedSeconds = 0;
  let lastTick = 0;
  let currentMicrosPerBeat = 500000; // default 120 BPM

  for (const event of tempoMap) {
    if (event.tick >= targetTick) break;
    const deltaTicks = event.tick - lastTick;
    elapsedSeconds += (deltaTicks / ticksPerBeat) * (currentMicrosPerBeat / 1_000_000);
    lastTick = event.tick;
    currentMicrosPerBeat = event.microsecondsPerBeat;
  }
  const remainingTicks = targetTick - lastTick;
  elapsedSeconds += (remainingTicks / ticksPerBeat) * (currentMicrosPerBeat / 1_000_000);
  return elapsedSeconds;
}
```
**Status**: 📋 Planned (Sprint 2 — MIDI module)

---

### PROBLEM-002 — Note Physics in 3D (Highway System)
**Description**: Notes must travel from far (spawn point) to near (hit zone) along a 3D highway, arriving precisely at T=hitTime.

**Planned Solution**:
- The highway is a Z-axis corridor. Notes spawn at `z = -SPAWN_DEPTH` (e.g., -80 units).
- The hit zone is at `z = 0`.
- Travel time = `LEAD_TIME` seconds (e.g., 3 seconds = configurable "note speed").
- Each frame: `note.mesh.position.z = lerp(SPAWN_DEPTH, 0, progress)` where `progress = (audioTime - (note.hitTime - LEAD_TIME)) / LEAD_TIME`.
- This is **pure linear interpolation** — no physics engine needed. Gravity is faked by the camera angle.

**Status**: 📋 Planned (Sprint 2 — Highway entity)

---

### PROBLEM-003 — QWERTY-to-MIDI Lane Mapping
**Description**: Piano MIDI notes span 88 keys (21–108). The keyboard has ~20 usable keys. Mapping must be musically sensible and adapt per song.

**Planned Solution**:
- Analyze the MIDI chart's pitch range per song.
- Quantize/remap the used pitches into N lanes (N = number of active keys).
- Provide a default mapping (home row left + home row right = 10 lanes for 10 fingers).
- Store the mapping in the song's metadata JSON.

**Status**: 📋 Planned (Sprint 3 — Chart System)

---

## Session Log

| Date | Session Summary |
|------|-----------------|
| 2026-04-21 | Project initialized. All 7 foundation `.md` files created. Repository exists on GitHub. No code written yet. |

---

## Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Audio sync drift on mobile browsers | HIGH | Test on iOS Safari early; implement `visibilitychange` pause/resume |
| MIDI files with complex tempo maps | MEDIUM | Use `ticksToSeconds()` helper (PROBLEM-001) from Sprint 2 |
| Vibe Jam widget blocking render | LOW | Load widget with `async` — confirmed in `RULES.md` |
| Large MIDI files causing load delay | LOW | Lazy-parse per song selection, not at startup |
| No loading screen rule (Vibe Jam) | HIGH | Embed minimal startup assets inline; load songs on-demand |
