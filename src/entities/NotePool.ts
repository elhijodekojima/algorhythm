// @module src/entities/NotePool.ts
// Object pool for note meshes — avoids Three.js allocation during gameplay.
// Supports single notes, chords (multi-lane), and sustained notes (elongated box).
//
// COORDINATE SYSTEM REMINDER:
//   SPAWN_Z = -120 (far/behind camera)   HIT_LINE_Z = 0 (front)
//   Notes travel from negative Z → 0 as songTime increases.
//   For a sustain note of duration D:
//     headZ = noteZ(event.time, songTime)
//     tailZ = headZ - (D / LEAD_TIME) * |SPAWN_Z|
//   Box center must be at headZ - zLength/2 so the front face aligns with headZ.

import * as THREE from 'three';
import { LANE_WIDTH, laneX, noteZ } from '@entities/NoteHighway';
import { type INoteEvent, LEAD_TIME, HIT_LINE_Z, SPAWN_Z } from '@midi/noteTypes';

// Re-export for other modules
export { laneX, noteZ };

const POOL_SIZE  = 60;
const NOTE_HEIGHT = 0.25;

/** Neon colors per lane (matches NoteHighway.LANE_COLORS) */
const LANE_COLORS: readonly number[] = [
  0xb36bff, 0x00f5ff, 0xff3c6e, 0xffd166, 0x7efff5,
  0xff6eb4, 0x6bffb3, 0xb3ff6b, 0xff9f6b, 0x6b9fff,
];

export interface IPooledNote {
  meshes: THREE.Mesh[];
  event: INoteEvent;
  active: boolean;
  missed: boolean;
  holdProgress: number;  // seconds of sustain scoring already logged
  /** World-space Z length of the note mesh (constant after spawn) */
  zLength: number;
}

export class NotePool {
  private readonly _scene: THREE.Scene;
  private readonly _pool: IPooledNote[] = [];
  /** Active notes currently visible on screen */
  readonly active: IPooledNote[] = [];

  constructor(scene: THREE.Scene) {
    this._scene = scene;
    this._preallocate();
  }

  private _preallocate(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
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
        zLength: 0.4,
      });
    }
  }

  /** Spawns a note event from the pool (supports chords via multi-slot acquisition) */
  spawn(event: INoteEvent): void {
    const numLanes = event.lanes.length;
    const slots: IPooledNote[] = [];

    for (const slot of this._pool) {
      if (!slot.active && slots.length < numLanes) slots.push(slot);
      if (slots.length === numLanes) break;
    }
    if (slots.length < numLanes) return; // pool exhausted

    // World-space Z length of the sustain tail.
    // For a note of duration D: tail is (D / LEAD_TIME) * |SPAWN_Z| units behind the head.
    const zLength = event.duration > 0
      ? Math.max(0.4, (event.duration / LEAD_TIME) * Math.abs(SPAWN_Z))
      : 0.4;

    const primary = slots[0]!;
    primary.event        = event;
    primary.active       = true;
    primary.missed       = false;
    primary.holdProgress = 0;
    primary.zLength      = zLength;

    for (let i = 0; i < numLanes; i++) {
      const slot  = slots[i]!;
      const mesh  = slot.meshes[0]!;

      // Extra slots rendered but not tracked as primary
      if (i > 0) slot.active = false;

      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(LANE_WIDTH * 0.85, NOTE_HEIGHT, zLength);

      const color = LANE_COLORS[event.lanes[i]!] ?? 0xb36bff;
      const mat   = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(color);
      mat.emissiveIntensity = 1.2;
      mat.opacity    = 0;
      mat.transparent = true;
      mesh.visible   = true;
      mesh.position.x = laneX(event.lanes[i]!);
      mesh.position.y = NOTE_HEIGHT / 2;

      if (i > 0) primary.meshes.push(mesh);
    }

    this.active.push(primary);
  }

  /** Mark a pool entry as missed — it will fade red and be culled */
  markMissed(event: INoteEvent): void {
    const entry = this.active.find(n => n.event === event);
    if (entry) entry.missed = true;
  }

  /** Call each frame — moves notes along the Z axis and culls passed/faded ones */
  update(songTime: number, delta: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const note = this.active[i]!;

      // headZ: where the front face of the note is (matches the hit timing)
      const headZ   = noteZ(note.event.time, songTime);
      const zLength = note.zLength;

      // Place box so its FRONT face aligns with headZ.
      // Box is centered, so center = headZ - zLength/2.
      const centerZ = headZ - zLength / 2;

      for (let m = 0; m < note.event.lanes.length; m++) {
        const mesh = note.meshes[m];
        if (!mesh) continue;

        mesh.position.z = centerZ;

        const mat = mesh.material as THREE.MeshStandardMaterial;

        // Fade in as the note enters the visible runway
        if (!note.missed && mat.opacity < 1) {
          mat.opacity = Math.min(1, mat.opacity + delta * 6);
        }

        // Missed notes fade red then disappear
        if (note.missed) {
          mat.emissive.lerp(new THREE.Color(0xff3c6e), delta * 8);
          mat.opacity = Math.max(0, mat.opacity - delta * 3);
        }
      }

      // Cull when the TAIL has fully passed the camera (HIT_LINE_Z + buffer).
      // tailZ = headZ - zLength → remove when tailZ > HIT_LINE_Z + 5
      const tailZ = headZ - zLength;
      const fullyFaded = note.missed &&
        ((note.meshes[0]?.material as THREE.MeshStandardMaterial).opacity <= 0);

      if (tailZ > HIT_LINE_Z + 5 || fullyFaded) {
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
    note.meshes.length = 1;
    note.active        = false;
    note.missed        = false;
    note.holdProgress  = 0;
    note.zLength       = 0.4;
  }

  dispose(): void {
    for (const slot of this._pool) {
      slot.meshes[0]?.geometry.dispose();
      (slot.meshes[0]?.material as THREE.MeshStandardMaterial)?.dispose();
    }
  }
}
