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

### 🎵 Music Generation

| Tool | Role |
|------|------|
| Suno / Udio | AI music generation (full song) |

---

### 🎛️ Stem Separation — Tool Comparison & Recommendation

This is the most critical step in the pipeline: isolating the **piano stem** from a full mix.

| Tool | Repo | Piano Stem? | Quality | Maintenance | Verdict |
|------|------|-------------|---------|-------------|-------|
| **Demucs `htdemucs_6s`** | [facebookresearch/demucs](https://github.com/facebookresearch/demucs) | ✅ Dedicated stem | Good for transcription, audible artifacts for production | Active | ✅ **Good enough for our use case** |
| **audio-separator** | [nomadkaraoke/python-audio-separator](https://github.com/nomadkaraoke/python-audio-separator) | ✅ Via UVR models | Excellent — best-in-class MDX-Net models | Very Active | 🏆 **Recommended** |
| **UVR5 (Ultimate Vocal Remover)** | [Anjok07/ultimatevocalremovergui](https://github.com/Anjok07/ultimatevocalremovergui) | ✅ Ensemble mode | Best-in-class | Very Active | 🏆 **Best quality, GUI-based** |
| **Spleeter** | [deezer/spleeter](https://github.com/deezer/spleeter) | ✅ 5-stem model | Outdated, artifacts | **Abandoned** (TensorFlow 1.x) | ❌ Avoid |
| **LALAL.AI** | SaaS, not open source | ✅ | Commercial-grade | N/A | 💰 Paid, not open-source |

#### 🏆 Recommendation: `audio-separator` + `python-audio-separator`

**Repo:** https://github.com/nomadkaraoke/python-audio-separator

```bash
pip install audio-separator
audio-separator track.mp3 --model_filename UVR-MDX-NET-Inst_HQ_4.onnx
```

**Why it beats plain Demucs for our use case:**
- Wraps Demucs AND the full library of **UVR/MDX-Net ONNX models** in one clean Python API
- MDX-Net-based models consistently outperform `htdemucs_6s` on piano isolation in blind tests
- **ONNX runtime** — no CUDA required, runs on CPU (slower but viable for Vercel Functions / Modal)
- One package, one command, swap models at will
- Actively maintained (vs. Demucs which focuses on research, not DX)

**Recommended model sequence for piano extraction:**
```
1. audio-separator (MDX-Net Inst HQ)  →  removes vocals → instrumental
2. audio-separator (UVR-MDX-NET Piano) →  isolates piano from instrumental
3. basic-pitch                          →  piano audio → MIDI chart
```

---

### 🎹 Audio-to-MIDI Transcription

| Tool | Repo | Notes |
|------|------|-------|
| **Spotify Basic Pitch** | [spotify/basic-pitch](https://github.com/spotify/basic-pitch) | ✅ **Recommended** — Python + browser WASM, polyphonic piano |
| AnthemScore | Desktop app (paid) | Better chord detection, but closed-source |

---

### 🏗️ Future: Custom Song Submission Architecture

> This feature is **not in scope for the Vibe Jam deadline** but is designed into the architecture from the start.

When players submit their own songs, the processing pipeline runs **server-side** (not in the browser — ML models are too heavy).

#### Option A — Replicate API (Recommended for MVP)

- Users upload audio → stored in **Vercel Blob Storage**
- Vercel Function calls **[Replicate `cjwbw/demucs`](https://replicate.com/cjwbw/demucs)** with the file URL
- Replicate runs GPU-accelerated Demucs, returns stem URLs via **webhook**
- Backend runs Basic Pitch on the piano stem → generates MIDI JSON
- Chart stored and linked to the user submission

```
user upload → Vercel Blob → Replicate API (Demucs) → webhook → Basic Pitch → MIDI chart → stored
```

**Cost**: ~$0.01–0.05 per song (pay-per-GPU-second)

#### Option B — Modal.com (Better long-term)

- Deploy `audio-separator` + `basic-pitch` as a **Modal serverless function**
- Full control over models, no per-model restrictions
- Cold starts ~5s, warm starts <1s
- Cost comparable to Replicate but full model flexibility

#### Submission Limits (to define in Sprint 5+)

| Limit | Proposed Value | Reason |
|-------|---------------|--------|
| File size | Max 20MB | Keeps processing time <60s |
| Format | MP3, WAV, FLAC | Demucs works best with WAV/FLAC |
| Duration | Max 5 min | Processing cost control |
| Submissions/day per user | 3 | Abuse prevention |
| Moderation | Auto-flag explicit content | Community safety |

---

## Dependency Installation

```bash
# Core game
npm install three howler midi-file
npm install -D typescript vite @types/three @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint prettier vitest

# Optional upgrade (evaluate at sprint 2)
# npm install @tonejs/midi

# Future: Custom Song Submission backend (Python)
# pip install audio-separator basic-pitch
```
