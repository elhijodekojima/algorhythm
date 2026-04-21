// @module src/entities/NoteHighway.ts
// The 3D note highway: 10 lanes, hit zone, lane labels, neon grid floor.
// Camera looks down the highway; notes travel from negative Z toward Z=0 (Hit Line).

import * as THREE from 'three';
import { LANE_COUNT, HIT_LINE_Z, LEAD_TIME, SPAWN_Z } from '@midi/noteTypes';

/** Width of each lane in Three.js units */
export const LANE_WIDTH = 1.6;
/** Gap between lanes */
export const LANE_GAP = 0.1;
/** Total highway width */
const HIGHWAY_WIDTH = LANE_COUNT * (LANE_WIDTH + LANE_GAP);
/** Highway depth (Z length) */
const HIGHWAY_DEPTH = Math.abs(SPAWN_Z) + 20;

/** Label displayed on each lane tile (GDD §3.1 order) */
const LANE_LABELS = ['Q', 'W', 'E', 'R', 'V', 'B', 'U', 'I', 'O', 'P'];

/** Neon lane colors cycling left→right */
const LANE_COLORS: readonly number[] = [
  0xb36bff, 0x00f5ff, 0xff3c6e, 0xffd166, 0x7efff5,
  0xff6eb4, 0x6bffb3, 0xb3ff6b, 0xff9f6b, 0x6b9fff,
];

/** Returns the X center position for a given lane index */
export function laneX(laneIdx: number): number {
  const start = -((LANE_COUNT - 1) * (LANE_WIDTH + LANE_GAP)) / 2;
  return start + laneIdx * (LANE_WIDTH + LANE_GAP);
}

/** Returns the Z position for a note given current song time */
export function noteZ(noteTime: number, songTime: number): number {
  const progress = (songTime - (noteTime - LEAD_TIME)) / LEAD_TIME;
  const z = THREE.MathUtils.lerp(SPAWN_Z, HIT_LINE_Z, progress);
  return z;
}

export class NoteHighway {
  readonly group: THREE.Group;

  /** Per-lane floor tiles for flash feedback */
  private readonly _laneTiles: THREE.Mesh[] = [];
  private readonly _laneMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly _flashTimers: number[] = new Array(LANE_COUNT).fill(0);

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this._buildFloor();
    this._buildHitLine();
    this._buildLaneSeparators();
    this._buildLaneLabels();
  }

  /** Flash a lane on hit (called by HitDetector) */
  flashLane(laneIdx: number): void {
    if (laneIdx < 0 || laneIdx >= LANE_COUNT) return;
    const mat = this._laneMaterials[laneIdx];
    if (!mat) return;
    mat.emissive.setHex(LANE_COLORS[laneIdx] ?? 0xb36bff);
    mat.emissiveIntensity = 2.0;
    this._flashTimers[laneIdx] = 0.08;
  }

  /** Flash a lane red on miss */
  flashLaneMiss(laneIdx: number): void {
    if (laneIdx < 0 || laneIdx >= LANE_COUNT) return;
    const mat = this._laneMaterials[laneIdx];
    if (!mat) return;
    mat.emissive.setHex(0xff3c6e);
    mat.emissiveIntensity = 1.5;
    this._flashTimers[laneIdx] = 0.12;
  }

  /** @param delta - seconds */
  update(delta: number): void {
    for (let i = 0; i < LANE_COUNT; i++) {
      if (this._flashTimers[i]! > 0) {
        this._flashTimers[i]! -= delta;
        if (this._flashTimers[i]! <= 0) {
          const mat = this._laneMaterials[i];
          if (mat) {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      }
    }
  }

  private _buildFloor(): void {
    for (let i = 0; i < LANE_COUNT; i++) {
      const geo = new THREE.PlaneGeometry(LANE_WIDTH, HIGHWAY_DEPTH);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1a1040,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.85,
      });

      const tile = new THREE.Mesh(geo, mat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(laneX(i), 0, HIT_LINE_Z - HIGHWAY_DEPTH / 2);

      this._laneTiles.push(tile);
      this._laneMaterials.push(mat);
      this.group.add(tile);
    }
  }

  private _buildHitLine(): void {
    // Glowing bar across all lanes at Z=0
    const geo = new THREE.BoxGeometry(HIGHWAY_WIDTH + 0.5, 0.08, 0.15);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xb36bff),
      emissiveIntensity: 2.0,
    });
    const bar = new THREE.Mesh(geo, mat);
    bar.position.set(0, 0.04, HIT_LINE_Z);
    this.group.add(bar);
  }

  private _buildLaneSeparators(): void {
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xb36bff,
      transparent: true,
      opacity: 0.25,
    });

    for (let i = 0; i <= LANE_COUNT; i++) {
      const x = laneX(0) - (LANE_WIDTH + LANE_GAP) / 2 + i * (LANE_WIDTH + LANE_GAP);
      const points = [
        new THREE.Vector3(x, 0.01, HIT_LINE_Z),
        new THREE.Vector3(x, 0.01, SPAWN_Z),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, lineMat);
      this.group.add(line);
    }
  }

  private _buildLaneLabels(): void {
    // Labels as simple canvas textures on small planes at the hit zone
    for (let i = 0; i < LANE_COUNT; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'transparent';
      ctx.clearRect(0, 0, 128, 128);
      ctx.font = 'bold 72px Orbitron, sans-serif';
      ctx.fillStyle = `#${(LANE_COLORS[i]! >>> 0).toString(16).padStart(6, '0')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LANE_LABELS[i]!, 64, 64);

      const tex = new THREE.CanvasTexture(canvas);
      const geo = new THREE.PlaneGeometry(LANE_WIDTH * 0.7, LANE_WIDTH * 0.7);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      const label = new THREE.Mesh(geo, mat);
      label.rotation.x = -Math.PI / 2;
      label.position.set(laneX(i), 0.05, HIT_LINE_Z + 0.6);
      this.group.add(label);
    }
  }

  dispose(): void {
    this._laneTiles.forEach(m => { m.geometry.dispose(); });
    this._laneMaterials.forEach(m => m.dispose());
  }
}
