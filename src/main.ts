// @module src/main.ts
// Game orchestrator — wires FSM, UIManager, Three.js, audio, and gameplay loop.

import { Renderer }           from '@gfx/renderer';
import { createScene, createCamera } from '@gfx/scene';
import { GameLoop }           from '@core/GameLoop';
import { InputManager }       from '@core/InputManager';
import { NoteHighway }        from '@entities/NoteHighway';
import { NotePool }           from '@entities/NotePool';
import { SynthEngine }        from '@audio/SynthEngine';
import { HitParticles }       from '@gfx/HitParticles';
import { ScoreManager }       from '@state/ScoreManager';
import { GameStateMachine }   from '@state/GameStateMachine';
import { UIManager }          from '@ui/UIManager';
import { getSong, markCompleted } from '@ui/songs';
import {
  type INoteEvent,
  HIT_WINDOW_SECONDS,
  type Difficulty,
} from '@midi/noteTypes';
import type { ISongMeta } from '@ui/songs';

// ── Three.js core ─────────────────────────────────────────────────────────────
const canvas   = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const scene    = createScene();
const camera   = createCamera();
const input    = InputManager.getInstance();

// ── Entities ──────────────────────────────────────────────────────────────────
const highway  = new NoteHighway(scene);
const notePool = new NotePool(scene);
const synth     = new SynthEngine();
const particles = new HitParticles(scene);

// ── State ─────────────────────────────────────────────────────────────────────
const fsm = new GameStateMachine();

// ── UI ────────────────────────────────────────────────────────────────────────
const ui = new UIManager({
  onStartTestSong() { void _startSong(getSong('song-test'), 'easy'); },
  onSongChosen(song: ISongMeta)     { fsm.toDifficultySelect(song); },
  onDifficultyChosen(diff: Difficulty) { void _startSong(fsm.context.song!, diff); },
  onRetry()      { void _startSong(fsm.context.song!, fsm.context.difficulty!); },
  onMainMenu()   { _stopSong(); fsm.toMainMenu(); },
  onSongSelect() { _stopSong(); fsm.toSongSelect(); },
  onResume()     { fsm.toResumed(); },
  onVolumeChange(v: number) { synth.setMasterVolume(v); },
  onOffsetChange(_ms: number){ /* offset wired in future when AudioEngine is used */ },
});

fsm.on((state, ctx) => ui.onStateChange(state, ctx));

// ── Gameplay state ────────────────────────────────────────────────────────────
let chart: INoteEvent[]  = [];
let totalDuration        = 72;
let score: ScoreManager | null = null;
let songTime             = 0;
let hitCheckIdx          = 0;
let spawnIdx             = 0;
const hitNoteSet         = new Set<number>();
let _songStartCtxTime    = 0;

// ── HUD DOM refs ──────────────────────────────────────────────────────────────
const hudScore    = document.getElementById('hud-score')         as HTMLDivElement;
const hudCombo    = document.getElementById('hud-combo')         as HTMLDivElement;
const hudFeedback = document.getElementById('hud-feedback')      as HTMLDivElement;
const hudSong     = document.getElementById('hud-song')          as HTMLDivElement;
const hudDiff     = document.getElementById('hud-difficulty')    as HTMLDivElement;
const hudProgress = document.getElementById('hud-progress-fill') as HTMLDivElement;
const hudLife     = document.getElementById('hud-life-fill')     as HTMLDivElement;
const hudLifeBar  = document.getElementById('hud-life-bar')      as HTMLDivElement;
let feedbackTimer = 0;

// ── Volume/Offset slider live labels ─────────────────────────────────────────
const volSlider = document.getElementById('opt-volume') as HTMLInputElement;
const volLabel  = document.getElementById('opt-vol-value') as HTMLSpanElement;
volSlider?.addEventListener('input', () => { volLabel.textContent = `${volSlider.value}%`; });

// ── Chart loader ──────────────────────────────────────────────────────────────
async function _loadChart(song: ISongMeta): Promise<void> {
  const res  = await fetch(song.chartPath);
  const data = await res.json() as Array<{ notes: INoteEvent[]; totalDuration?: number }>;
  chart         = data[0]?.notes ?? [];
  totalDuration = data[0]?.totalDuration ?? song.duration;
}

