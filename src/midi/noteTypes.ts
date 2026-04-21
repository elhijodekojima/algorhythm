// @module src/midi/noteTypes.ts
// Core data types for the chart/note system — shared across midi, entities, and state.

/** The 10 active lane keys in order (grave → agudo), per GDD §3.1 */
export const LANE_KEYS = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyV', 'KeyB', 'KeyU', 'KeyI', 'KeyO', 'KeyP'] as const;
export type LaneKey = typeof LANE_KEYS[number];
export const LANE_COUNT = LANE_KEYS.length; // 10

/** Lane indices active per difficulty, per GDD §3.5 */
export const DIFFICULTY_LANE_MASK: Record<Difficulty, readonly number[]> = {
  easy:   [0, 1, 2, 6, 7, 8],           // Q W E  I O P
  medium: [0, 1, 2, 3, 6, 7, 8, 9],     // Q W E R  U I O P
  expert: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // all 10
};

export type Difficulty = 'easy' | 'medium' | 'expert';

export type NoteType = 'single' | 'chord' | 'sustain' | 'sustained_chord';

/**
 * A single note event from a parsed chart.
 * `lanes` is an array to support chords (1 lane = simple, 2+ lanes = chord).
 * `duration = 0` for single/chord, `> 0` for sustain.
 */
export interface INoteEvent {
  /** Seconds from song start when the note should be HIT */
  time: number;
  /** 0 for single/chord notes. Seconds for sustained notes. */
  duration: number;
  /** Array of lane indices (0–9). Length > 1 = chord. */
  lanes: readonly number[];
  /** Classifies this note for rendering and hit-detection logic */
  type: NoteType;
}

/** Per-difficulty life bar deltas, per GDD §3.5 */
export const LIFE_DELTAS: Record<Difficulty, { hit: number; miss: number }> = {
  easy:   { hit: 2.0,  miss: -0.5 },
  medium: { hit: 1.0,  miss: -1.0 },
  expert: { hit: 1.0,  miss: -2.0 },
};

/** Hit detection window centred on note.time, per GDD (single threshold) */
export const HIT_WINDOW_SECONDS = 0.08; // ±80ms

/** Seconds before hit time that a note spawns (3-second runway per GDD §3.2) */
export const LEAD_TIME = 3.0;

/** Z position of the Hit Line in Three.js world space */
export const HIT_LINE_Z = 0;

/** Z position where notes spawn (~3s before hitting at scroll speed) */
export const SPAWN_Z = -120;

/** Score per successful hit (before combo multiplier), per GDD §3.3 */
export const HIT_SCORE = 50;

/** Score per frame for sustained note while held, per GDD §3.3 */
export const SUSTAIN_SCORE_PER_FRAME = 4;

/** Combo thresholds → multipliers, per GDD §3.3 */
export const COMBO_MULTIPLIERS: Array<{ threshold: number; multiplier: number }> = [
  { threshold: 30, multiplier: 4 },
  { threshold: 20, multiplier: 3 },
  { threshold: 10, multiplier: 2 },
  { threshold:  0, multiplier: 1 },
];

/** Starting life percentage, per GDD §3.4 */
export const LIFE_START = 50;
