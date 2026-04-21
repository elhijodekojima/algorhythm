// @module src/core/InputManager.ts
// SINGLETON — manages all keyboard input for the game loop.
// Updated per GDD §3.1: 10 active keys are Q W E R V B U I O P

import { LANE_KEYS } from '@midi/noteTypes';

/**
 * Tracks which keys are currently held and which were pressed this frame.
 * Poll `isDown()` and `wasJustPressed()` from inside the game loop — never use
 * raw DOM events inside update logic.
 */
export class InputManager {
  private static _instance: InputManager | null = null;

  /** Set of KeyboardEvent.code strings currently held down */
  private readonly _held = new Set<string>();

  /** Set of keys pressed this frame (cleared each update tick) */
  private readonly _justPressed = new Set<string>();

  /** Set of keys released this frame (cleared each update tick) */
  private readonly _justReleased = new Set<string>();

  private constructor() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  // SINGLETON
  static getInstance(): InputManager {
    if (!InputManager._instance) {
      InputManager._instance = new InputManager();
    }
    return InputManager._instance;
  }

  /** Call once per frame at the END of update() to clear frame-state */
  flush(): void {
    this._justPressed.clear();
    this._justReleased.clear();
  }

  /** Returns true if `code` is currently held down */
  isDown(code: string): boolean {
    return this._held.has(code);
  }

  /** Returns true only on the first frame the key was pressed */
  wasJustPressed(code: string): boolean {
    return this._justPressed.has(code);
  }

  /** Returns true only on the first frame the key was released */
  wasJustReleased(code: string): boolean {
    return this._justReleased.has(code);
  }

  /**
   * Returns the lane index (0–9) of the first lane key just pressed this frame,
   * or -1 if no lane key was pressed.
   */
  getJustPressedLane(): number {
    for (let i = 0; i < LANE_KEYS.length; i++) {
      if (this._justPressed.has(LANE_KEYS[i]!)) return i;
    }
    return -1;
  }

  /**
   * Returns an array of all lane indices pressed this frame.
   * Needed for chord detection.
   */
  getJustPressedLanes(): number[] {
    const result: number[] = [];
    for (let i = 0; i < LANE_KEYS.length; i++) {
      if (this._justPressed.has(LANE_KEYS[i]!)) result.push(i);
    }
    return result;
  }

  /**
   * Returns an array of all lane indices currently held down.
   * Needed for sustain scoring.
   */
  getHeldLanes(): number[] {
    const result: number[] = [];
    for (let i = 0; i < LANE_KEYS.length; i++) {
      if (this._held.has(LANE_KEYS[i]!)) result.push(i);
    }
    return result;
  }

  private readonly _onKeyDown = (e: KeyboardEvent): void => {
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    if (!this._held.has(e.code)) {
      this._justPressed.add(e.code);
    }
    this._held.add(e.code);
  };

  private readonly _onKeyUp = (e: KeyboardEvent): void => {
    this._held.delete(e.code);
    this._justReleased.add(e.code);
  };

  destroy(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    InputManager._instance = null;
  }
}