// ── Countdown helper ──────────────────────────────────────────────────────────
async function _runCountdown(): Promise<void> {
  for (const tick of [3, 2, 1]) {
    ui.showCountdownTick(tick);
    await _sleep(900);
  }
  ui.showCountdownTick('GO!');
  await _sleep(600);
  ui.hideCountdown();
}

function _sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Start / Stop song ─────────────────────────────────────────────────────────
async function _startSong(song: ISongMeta, diff: Difficulty): Promise<void> {
  _stopSong();

  // Load chart
  try { await _loadChart(song); }
  catch { console.error('Failed to load chart:', song.chartPath); fsm.toMainMenu(); return; }

  // Set up score
  score        = new ScoreManager(diff);
  hitCheckIdx  = 0;
  spawnIdx     = 0;
  songTime     = 0;
  hitNoteSet.clear();

  // HUD labels
  hudSong.textContent  = `▶ ${song.title}`;
  hudDiff.textContent  = diff.toUpperCase();
  _updateHUD();
  ui.showHUD(false);

  // Always sync FSM context so Retry works from ANY start path
  // (Quick Test bypasses toDifficultySelect, so context.song would be null)
  fsm.context.song       = song;
  fsm.context.difficulty = diff;

  // Countdown
  fsm.toCountdown(diff);
  await _runCountdown();

  // Resume AudioContext
  if (synth.audioContext.state === 'suspended') await synth.audioContext.resume();

  // For song-test: use SynthEngine as clock + schedule tones
  _songStartCtxTime = synth.audioContext.currentTime;
  synth.scheduleFromChart(chart, _songStartCtxTime);

  fsm.toPlaying();
  _playing = true;
}

function _stopSong(): void {
  _playing = false;
  synth.cancelScheduled();
  notePool.active.length = 0; // clear visual notes
}

// ── Game loop control flag ────────────────────────────────────────────────────
let _playing = false;

// ── HUD update ────────────────────────────────────────────────────────────────
function _updateHUD(): void {
  if (!score) return;
  hudScore.textContent = String(score.score).padStart(6, '0');
  hudCombo.textContent = `COMBO ×${score.multiplier}`;
  if (score.combo > 0) {
    hudCombo.classList.add('pop');
    setTimeout(() => hudCombo.classList.remove('pop'), 180);
  }
  const life = score.life;
  hudLife.style.height = `${life}%`;
  hudLifeBar.dataset['state'] = life > 66 ? 'good' : life > 33 ? 'mid' : 'danger';
}

// ── Feedback flash ────────────────────────────────────────────────────────────
function _feedback(text: string, color: string): void {
  hudFeedback.textContent  = text;
  hudFeedback.style.color   = color;
  hudFeedback.style.opacity = '1';
  feedbackTimer = 0.7;
}

// ── Screen flash (CSS radial glow at bottom of screen) ────────────────────────
const _flashEl = document.getElementById('hit-flash')!;
function _screenFlash(type: 'hit' | 'miss', hexColor = '#b36bff'): void {
  _flashEl.style.setProperty('--flash-color', hexColor + '38'); // ~22% alpha
  _flashEl.classList.remove('flash-hit', 'flash-miss');
  void _flashEl.offsetWidth; // force reflow to restart animation
  _flashEl.classList.add(type === 'hit' ? 'flash-hit' : 'flash-miss');
}

