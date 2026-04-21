// @module src/entities/HelloCube.ts
// Sprint 1 proof-of-concept: a rotating neon cube that reacts to keyboard input.
// This entity will be REMOVED in Sprint 2 and replaced by NoteHighway.

import * as THREE from 'three';
import { InputManager } from '@core/InputManager';

/** Neon colors per lane key — maps to --neon-primary / --neon-secondary */
const LANE_COLORS: readonly number[] = [
  0xb36bff, 0x00f5ff, 0xff3c6e, 0xffd166, 0x7efff5,
  0xff6eb4, 0x6bffb3, 0xb3ff6b, 0xff9f6b, 0x6b9fff,
];

/**
 * A glowing cube that:
 * - Rotates slowly on its Y axis
 * - Flashes to the lane color when the corresponding key is pressed
 * Sprint 1 hello-world entity.
 */
export class HelloCube {
  readonly mesh: THREE.Mesh;
  private readonly _material: THREE.MeshStandardMaterial;
  private _flashTimer = 0;
  private readonly _input: InputManager;

  constructor() {
    this._input = InputManager.getInstance();

    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    this._material = new THREE.MeshStandardMaterial({
      color: 0x1a1040,
      emissive: new THREE.Color(0xb36bff),
      emissiveIntensity: 1.2,
      metalness: 0.3,
      roughness: 0.6,
    });

    this.mesh = new THREE.Mesh(geometry, this._material);
    this.mesh.position.set(0, 0, 0);
  }

  /**
   * @param delta - Frame delta in seconds (from THREE.Clock)
   */
  update(delta: number): void {
    // Slow Y rotation — visual proof the loop is running
    this.mesh.rotation.y += delta * 0.6;
    this.mesh.rotation.x += delta * 0.2;

    // Flash on key press
    const laneIdx = this._input.getJustPressedLane();
    if (laneIdx !== -1) {
      const color = LANE_COLORS[laneIdx] ?? 0xb36bff;
      this._material.emissive.setHex(color);
      this._material.emissiveIntensity = 2.5;
      this._flashTimer = 0.08; // 80ms flash
    }

    // Decay flash back to default
    if (this._flashTimer > 0) {
      this._flashTimer -= delta;
      if (this._flashTimer <= 0) {
        this._material.emissive.setHex(0xb36bff);
        this._material.emissiveIntensity = 1.2;
      }
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this._material.dispose();
  }
}
