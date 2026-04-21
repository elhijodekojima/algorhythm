// @module src/main.ts
// Entry point — wires renderer, scene, loop, input, highway, notes, synth, and HUD.
// Sprint 2-4: Song-Test fully playable with synth audio, scoring, life bar, progress.

import { Renderer } from '@gfx/renderer';
import { createScene, createCamera } from '@gfx/scene';
import { GameLoop } from '@core/GameLoop';
import { InputManager } from '@core/InputManager';
import { NoteHighway } from '@entities/NoteHighway';
import { NotePool } from '@entities/NotePool';
import { SynthEngine } from '@audio/SynthEngine';
import { ScoreManager } from '@state/ScoreManager';
import { type INoteEvent, HIT_WINDOW_SECONDS, type Difficulty } from '@midi/noteTypes';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas      = document.getElementById('game-canvas') as HTMLCanvasElement;
const splash      = document.getElementById('splash') as HTMLDivElement;
const hudScore    = document.getElementById('hud-score') as HTMLDivElement;
const hudCombo    = document.getElementById('hud-combo') as HTMLDivElement;
const hudFeedback = document.getElementById('hud-feedback') as HTMLDivElement;
const hudSong     = document.getElementById('hud-song') as HTMLDivElement;
const hudProgress = document.getElementById('hud-progress-fill') as HTMLDivElement;
const hudLife     = document.getElementById('hud-life-fill') as HTMLDivElement;
const hudLifeBar  = document.getElementById('hud-life-bar') as HTMLDivElement;

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
let chart: INoteEvent[]    = [];
let totalDuration          = 72;
let score: ScoreManager | null = null;
let songTime               = 0;
let playing                = false;
/** Index of the next note to check for hits/misses */
let hitCheckIdx            = 0;
/** Index of the next note to spawn into the pool */
let spawnIdx               = 0;
const hitNoteIndices       = new Set<number>();
const difficulty: Difficulty = 'easy';

// ── Chart loader ──────────────────────────────────────────────────────────────
async function loadTestChart(): Promise<void> {
  const res  = await fetch('/charts/song-test.json');
  const data = await res.json() as Array<{ notes: INoteEvent[]; title: string; totalDuration: number }>;
  const song = data[0]!;
  chart         = song.notes;
  totalDuration = song.totalDuration;
  hudSong.textContent = `▶ ${song.title}`;
}

// ── Feedback HUD ──────────────────────────────────────────────────────────────
let feedbackTimer = 0;
function showFeedback(text: string, color: string): void {
  hudFeedback.textContent  = text;
  hudFeedback.style.color   = color;
  hudFeedback.style.opacity = '1';
  feedbackTimer = 0.7;
}

// ── HUD update ─────────────────────────────────────────────────────────────────
function updateHUD(): void {
  if (!score) return;

  hudScore.textContent = String(score.score).padStart(6, '0');
  hudCombo.textContent = `COMBO ×${score.multiplier}`;
  if (score.combo > 0) {
    hudCombo.classList.add('pop');
    setTimeout(() => hudCombo.classList.remove('pop'), 200);
  }

  // Life bar — color from GDD §3.4
  const life = score.life;
  hudLife.style.height = `${life}%`;
  if (life > 66) {
    hudLifeBar.dataset['state'] = 'good';
  } else if (life > 33) {
    hudLifeBar.dataset['state'] = 'mid';
  } else {
    hudLifeBar.dataset['state'] = 'danger';
  }
}