// ── Hit / Miss detection ──────────────────────────────────────────────────────
function _detectHits(lanes: number[]): void {
  if (lanes.length === 0 || !score) return;

  for (let i = hitCheckIdx; i < chart.length; i++) {
    const note = chart[i]!;
    const dt   = note.time - songTime;
    if (dt >  HIT_WINDOW_SECONDS) break;
    if (dt < -HIT_WINDOW_SECONDS) continue;
    if (hitNoteSet.has(i)) continue;

    const noteLanes = [...note.lanes].sort((a, b) => a - b);
    const pressed   = [...lanes].sort((a, b) => a - b);
    if (noteLanes.length === pressed.length && noteLanes.every((l, x) => l === pressed[x])) {
      hitNoteSet.add(i);
      const pts = note.lanes.length > 1
        ? score.registerChordHit(note.lanes.length)
        : score.registerHit();
      note.lanes.forEach(l => { highway.flashLane(l); synth.playLaneTone(l, Math.max(0.15, note.duration)); });

      // Particles + screen flash on hit
      particles.spawnChordBurst(note.lanes);
      const laneColor = ['#b36bff','#00f5ff','#ff3c6e','#ffd166','#7efff5','#ff6eb4','#6bffb3','#b3ff6b','#ff9f6b','#6b9fff'][note.lanes[0] ?? 0] ?? '#b36bff';
      _screenFlash('hit', laneColor);

      _feedback(`+${pts}`, laneColor);
      _updateHUD();
      return;
    }
  }

  // Input without matching note — brief miss sparks per lane
  lanes.forEach(l => {
    synth.playMissTone(l);
    highway.flashLaneMiss(l);
    particles.spawnBurst(l, true);
  });
  _screenFlash('miss', '#ff3c6e');
  score.registerMiss();
  _feedback('MISS', '#ff3c6e');
  _updateHUD();
}

function _checkOmitted(): void {
  if (!score) return;
  while (hitCheckIdx < chart.length) {
    const note = chart[hitCheckIdx]!;
    if (note.time - songTime > -HIT_WINDOW_SECONDS) break;
    if (!hitNoteSet.has(hitCheckIdx)) {
      score.registerMiss();
      notePool.markMissed(note);
      note.lanes.forEach(l => {
        highway.flashLaneMiss(l);
        particles.spawnBurst(l, true); // small red spark on miss
      });
      _feedback('MISS', '#ff3c6e');
      _updateHUD();
    }
    hitCheckIdx++;
  }
}

function _spawnNotes(): void {
  while (spawnIdx < chart.length) {
    const note = chart[spawnIdx]!;
    if (note.time - songTime > 3.5) break;
    notePool.spawn(note);
    spawnIdx++;
  }
}

// ── ESC key — pause toggle ────────────────────────────────────────────────────
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    if (fsm.state === 'PLAYING') { fsm.toPaused(); }
    else if (fsm.state === 'PAUSED') { fsm.toResumed(); }
  }
});

// ── Main game loop ────────────────────────────────────────────────────────────
const loop = new GameLoop({
  update(delta: number): void {
    if (_playing && fsm.state === 'PLAYING' && score) {
      songTime = synth.audioContext.currentTime - _songStartCtxTime;

      _spawnNotes();
      _checkOmitted();
      _detectHits(input.getJustPressedLanes());

      notePool.update(songTime, delta);
      particles.update(delta);
      highway.update(delta);

      // Progress bar
      hudProgress.style.width = `${Math.min(100, (songTime / totalDuration) * 100)}%`;

      // Feedback fade
      if (feedbackTimer > 0) {
        feedbackTimer -= delta;
        if (feedbackTimer <= 0) hudFeedback.style.opacity = '0';
      }

      // Song complete
      if (songTime >= totalDuration) {
        _playing = false;
        synth.cancelScheduled(); // stop all pre-scheduled audio
        const s = score;
        if (fsm.context.song) markCompleted(fsm.context.song.id);
        fsm.toResults(s.score, s.accuracy, s.stars);
        return;
      }

      // Game Over
      if (score.isGameOver) {
        _playing = false;
        synth.cancelScheduled(); // stop all pre-scheduled audio immediately
        const s        = score;
        const progress = (songTime / totalDuration) * 100;
        fsm.toGameOver(s.score, s.accuracy, progress);
        return;
      }
    }
    input.flush();
  },
  render(): void {
    renderer.render(scene, camera);
  },
});

// ── Boot ──────────────────────────────────────────────────────────────────────
loop.start();
// Initial state emit to set up main menu correctly
fsm.toMainMenu();
