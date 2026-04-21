// @module src/core/GameLoop.ts
// Owns the requestAnimationFrame loop and the THREE.Clock for delta time.

import * as THREE from 'three';

interface IGameLoopCallbacks {
  update: (delta: number) => void;
  render: () => void;
}

/**
 * Manages the game loop. Delta time is in SECONDS.
 * Call `start()` once to begin, `stop()` to halt.
 */
export class GameLoop {
  private readonly _clock = new THREE.Clock(false);
  private _rafId: number | null = null;
  private readonly _callbacks: IGameLoopCallbacks;

  constructor(callbacks: IGameLoopCallbacks) {
    this._callbacks = callbacks;
  }

  start(): void {
    if (this._rafId !== null) return; // already running
    this._clock.start();
    this._tick();
  }

  stop(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._clock.stop();
  }

  private readonly _tick = (): void => {
    this._rafId = requestAnimationFrame(this._tick);
    const delta = this._clock.getDelta(); // seconds
    this._callbacks.update(delta);
    this._callbacks.render();
  };
}
