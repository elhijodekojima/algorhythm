// @module src/entities/NotePool.ts
// Object pool for note meshes — avoids Three.js allocation during gameplay.
// Supports single notes, chords (multi-lane), and sustained notes (elongated box).
//
// ARCHITECTURE NOTES:
//   • Each IPooledNote slot owns exactly ONE mesh.
//   • A chord of N lanes acquires N slots; all marked active=true so none get stolen.
//   • The PRIMARY slot (index 0) is pushed to `this.active` and drives the update loop.
//   • Sub-slots are referenced via `primary.subSlots` and released together.
//
// SUSTAIN COORDINATE SYSTEM:
//   SPAWN_Z = -120 (far)   HIT_LINE_Z = 0 (front)
//   headZ = noteZ(event.time, songTime)          ← position of the front face
//   tailZ = headZ - zLength                      ← position of the back face
//   visibleTailZ = max(tailZ, SPAWN_Z - 2)       ← clamped to visible highway
//   Box center = headZ - visibleLength/2
//   mesh.scale.z = visibleLength / zLength

import * as THREE from 'three';
import { LANE_WIDTH, laneX, noteZ } from '@entities/NoteHighway';
import { type INoteEvent, LEAD_TIME, HIT_LINE_Z, SPAWN_Z } from '@midi/noteTypes';

export { laneX, noteZ };

const POOL_SIZE   = 80;     // bumped to handle more simultaneous notes
const NOTE_HEIGHT = 0.28;
/** Note mesh width as a fraction of lane width — wider than before for visibility */
const NOTE_W_FRAC = 0.94;

/** Neon colors per lane (matches NoteHighway.LANE_COLORS) */
const LANE_COLORS: readonly number[] = [
  0xb36bff, 0x00f5ff, 0xff3c6e, 0xffd166, 0x7efff5,
  0xff6eb4, 0x6bffb3, 0xb3ff6b, 0xff9f6b, 0x6b9fff,
];

export interface IPooledNote {
  /** The single mesh owned by this slot */
  mesh: THREE.Mesh;
  event: INoteEvent;
  /** true = slot in use (primary OR sub — prevents re-allocation) */
  active: boolean;
  missed: boolean;
  holdProgress: number;
  /** World-space Z length of the full sustain geometry (constant after spawn) */
  zLength: number;
  /**
   * Sub-slots acquired for additional chord lanes.
   * Only set on the PRIMARY slot; empty array on sub-slots.
   */
  subSlots: IPooledNote[];
}

export class NotePool {
  private readonly _scene: THREE.Scene;
  private readonly _pool: IPooledNote[] = [];
  /** Active PRIMARY notes (drive the update loop) */
  readonly active: IPooledNote[] = [];

  constructor(scene: THREE.Scene) {
    this._scene = scene;
    this._preallocate();
  }