// ── Hit detection ─────────────────────────────────────────────────────────────
function detectHits(pressedLanes: number[]): void {
  if (pressedLanes.length === 0 || !score) return;

  // Search in window around current songTime
  for (let i = hitCheckIdx; i < chart.length; i++) {
    const note = chart[i]!;
    const dt   = note.time - songTime;
    if (dt >  HIT_WINDOW_SECONDS) break;   // too far ahead
    if (dt < -HIT_WINDOW_SECONDS) continue; // too late — will be caught by checkOmitted
    if (hitNoteIndices.has(i)) continue;

    const noteLanes = [...note.lanes].sort((a, b) => a - b);
    const pressed   = [...pressedLanes].sort((a, b) => a - b);
    const matches   = noteLanes.length === pressed.length &&
      noteLanes.every((l, idx) => l === pressed[idx]);

    if (matches) {
      hitNoteIndices.add(i);
      const pts = note.lanes.length > 1
        ? score.registerChordHit(note.lanes.length)
        : score.registerHit();

      note.lanes.forEach(l => highway.flashLane(l));
      note.lanes.forEach(l => synth.playLaneTone(l, Math.max(0.15, note.duration)));

      showFeedback(`+${pts}`, '#b36bff');
      updateHUD();
      return;
    }
  }

  // No matching note → input extra miss (GDD §3.4 type 1)
  if (score) {
    pressedLanes.forEach(l => { synth.playMissTone(l); highway.flashLaneMiss(l); });
    score.registerMiss();
    showFeedback('MISS', '#ff3c6e');
    updateHUD();
  }
}

/** Input omitted miss — note passed hit line unplayed (GDD §3.4 type 2) */
function checkOmittedNotes(): void {
  if (!score) return;
  while (hitCheckIdx < chart.length) {
    const note = chart[hitCheckIdx]!;
    // Note is definitively past the hit window
    if (note.time - songTime > -HIT_WINDOW_SECONDS) break;
    if (!hitNoteIndices.has(hitCheckIdx)) {
      score.registerMiss();
      notePool.markMissed(note);
      note.lanes.forEach(l => highway.flashLaneMiss(l));
      showFeedback('MISS', '#ff3c6e');
      updateHUD();
    }
    hitCheckIdx++;
  }
}

/** Spawn notes into the 3D pool 3.5 seconds before they're due */
function spawnUpcomingNotes(): void {
  while (spawnIdx < chart.length) {
    const note = chart[spawnIdx]!;
    if (note.time - songTime > 3.5) break;
    notePool.spawn(note);
    spawnIdx++;
  }
}

// ── Game loop ─────────────────────────────────────────────────────────────────
const loop = new GameLoop({
  update(delta: number): void {
    if (playing) {
      songTime = synth.audioContext.currentTime - _songStartCtxTime;

      spawnUpcomingNotes();
      checkOmittedNotes();

      const pressedLanes = input.getJustPressedLanes();
      detectHits(pressedLanes);

      notePool.update(songTime, delta);
      highway.update(delta);

      // Progress bar (GDD §3.6)
      const progress = Math.min(100, (songTime / totalDuration) * 100);
      hudProgress.style.width = `${progress}%`;

      // Feedback fade
      if (feedbackTimer > 0) {
        feedbackTimer -= delta;
        if (feedbackTimer <= 0) hudFeedback.style.opacity = '0';
      }

      // Song end
      if (songTime >= totalDuration) {
        playing = false;
        showFeedback('COMPLETE!', '#ffd166');
      }

      // Game over (GDD §3.4)
      if (score?.isGameOver) {
        playing = false;
        showFeedback('GAME OVER', '#ff3c6e');
      }
    }
    input.flush();
  },
  render(): void {
    renderer.render(scene, camera);
  },
});

let _songStartCtxTime = 0;

// ── Start test song ───────────────────────────────────────────────────────────
async function startTestSong(): Promise<void> {
  await loadTestChart();

  score         = new ScoreManager(difficulty);
  hitCheckIdx   = 0;
  spawnIdx      = 0;
  songTime      = 0;
  hitNoteIndices.clear();
  updateHUD();

  // Resume AudioContext (requires user gesture)
  if (synth.audioContext.state === 'suspended') {
    await synth.audioContext.resume();
  }

  // Schedule all chart notes as synth tones (Song-Test backing track)
  _songStartCtxTime = synth.audioContext.currentTime;
  synth.scheduleFromChart(chart, _songStartCtxTime);

  playing = true;

  // Fade out splash
  splash.style.transition = 'opacity 0.5s ease';
  splash.style.opacity    = '0';
  setTimeout(() => { splash.style.display = 'none'; }, 500);
}

// Warm up Three.js before first key
loop.start();

window.addEventListener('keydown', () => {
  if (splash.style.display !== 'none' && splash.style.opacity !== '0') {
    startTestSong().catch(err => console.error(err));
  }
}, { once: true });
