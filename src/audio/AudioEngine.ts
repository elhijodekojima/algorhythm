// @module src/audio/AudioEngine.ts
// Howler.js wrapper for MP3/OGG playback. AudioContext is the master clock (ADR-004).
// SynthEngine handles the Song-Test; this class handles real tracks.

import { Howl } from 'howler';

export interface IAudioEngineOptions {
  src: string[];      // array of audio sources (e.g. ['.mp3', '.ogg'])
  volume?: number;    // 0–1, default 1
  offsetMs?: number;  // manual sync offset in milliseconds
}

export class AudioEngine {
  private _howl: Howl | null = null;
  private _startAudioTime = 0;   // AudioContext.currentTime when play() was called
  private _offsetSeconds = 0;
  private _ctx: AudioContext | null = null;
  private _playing = false;

  constructor(private _options: IAudioEngineOptions) {
    this._offsetSeconds = (_options.offsetMs ?? 0) / 1000;
  }

  load(src: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this._howl = new Howl({
        src,
        html5: false, // Use Web Audio for precise timing
        volume: this._options.volume ?? 1.0,
        onload: () => resolve(),
        onloaderror: (_id, err) => reject(err),
      });
    });
  }

  play(): void {
    if (!this._howl) return;
    // Capture AudioContext reference from Howler's internals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Howler internal API
    const ctx = (Howler as any).ctx as AudioContext;
    if (ctx) {
      this._ctx = ctx;
      this._startAudioTime = ctx.currentTime;
    }
    this._howl.play();
    this._playing = true;
  }

  pause(): void {
    this._howl?.pause();
    this._playing = false;
  }

  resume(): void {
    if (!this._howl || !this._ctx) return;
    this._howl.play();
    this._startAudioTime = this._ctx.currentTime - this.songTime;
    this._playing = true;
  }

  stop(): void {
    this._howl?.stop();
    this._playing = false;
  }

  /**
   * Current song position in seconds, accounting for manual offset.
   * This is the SINGLE SOURCE OF TRUTH for note positioning (ADR-004).
   */
  get songTime(): number {
    if (!this._ctx || !this._playing) return 0;
    return this._ctx.currentTime - this._startAudioTime + this._offsetSeconds;
  }

  get isPlaying(): boolean {
    return this._playing;
  }

  set volume(v: number) {
    this._howl?.volume(Math.max(0, Math.min(1, v)));
  }

  /**
   * Duck the volume temporarily (for "input omitted" miss feedback, GDD §3.4)
   * @param durationMs - how long to duck in milliseconds
   */
  duckVolume(durationMs = 300): void {
    if (!this._howl) return;
    const original = this._howl.volume();
    this._howl.volume(original * 0.25);
    setTimeout(() => { this._howl?.volume(original); }, durationMs);
  }

  /** Update offset without restarting (for Options menu, GDD §4) */
  setOffset(ms: number): void {
    this._offsetSeconds = ms / 1000;
  }

  dispose(): void {
    this._howl?.unload();
    this._howl = null;
  }
}
