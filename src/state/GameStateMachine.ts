// @module src/state/GameStateMachine.ts
// Finite State Machine for the full game loop (GDD §7: State Machine).
// Each state transition emits an event that the UI and game loop listen to.

import type { Difficulty } from '@midi/noteTypes';
import type { ISongMeta } from '@ui/songs';

export type GameStateId =
  | 'MAIN_MENU'
  | 'SONG_SELECT'
  | 'DIFFICULTY_SELECT'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'PAUSED'
  | 'RESULTS'
  | 'GAME_OVER';

export interface IGameContext {
  song: ISongMeta | null;
  difficulty: Difficulty | null;
  score: number;
  accuracy: number;
  stars: number;
  progressAtFail: number; // 0–100, only used in GAME_OVER
}

type TransitionListener = (to: GameStateId, ctx: IGameContext) => void;

export class GameStateMachine {
  private _state: GameStateId = 'MAIN_MENU';
  private _listeners: TransitionListener[] = [];

  readonly context: IGameContext = {
    song: null,
    difficulty: null,
    score: 0,
    accuracy: 0,
    stars: 3,
    progressAtFail: 0,
  };

  get state(): GameStateId { return this._state; }

  on(fn: TransitionListener): void {
    this._listeners.push(fn);
  }

  private _emit(): void {
    for (const fn of this._listeners) fn(this._state, this.context);
  }

  // ── Transitions ──────────────────────────────────────────────────────────
  toMainMenu(): void {
    this._state = 'MAIN_MENU';
    this.context.song = null;
    this.context.difficulty = null;
    this._emit();
  }

  toSongSelect(): void {
    this._state = 'SONG_SELECT';
    this._emit();
  }

  toDifficultySelect(song: ISongMeta): void {
    this.context.song = song;
    this._state = 'DIFFICULTY_SELECT';
    this._emit();
  }

  toCountdown(difficulty: Difficulty): void {
    this.context.difficulty = difficulty;
    this._state = 'COUNTDOWN';
    this._emit();
  }

  toPlaying(): void {
    this._state = 'PLAYING';
    this._emit();
  }

  toPaused(): void {
    if (this._state !== 'PLAYING') return;
    this._state = 'PAUSED';
    this._emit();
  }

  toResumed(): void {
    if (this._state !== 'PAUSED') return;
    this._state = 'PLAYING';
    this._emit();
  }

  toResults(score: number, accuracy: number, stars: number): void {
    this.context.score = score;
    this.context.accuracy = accuracy;
    this.context.stars = stars;
    this._state = 'RESULTS';
    this._emit();
  }

  toGameOver(score: number, accuracy: number, progressPercent: number): void {
    this.context.score = score;
    this.context.accuracy = accuracy;
    this.context.progressAtFail = progressPercent;
    this._state = 'GAME_OVER';
    this._emit();
  }
}