  private _preallocate(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const geo  = new THREE.BoxGeometry(LANE_WIDTH * NOTE_W_FRAC, NOTE_HEIGHT, 0.5);
      const mat  = new THREE.MeshStandardMaterial({
        color: 0x1a1040,
        emissive: new THREE.Color(0xb36bff),
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this._scene.add(mesh);

      this._pool.push({
        mesh,
        event: { time: 0, duration: 0, lanes: [0], type: 'single' },
        active: false,
        missed: false,
        holdProgress: 0,
        zLength: 0.5,
        subSlots: [],
      });
    }
  }

  /** Find N consecutive free slots, or return null if pool is exhausted */
  private _acquire(n: number): IPooledNote[] | null {
    const found: IPooledNote[] = [];
    for (const slot of this._pool) {
      if (!slot.active) {
        found.push(slot);
        if (found.length === n) return found;
      }
    }
    return null; // not enough free
  }

  /** Spawns a note event from the pool */
  spawn(event: INoteEvent): void {
    const numLanes = event.lanes.length;
    const slots = this._acquire(numLanes);
    if (!slots) return; // pool exhausted — skip this note

    // World-space Z length of the sustain body.
    // Capped at |SPAWN_Z| so it never exceeds the visible highway.
    const zLength = event.duration > 0
      ? Math.min(Math.max(0.5, (event.duration / LEAD_TIME) * Math.abs(SPAWN_Z)), Math.abs(SPAWN_Z))
      : 0.5;

    const primary = slots[0]!;
    primary.event        = event;
    primary.active       = true;
    primary.missed       = false;
    primary.holdProgress = 0;
    primary.zLength      = zLength;
    primary.subSlots     = [];

    for (let i = 0; i < numLanes; i++) {
      const slot  = slots[i]!;
      const mesh  = slot.mesh;
      const color = LANE_COLORS[event.lanes[i]!] ?? 0xb36bff;
      const mat   = mesh.material as THREE.MeshStandardMaterial;

      // Mark ALL slots active so none can be stolen by future spawns
      slot.active = true;

      // Recreate geometry with correct zLength
      mesh.geometry.dispose();
      mesh.geometry = new THREE.BoxGeometry(LANE_WIDTH * NOTE_W_FRAC, NOTE_HEIGHT, zLength);

      mat.emissive.setHex(color);
      mat.emissiveIntensity = 1.4;
      mat.opacity    = 0;
      mat.transparent = true;
      mesh.visible   = true;
      mesh.scale.set(1, 1, 1); // reset any leftover scale
      mesh.position.x = laneX(event.lanes[i]!);
      mesh.position.y = NOTE_HEIGHT / 2;

      if (i > 0) {
        // Sub-slot: active=true (prevents theft), referenced by primary
        primary.subSlots.push(slot);
      }
    }

    this.active.push(primary);
  }

  /** Mark a note event as missed — it fades red then is culled */
  markMissed(event: INoteEvent): void {
    const entry = this.active.find(n => n.event === event);
    if (entry) entry.missed = true;
  }

  /** Per-frame update — advances position and culls expired notes */
  update(songTime: number, delta: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const note    = this.active[i]!;
      const zLength = note.zLength;

      // headZ: where the FRONT FACE of the note is (= the hit timing position)
      const headZ = noteZ(note.event.time, songTime);

      // tailZ (theoretical back face, may be behind SPAWN_Z for long sustains)
      const tailZ_full = headZ - zLength;

      // Clamp tail to SPAWN_Z so we only render the visible portion
      const tailZ_vis  = Math.max(tailZ_full, SPAWN_Z - 1);
      const visLen     = Math.max(0.01, headZ - tailZ_vis);
      const scaleZ     = visLen / zLength;
      const centerZ    = tailZ_vis + visLen * 0.5;

      // Update primary mesh and all sub-slot meshes
      this._setMeshPosScale(note.mesh, centerZ, scaleZ, note, delta);
      for (const sub of note.subSlots) {
        this._setMeshPosScale(sub.mesh, centerZ, scaleZ, note, delta);
      }

      // ── Cull condition ───────────────────────────────────────────────────
      // For sustains: wait until the tail has passed HIT_LINE_Z.
      // tailZ_full = headZ - zLength; remove when tailZ_full > HIT_LINE_Z + 3
      const isSustain = note.event.duration > 0;
      const shouldCull = isSustain
        ? tailZ_full > HIT_LINE_Z + 3          // tail past hit line
        : headZ > HIT_LINE_Z + 3;              // head past hit line

      const fullyFaded = note.missed &&
        ((note.mesh.material as THREE.MeshStandardMaterial).opacity <= 0.01);

      if (shouldCull || fullyFaded) {
        this._release(note);
        this.active.splice(i, 1);
      }
    }
  }

  private _setMeshPosScale(
    mesh: THREE.Mesh,
    centerZ: number,
    scaleZ: number,
    note: IPooledNote,
    delta: number,
  ): void {
    mesh.position.z = centerZ;
    mesh.scale.z    = scaleZ;

    const mat = mesh.material as THREE.MeshStandardMaterial;

    if (!note.missed) {
      // Fade in quickly as the head enters the runway
      if (mat.opacity < 1) mat.opacity = Math.min(1, mat.opacity + delta * 8);
    } else {
      // Fade to red on miss
      mat.emissive.lerp(new THREE.Color(0xff3c6e), delta * 6);
      mat.opacity = Math.max(0, mat.opacity - delta * 2.5);
    }
  }

  private _release(note: IPooledNote): void {
    this._resetSlot(note);
    for (const sub of note.subSlots) this._resetSlot(sub);
    note.subSlots = [];
  }

  private _resetSlot(slot: IPooledNote): void {
    slot.mesh.visible = false;
    slot.mesh.scale.set(1, 1, 1);
    (slot.mesh.material as THREE.MeshStandardMaterial).opacity = 0;
    slot.active       = false;
    slot.missed       = false;
    slot.holdProgress = 0;
    slot.zLength      = 0.5;
  }

  /**
   * Full reset — releases ALL active notes and clears the active array.
   * Call this when stopping a song (retry, main menu, game over) to ensure
   * all pool slots are free for the next playthrough.
   */
  reset(): void {
    for (const note of this.active) {
      this._release(note);
    }
    this.active.length = 0;
  }

  dispose(): void {
    for (const slot of this._pool) {
      slot.mesh.geometry.dispose();
      (slot.mesh.material as THREE.MeshStandardMaterial).dispose();
    }
  }
}
