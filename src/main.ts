// @module src/main.ts
// Entry point — wires renderer, scene, loop, input, highway, notes, and synth.
// Sprint 2/3 version: Song-Test playable from splash screen.

import { Renderer } from '@gfx/renderer';
import { createScene, createCamera } from '@gfx/scene';
import { GameLoop } from '@core/GameLoop';
import { InputManager } from '@core/InputManager';
import { NoteHighway } from '@entities/NoteHighway';
import { NotePool } from '@entities/NotePool';
import { SynthEngine } from '@audio/SynthEngine';
import { ScoreManager } from '@state/ScoreManager';
import { type INoteEvent, HIT_WINDOW_SECONDS, type Difficulty } from '@midi/noteTypes';

// ── DOM refs ─────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('game-canvas') as HTMLCanvasElement;
const splash   = document.getElementById('splash') as HTMLDivElement;
const hudScore = document.getElementById('hud-score') as HTMLDivElement;
const hudCombo = document.getElementById('hud-combo') as HTMLDivElement;
const hudFeedback = document.getElementById('hud-feedback') as HTMLDivElement;
const hudSong  = document.getElementById('hud-song') as HTMLDivElement;

// ── Three.js core ─────────────────────────────────────────────────────────────
const renderer = new Renderer({ canvas });
const scene    = createScene();
const camera   = createCamera();
const input    = InputManager.getInstance();

// ── Entities ──────────────────────────────────────────────────────────────────
const highway  = new NoteHighway(scene);
const notePool = new NotePool(scene);
const synth    = new SynthEngine();

// ── Game state ────────────────────────────────────────────────────────────────
let chart: INoteEvent[] = [];
let score: ScoreManager | null = null;
let songTime = 0;
let playing  = false;
let nextNoteIdx = 0;
const difficulty: Difficulty = 'easy'; // Song-Test always starts Easy

// ── Chart loader ──────────────────────────────────────────────────────────────
async function loadTestChart(): Promise<void> {
  const res = await fetch('/charts/song-test.json');
  const data = await res.json() as Array<{ notes: INoteEvent[]; title: string; totalDuration: number }>;
  chart = data[0]!.notes;
  hudSong.textContent = `▶ ${data[0]!.title}`;
}

// ── Feedback HUD ──────────────────────────────────────────────────────────────
let feedbackTimer = 0;
function showFeedback(text: string, color: string): void {
  hudFeedback.textContent = text;
  hudFeedback.style.color = color;
  hudFeedback.style.opacity = '1';
  feedbackTimer = 0.7;
}

// ── Hit detection ─────────────────────────────────────────────────────────────
const hitNoteIndices = new Set<number>(); // indices already consumed

function detectHits(pressedLanes: number[]): void {
  if (pressedLanes.length === 0) return;

  // Find the nearest upcoming note within hit window
  for (let i = nextNoteIdx; i < chart.length; i++) {
    const note = chart[i]!;
    const dt = note.time - songTime;
    if (dt > HIT_WINDOW_SECONDS) break; // too far ahead
    if (dt < -HIT_WINDOW_SECONDS) continue; // too late
    if (hitNoteIndices.has(i)) continue; // already hit

    // Check if pressed lanes match note lanes
    const noteLanes = [...note.lanes].sort();
    const pressed   = [...pressedLanes].sort();
    const matches = noteLanes.length === pressed.length &&
      noteLanes.every((l, idx) => l === pressed[idx]);

    if (matches) {
      hitNoteIndices.add(i);
      const pts = note.lanes.length > 1
        ? score!.registerChordHit(note.lanes.length)
        : score!.registerHit();

      // Flash lanes
      note.lanes.forEach(l => highway.flashLane(l));
      // Play synth tones
      note.lanes.forEach(l => synth.playLaneTone(l, Math.max(0.15, note.duration)));

      showFeedback(`+${pts}`, '#b36bff');
      updateHUD();
      return;
    }
  }

  // No matching note → input extra miss
  pressedLanes.forEach(l => {
    synth.playMissTone(l);
    highway.flashLaneMiss(l);
  });
  score!.registerMiss();
  showFeedback('MISS', '#ff3c6e');
  updateHUD();
}

function checkOmittedNotes(): void {
  while (nextNoteIdx < chart.length) {
    const note = chart[nextNoteIdx]!;
    if (note.time - songTime > -HIT_WINDOW_SECONDS) break; // not yet missed
    if (!hitNoteIndices.has(nextNoteIdx)) {
      // Missed note — mark it
      score!.registerMiss();
      note.lanes.forEach(l => highway.flashLaneMiss(l));
      showFeedback('MISS', '#ff3c6e');
      updateHUD();
    }
    nextNoteIdx++;
  }
}

// ── HUD update ────────────────────────────────────────────────────────────────
function updateHUD(): void {
  if (!score) return;
  hudScore.textContent = String(score.score).padStart(6, '0');
  hudCombo.textContent = `COMBO ×${score.combo > 0 ? Math.floor(score.combo / 10) + 1 : 1}`;
}

// ── Spawn upcoming notes ──────────────────────────────────────────────────────
function spawnUpcomingNotes(): void {
  for (let i = nextNoteIdx; i < chart.length; i++) {
    const note = chart[i]!;
    // Spawn 3.5 seconds ahead so the note pool is ready
    if (note.time - songTime > 3.5) break;
    if (!hitNoteIndices.has(i) && notePool.active.findIndex(n => n.event === note) === -1) {
      notePool.spawn(note);
    }
  }
}

// ── Game loop callbacks ───────────────────────────────────────────────────────
const loop = new GameLoop({
  update(delta: number): void {
    if (playing) {
      // Use SynthEngine AudioContext as master clock
      songTime = synth.audioContext.currentTime - _songStartCtxTime;

      spawnUpcomingNotes();
      checkOmittedNotes();

      // Pressed lanes this frame
      const pressedLanes = input.getJustPressedLanes();
      detectHits(pressedLanes);

      notePool.update(songTime, delta);
      highway.update(delta);

      // Feedback fade
      if (feedbackTimer > 0) {
        feedbackTimer -= delta;
        if (feedbackTimer <= 0) {
          hudFeedback.style.opacity = '0';
        }
      }
    }

    input.flush();
  },
  render(): void {
    renderer.render(scene, camera);
  },
});

let _songStartCtxTime = 0;

// ── Start game ────────────────────────────────────────────────────────────────
async function startTestSong(): Promise<void> {
  await loadTestChart();
  score = new ScoreManager(difficulty);
  nextNoteIdx = 0;
  songTime = 0;
  hitNoteIndices.clear();

  // Resume AudioContext (browsers require user gesture)
  if (synth.audioContext.state === 'suspended') {
    await synth.audioContext.resume();
  }

  _songStartCtxTime = synth.audioContext.currentTime;
  playing = true;

  // Hide splash
  splash.style.transition = 'opacity 0.5s ease';
  splash.style.opacity = '0';
  setTimeout(() => { splash.style.display = 'none'; }, 500);
}

// Start loop immediately (warms up Three.js before first key)
loop.start();

// Any key dismisses splash and starts test song
window.addEventListener('keydown', () => {
  if (splash.style.display !== 'none') {
    startTestSong().catch(console.error);
  }
}, { once: true });
