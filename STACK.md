# 🧱 STACK.md — Algorhythm Tech Stack

> Complete documentation of every technology, library and tool used in this project, with rationale for each choice.

---

## Core Runtime

| Technology | Version | Role | Rationale |
|------------|---------|------|-----------|
| **TypeScript** | `^5.4` | Primary language | Strict typing prevents entire classes of bugs in real-time game loops. Essential for MIDI timestamp math and Three.js object management. |
| **Vite** | `^5.x` | Build tool & dev server | Fastest HMR for web dev, native ESModules, excellent TS support out of the box, Vercel-compatible. |
| **Three.js** | `^0.164` | 3D rendering engine | Industry standard, huge community, perfect for the note highway and visual effects pipeline. |

---

## 3D / Rendering

| Library | Role |
|---------|------|
| `three` | Core 3D engine (scene graph, geometries, materials, renderer) |
| `@types/three` | TypeScript definitions for Three.js |
| Three.js `PostProcessing` / `EffectComposer` | Bloom, chromatic aberration and glow effects for the neon aesthetic |
| `three-stdlib` | Extended Three.js utilities (OrbitControls for debug camera, etc.) |

---

## Audio

| Library | Role | Rationale |
|---------|------|-----------|
| **Howler.js** `^2.2` | Audio playback, looping, volume | Reliable cross-browser audio with precise seek/time APIs. Fallback to Web Audio API. |
| **Web Audio API** (native) | Precise timestamp extraction | `AudioContext.currentTime` is the ground truth clock for synchronization. |

> **Sync Strategy**: The internal clock is `AudioContext.currentTime` — NOT `Date.now()`. All note scheduling and hit detection operates relative to this clock.

---

## MIDI Processing

| Library | Role | Rationale |
|---------|------|-----------|
| **`midi-file`** `^1.1` | Parse raw `.mid` binary in the browser | Lightweight, zero-dependency, returns typed JSON — no server needed. |
| **`@tonejs/midi`** *(optional upgrade)* | Higher-level MIDI abstraction | Provides BPM/tempo map helpers for more complex charts. Evaluate when needed. |

> **Chart Format**: MIDI files are parsed at load time and converted to an internal `NoteEvent[]` array:
> ```ts
> interface NoteEvent {
>   time: number;      // seconds from track start
>   pitch: number;     // MIDI note number (0–127)
>   duration: number;  // seconds
>   lane: number;      // mapped keyboard lane index (0–N)
> }
> ```

---

## State Management

No external state library is used. Game state is managed via a **finite state machine** implemented in vanilla TypeScript:

```
IDLE → LOADING → PLAYING → PAUSED → RESULT → IDLE
```

A single `GameState` class holds the authoritative state and emits typed events via a mini `EventEmitter`. This avoids framework overhead in a real-time render loop.

---

## Input

Native `KeyboardEvent` listeners managed by a singleton `InputManager`:
- `keydown` / `keyup` events stored in a `Set<string>` of currently pressed keys.
- Events are polled each frame inside the game loop (not event-driven mid-frame).
- Debounce logic prevents repeated `keydown` fires from being counted as multiple hits.

---

## UI / HUD

| Technology | Role |
|------------|------|
| Vanilla DOM + CSS | Score display, song title, combo counter overlaid on the canvas |
| CSS Custom Properties | Theming and dynamic color changes per combo state |
| Google Fonts — `Orbitron` + `Space Grotesk` | Typography (loaded via `<link>` in `index.html`) |

> **Rationale**: No React/Vue/Svelte. The game loop is the primary rendering surface. Injecting a virtual DOM lifecycle into a 60fps render loop introduces unnecessary complexity and potential jank.

---

## Tooling & Dev Experience

| Tool | Role |
|------|------|
| **ESLint** + `@typescript-eslint` | Linting — enforces `STYLE_LOCK.md` rules automatically |
| **Prettier** | Auto-formatting on save |
| **Husky** + `lint-staged` | Pre-commit hooks — no unstaged linted code reaches `main` |
| **Vitest** | Unit testing for MIDI parsing, lane mapping, and state machine logic |

---

## Hosting & CI/CD

| Platform | Role |
|----------|------|
| **GitHub** | Version control. Branches: `main` (stable), `dev` (active development) |
| **Vercel** | Zero-config deployment from GitHub. Preview URLs on every PR. |

### Vercel Config (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

---

## AI Pipeline Tools (External, not in codebase)

| Tool | Role |
|------|------|
| Suno / Udio | AI music generation |
| Demucs / LALAL.AI | Stem separation — isolate piano track |
| Spotify Basic Pitch | Audio-to-MIDI transcription |
| AnthemScore | Alternative MIDI transcription (better chord detection) |

---

## Dependency Installation

```bash
# Core
npm install three howler midi-file
npm install -D typescript vite @types/three @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint prettier vitest

# Optional upgrade (evaluate at sprint 2)
# npm install @tonejs/midi
```
