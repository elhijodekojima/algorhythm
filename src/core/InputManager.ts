// @module src/core/InputManager.ts
// SINGLETON — manages all keyboard input for the game loop.

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

  /** QWERTY columns mapped as piano lanes (left hand + right hand home rows) */
  static readonly LANE_KEYS: readonly string[] = [
    'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG',   // Left hand — lower row
    'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', // Right hand — lower row
  ];

  static readonly UPPER_KEYS: readonly string[] = [
    'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT',   // Left hand — upper row
    'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP',   // Right hand — upper row
  ];

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

  /** Call once per frame at the END of update() to clear just-pressed state */
  flush(): void {
    this._justPressed.clear();
  }

  /** Returns true if `code` is currently held down */
  isDown(code: string): boolean {
    return this._held.has(code);
  }

  /** Returns true only on the first frame the key was pressed */
  wasJustPressed(code: string): boolean {
    return this._justPressed.has(code);
  }

  /** Returns the index of the lane key if it was just pressed, or -1 */
  getJustPressedLane(): number {
    for (let i = 0; i < InputManager.LANE_KEYS.length; i++) {
      if (this._justPressed.has(InputManager.LANE_KEYS[i]!)) return i;
    }
    return -1;
  }

  private readonly _onKeyDown = (e: KeyboardEvent): void => {
    // Prevent browser shortcuts from firing inside the game
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();

    if (!this._held.has(e.code)) {
      // Only register as "just pressed" on the leading edge (not on repeat)
      this._justPressed.add(e.code);
    }
    this._held.add(e.code);
  };

  private readonly _onKeyUp = (e: KeyboardEvent): void => {
    this._held.delete(e.code);
  };

  destroy(): void {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    InputManager._instance = null;
  }
}
