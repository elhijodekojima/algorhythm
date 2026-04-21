// @module src/entities/NotePool.ts
// Object pool for note meshes — avoids Three.js allocation during gameplay.
// Supports single notes, chords (multi-lane), and sustained notes (elongated box).

import * as THREE from 'three';
import { LANE_WIDTH, laneX, noteZ } from '@entities/NoteHighway';
import { type INoteEvent, LEAD_TIME, HIT_LINE_Z, SPAWN_Z } from '@midi/noteTypes';

// Re-export for other modules
export { laneX, noteZ };

const POOL_SIZE = 60;
const NOTE_HEIGHT = 0.25;

/** Neon colors per lane */
const LANE_COLORS: readonly number[] = [
  0xb36bff, 0x00f5ff, 0xff3c6e, 0xffd166, 0x7efff5,
  0xff6eb4, 0x6bffb3, 0xb3ff6b, 0xff9f6b, 0x6b9fff,
];

export interface IPooledNote {
  meshes: THREE.Mesh[];      // one mesh per lane in the note's lanes array
  event: INoteEvent;
  active: boolean;
  missed: boolean;
  holdProgress: number;      // seconds already scored for sustain
}

export class NotePool {
  private readonly _scene: THREE.Scene;
  private readonly _pool: IPooledNote[] = [];
  /** Active notes visible on screen */
  readonly active: IPooledNote[] = [];

  constructor(scene: THREE.Scene) {
    this._scene = scene;
    this._preallocate();
  }

  private _preallocate(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      // Each pooled slot starts with one mesh; more are added for chords on acquire
      const geo = new THREE.BoxGeometry(LANE_WIDTH * 0.85, NOTE_HEIGHT, 0.4);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1a1040,
        emissive: new THREE.Color(0xb36bff),
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this._scene.add(mesh);

      this._pool.push({
        meshes: [mesh],
        event: { time: 0, duration: 0, lanes: [0], type: 'single' },
        active: false,
        missed: false,
        holdProgress: 0,
      });
    }
  }

  /**
   * Spawns a note from the pool.
   * For chord notes, extra meshes are added from pool slots.
   */
  spawn(event: INoteEvent): void {
    const numLanes = event.lanes.length;
    const slots: IPooledNote[] = [];

    // Find enough free slots
    for (const slot of this._pool) {
      if (!slot.active && slots.length < numLanes) slots.push(slot);
      if (slots.length === numLanes) break;
    }
    if (slots.length < numLanes) return; // pool exhausted — skip note

    // Use the first slot as the "primary" representing this note event
    const primary = slots[0]!;
    primary.event = event;
    primary.active = true;
    primary.missed = false;
    primary.holdProgress = 0;

    // Set up one mesh per lane
    for (let i = 0; i < numLanes; i++) {
      const slot = slots[i]!;
      if (i > 0) {
        // Mark extra slots as "owned" by primary (inactive but visible)
        slot.active = false;
      }
      const mesh = slot.meshes[0]!;

      // Sustain notes get elongated Z
      const zLength = event.duration > 0
        ? Math.max(0.4, (event.duration / LEAD_TIME) * Math.abs(SPAWN_Z))
        : 0.4;

      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(LANE_WIDTH * 0.85, NOTE_HEIGHT, zLength);

      const color = LANE_COLORS[event.lanes[i]!] ?? 0xb36bff;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(color);
      mat.emissiveIntensity = 1.2;
      mat.opacity = 0;
      mat.transparent = true;
      mesh.visible = true;
      mesh.position.x = laneX(event.lanes[i]!);
      mesh.position.y = NOTE_HEIGHT / 2;

      // Attach extra meshes to primary for unified update
      if (i > 0) primary.meshes.push(mesh);
    }

    this.active.push(primary);
  }

  /** Call each frame to interpolate note positions */
  update(songTime: number, delta: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const note = this.active[i]!;
      const z = noteZ(note.event.time, songTime);

      for (let m = 0; m < note.event.lanes.length; m++) {
        const mesh = note.meshes[m];
        if (!mesh) continue;
        mesh.position.z = z;

        // Fade in as note enters the visible runway
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.opacity < 1) mat.opacity = Math.min(1, mat.opacity + delta * 5);

        // Miss — fade to red
        if (note.missed) {
          mat.emissive.lerp(new THREE.Color(0xff3c6e), delta * 10);
          mat.opacity -= delta * 4;
        }
      }

      // Remove notes that have passed the camera or fully faded
      const endZ = z + (note.event.duration > 0 ? (note.event.duration / LEAD_TIME) * Math.abs(SPAWN_Z) : 0);
      if (endZ > HIT_LINE_Z + 5 || (note.missed && (note.meshes[0]?.material as THREE.MeshStandardMaterial).opacity <= 0)) {
        this._release(note);
        this.active.splice(i, 1);
      }
    }
  }

  private _release(note: IPooledNote): void {
    for (const mesh of note.meshes) {
      mesh.visible = false;
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0;
    }
    // Reset meshes array back to just the first
    note.meshes.length = 1;
    note.active = false;
    note.missed = false;
    note.holdProgress = 0;
  }

  dispose(): void {
    for (const slot of this._pool) {
      slot.meshes[0]?.geometry.dispose();
      (slot.meshes[0]?.material as THREE.MeshStandardMaterial)?.dispose();
    }
  }
}
