// @module src/state/ScoreManager.ts
// Manages score, combo, life bar, and accuracy tracking per GDD §3.3/3.4.

import {
  HIT_SCORE, SUSTAIN_SCORE_PER_FRAME, COMBO_MULTIPLIERS,
  LIFE_START, LIFE_DELTAS, type Difficulty,
} from '@midi/noteTypes';

export class ScoreManager {
  private _score = 0;
  private _combo = 0;
  private _totalNotes = 0;
  private _hitNotes = 0;
  private _life = LIFE_START;
  private readonly _deltas: { hit: number; miss: number };

  constructor(difficulty: Difficulty) {
    this._deltas = LIFE_DELTAS[difficulty];
  }

  /** Register a successful hit. Returns points awarded. */
  registerHit(): number {
    this._combo++;
    this._hitNotes++;
    this._totalNotes++;
    this._life = Math.min(100, this._life + this._deltas.hit);
    const pts = HIT_SCORE * this._multiplier;
    this._score += pts;
    return pts;
  }

  /** Register a chord hit (all lanes correct). Per GDD: score = 50 × numNotes × multiplier */
  registerChordHit(noteCount: number): number {
    this._combo++;
    this._hitNotes++;
    this._totalNotes++;
    this._life = Math.min(100, this._life + this._deltas.hit);
    const pts = HIT_SCORE * noteCount * this._multiplier;
    this._score += pts;
    return pts;
  }

  /** Register a miss (input extra or omitted). Resets combo. */
  registerMiss(): void {
    this._combo = 0;
    this._totalNotes++;
    this._life = Math.max(0, this._life + this._deltas.miss);
  }

  /** Call each frame a sustained note is held (GDD: +4 pts/frame) */
  registerSustainFrame(): number {
    const pts = SUSTAIN_SCORE_PER_FRAME * this._multiplier;
    this._score += pts;
    return pts;
  }

  /** Returns true if the life bar has reached 0 — Game Over */
  get isGameOver(): boolean {
    return this._life <= 0;
  }

  get score(): number { return this._score; }
  get combo(): number { return this._combo; }
  get life(): number { return this._life; } // 0–100
  get multiplier(): number { return this._multiplier; }

  /** Percentage of notes successfully hit */
  get accuracy(): number {
    if (this._totalNotes === 0) return 100;
    return (this._hitNotes / this._totalNotes) * 100;
  }

  /** Star rating 3–6 based on accuracy, per GDD §6.6 */
  get stars(): number {
    const acc = this.accuracy;
    if (acc === 100) return 6;
    if (acc >= 90)  return 5;
    if (acc >= 80)  return 4;
    return 3;
  }

  private get _multiplier(): number {
    for (const entry of COMBO_MULTIPLIERS) {
      if (this._combo >= entry.threshold) return entry.multiplier;
    }
    return 1;
  }
}
