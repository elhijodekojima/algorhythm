# 🎹 Algorhythm

> A 3D rhythm game in the style of Guitar Hero, played on a QWERTY keyboard as a piano. Music composed by AI, transcribed to MIDI automatically, rendered in Three.js — built 100% through vibe coding.

[![Vibe Jam 2026](https://img.shields.io/badge/Vibe%20Jam-2026-blueviolet)](https://vibej.am/2026/)
[![Built with Three.js](https://img.shields.io/badge/Three.js-3D%20Engine-black)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com/)

---

## 🎮 Concept

**Algorhythm** is a browser-based 3D rhythm game where notes fall from the sky — timed precisely to AI-generated music — and you catch them by pressing the corresponding keys on your QWERTY keyboard, mapped as a piano.

No downloads. No login. Just open the page and play.

---

## 🤖 The AI Pipeline

Every track in the game is born entirely from artificial intelligence:

```
1. GENERATION      →  Full song created via Suno / Udio (AI music model)
       ↓
2. STEM ISOLATION  →  Piano track extracted using Demucs / LALAL.AI
       ↓
3. MIDI TRANSCRIPTION →  Audio-to-MIDI via Spotify Basic Pitch / AnthemScore
       ↓
4. CHART IMPORT    →  MIDI parsed in-browser → timestamps mapped to note lanes
       ↓
5. GAMEPLAY        →  3D note highway rendered in Three.js, synced to audio
```

---

## 🎹 QWERTY → Piano Mapping

Keys are mapped across two hands on the home row of the keyboard:

| Key Lane | LEFT HAND         | RIGHT HAND        |
|----------|-------------------|-------------------|
| Fingers  | A · S · D · F · G | H · J · K · L · ; |
| + Upper  | Q · W · E · R · T | Y · U · I · O · P |

Each lane corresponds to a set of MIDI note pitches, remapped from the original piano chart.

---

## 🛠️ Tech Stack (Summary)

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| 3D Rendering       | Three.js                            |
| Language           | TypeScript (strict)                 |
| Build Tool         | Vite                                |
| MIDI Parsing       | `midi-file` (browser-compatible)    |
| Audio Playback     | Web Audio API / Howler.js           |
| UI Framework       | Vanilla DOM (no React)              |
| Hosting            | Vercel                              |
| Version Control    | GitHub                              |

> See `STACK.md` for the complete breakdown with justifications.

---

## 🚀 Local Development

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install & Run

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/algorhythm.git
cd algorhythm

# Install dependencies
npm install

# Start the dev server (hot reload)
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
npm run preview  # preview the production build locally
```

---

## ☁️ Deploy to Vercel

### Option A — Automatic (GitHub Integration)

1. Push the repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Vercel auto-detects Vite. Set:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Click **Deploy**. Done.

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel
# Follow the prompts — select the project root.
```

---

## 🏆 Vibe Jam 2026

This game is an official entry for [Cursor Vibe Jam 2026](https://vibej.am/2026/).

> **90%+ of this codebase was written by AI (Antigravity / Cursor).**

The required participation widget is included in `index.html`:

```html
<script async src="https://vibej.am/2026/widget.js"></script>
```

See `RULES.md` for full competition rules and participation requirements.

**Submission deadline:** 1 MAY 2026 @ 13:37 UTC

---

## 📂 Project Structure

```
algorhythm/
├── public/
│   ├── tracks/          # MIDI + audio files per song
│   └── assets/         # Textures, fonts
├── src/
│   ├── core/           # Game loop, clock, input manager
│   ├── gfx/            # Three.js scene, camera, renderer, shaders
│   ├── midi/           # MIDI parser, chart builder, note mapper
│   ├── audio/          # Audio engine, sync manager
│   ├── entities/       # Note, Highway, Lane, HUD
│   ├── state/          # GameState machine (idle → playing → result)
│   └── main.ts         # Entry point
├── ANTIGRAVITY.md      # AI assistant system instructions
├── MEMORY.md           # Decision log
├── NEXT_STEPS.md       # Active backlog
├── RULES.md            # Vibe Jam 2026 rules
├── STACK.md            # Full tech stack documentation
├── STYLE_LOCK.md       # Code conventions & visual style
└── vite.config.ts
```

---

## 🪪 License

MIT — built with vibes. ✨
