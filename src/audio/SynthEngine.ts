// @module src/audio/SynthEngine.ts
// Generates a simple piano-like tone for the Song-Test feature (GDD §8).
// Uses Web Audio API oscillators — zero file dependencies.
// Will be retired when real MP3 tracks are integrated.

/** A playable note with frequency and duration */
interface ISynthNote {
  freq: number;
  startTime: number; // seconds from song start
  duration: number;  // seconds
}

/** Simple piano frequencies for the 10 lanes (Q→P, grave→agudo) */
const LANE_FREQS: readonly number[] = [
  261.63, // C4  — Q
  293.66, // D4  — W
  329.63, // E4  — E
  349.23, // F4  — R
  392.00, // G4  — V
  440.00, // A4  — B
  493.88, // B4  — U
  523.25, // C5  — I
  587.33, // D5  — O
  659.25, // E5  — P
];

export class SynthEngine {
  private readonly _ctx: AudioContext;
  private readonly _masterGain: GainNode;
  private _scheduledNotes: AudioBufferSourceNode[] = [];

  constructor() {
    this._ctx = new AudioContext();
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = 0.4;
    this._masterGain.connect(this._ctx.destination);
  }

  /** Play a single note immediately (for hit/input feedback) */
  playLaneTone(laneIdx: number, duration = 0.3): void {
    const freq = LANE_FREQS[laneIdx] ?? 440;
    this._playTone(freq, this._ctx.currentTime, duration);
  }

  /** Play a distorted miss sound */
  playMissTone(laneIdx: number): void {
    const freq = (LANE_FREQS[laneIdx] ?? 440) * 0.97; // slightly detuned
    this._playTone(freq, this._ctx.currentTime, 0.15, true);
  }

  /** Pre-schedule all notes in the chart for the Song-Test */
  scheduleSong(notes: ISynthNote[], startTime: number): void {
    this.cancelScheduled();
    for (const note of notes) {
      this._playTone(note.freq, startTime + note.startTime, Math.max(0.15, note.duration));
    }
  }

  /**
   * Schedule an INoteEvent[] directly — converts lanes to frequencies.
   * Each lane in a chord gets its own tone. Call after AudioContext resume.
   */
  scheduleFromChart(
    events: ReadonlyArray<{ time: number; duration: number; lanes: readonly number[] }>,
    startTime: number,
  ): void {
    this.cancelScheduled();
    for (const event of events) {
      for (const lane of event.lanes) {
        const freq = LANE_FREQS[lane] ?? 440;
        this._playTone(freq, startTime + event.time, Math.max(0.15, event.duration));
      }
    }
  }

  cancelScheduled(): void {
    this._scheduledNotes.forEach(n => {
      try { n.stop(); } catch (_) { /* already stopped */ }
    });
    this._scheduledNotes = [];
  }

  /** Set master gain (0–1). Mirrors Options volume slider. */
  setMasterVolume(v: number): void {
    this._masterGain.gain.value = Math.max(0, Math.min(1, v)) * 0.4;
  }

  get audioContext(): AudioContext {
    return this._ctx;
  }

  private _playTone(freq: number, when: number, duration: number, distorted = false): void {
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.type = distorted ? 'sawtooth' : 'sine';
    osc.frequency.value = freq;

    // Piano-like envelope: fast attack, medium decay
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(distorted ? 0.15 : 0.5, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);

    osc.connect(gain);
    gain.connect(this._masterGain);

    osc.start(when);
    osc.stop(when + duration + 0.01);
  }

  dispose(): void {
    this.cancelScheduled();
    this._ctx.close();
  }
}
