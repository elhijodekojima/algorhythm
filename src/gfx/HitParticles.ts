// @module src/gfx/HitParticles.ts
// Neon particle burst system for note hit & miss feedback.
//
// Each burst spawns:
//   - 20 soft-glow spark particles (THREE.Points, additive blend)
//   - 1 expanding ring at the hit line (scales up + fades)
//
// A pool of POOL_SIZE bursts is pre-allocated to avoid GC during gameplay.

import * as THREE from 'three';
import { laneX } from '@entities/NoteHighway';
import { HIT_LINE_Z } from '@midi/noteTypes';

// ── Config ────────────────────────────────────────────────────────────────────
const PARTICLES = 22;
const DURATION  = 0.55;   // seconds the burst lasts
const POOL_SIZE = 12;     // max simultaneous bursts (chord = up to 10 lanes)

/** Neon color per lane — must match NoteHighway and NotePool */
const LANE_COLORS: readonly number[] = [
  0xb36bff, 0x00f5ff, 0xff3c6e, 0xffd166, 0x7efff5,
  0xff6eb4, 0x6bffb3, 0xb3ff6b, 0xff9f6b, 0x6b9fff,
];

const MISS_COLOR = 0xff3c6e;

// ── Types ─────────────────────────────────────────────────────────────────────
interface IBurst {
  pts:  THREE.Points;
  ring: THREE.Mesh;
  pos:  Float32Array;   // 3 floats × PARTICLES
  vel:  Float32Array;   // 3 floats × PARTICLES
  timer: number;
  active: boolean;
}

// ── Sprite texture (soft radial glow) ────────────────────────────────────────
function _makeSpriteTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0,    'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  g.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ── HitParticles class ────────────────────────────────────────────────────────
export class HitParticles {
  private readonly _pool: IBurst[] = [];
  private readonly _tex: THREE.CanvasTexture;

  constructor(private readonly _scene: THREE.Scene) {
    this._tex = _makeSpriteTex();
    this._preallocate();
  }

  // ── Pool init ──────────────────────────────────────────────────────────────
  private _preallocate(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const pos = new Float32Array(PARTICLES * 3);
      const col = new Float32Array(PARTICLES * 3).fill(1);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

      const ptsMat = new THREE.PointsMaterial({
        size: 0.28,
        map: this._tex,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });

      const pts = new THREE.Points(geo, ptsMat);
      pts.visible = false;
      pts.renderOrder = 10;
      this._scene.add(pts);

      // Ring — horizontal plane at hit line, expands outward
      const ringGeo = new THREE.RingGeometry(0.25, 0.55, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 11;
      ring.visible = false;
      this._scene.add(ring);

      this._pool.push({ pts, ring, pos, vel: new Float32Array(PARTICLES * 3), timer: 0, active: false });
    }
  }

  // ── Spawn ──────────────────────────────────────────────────────────────────
  spawnBurst(laneIdx: number, isMiss = false): void {
    const burst = this._pool.find(b => !b.active);
    if (!burst) return;

    const colorHex = isMiss
      ? MISS_COLOR
      : (LANE_COLORS[laneIdx] ?? 0xb36bff);

    const c = new THREE.Color(colorHex);
    const x = laneX(laneIdx);
    const y = 0.15;
    const z = HIT_LINE_Z;

    for (let i = 0; i < PARTICLES; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = 1.0 + Math.random() * 3.5;
      const bi     = i * 3;

      // Start at hit point
      burst.pos[bi]     = x;
      burst.pos[bi + 1] = y;
      burst.pos[bi + 2] = z;

      // Velocity: radial spread + strong upward component
      burst.vel[bi]     = Math.cos(angle) * radius * 0.65;
      burst.vel[bi + 1] = 3.5 + Math.random() * 7;
      burst.vel[bi + 2] = Math.sin(angle) * radius * 0.4;

      // Vertex color
      const colAttr = burst.pts.geometry.getAttribute('color') as THREE.BufferAttribute;
      colAttr.setXYZ(i, c.r, c.g, c.b);
      colAttr.needsUpdate = true;
    }

    // Sync positions
    const posAttr = burst.pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.array = burst.pos;
    posAttr.needsUpdate = true;

    // Particles visible
    (burst.pts.material as THREE.PointsMaterial).opacity = 1;
    burst.pts.visible = true;

    // Ring
    const ringMat = burst.ring.material as THREE.MeshBasicMaterial;
    ringMat.color.setHex(colorHex);
    ringMat.opacity = isMiss ? 0.5 : 0.9;
    burst.ring.position.set(x, 0.03, z);
    burst.ring.scale.setScalar(1);
    burst.ring.visible = true;

    burst.timer  = 0;
    burst.active = true;
  }

  /** Spawn a burst for every lane in a chord */
  spawnChordBurst(lanes: readonly number[]): void {
    for (const lane of lanes) this.spawnBurst(lane);
  }

  // ── Update (call every frame) ──────────────────────────────────────────────
  update(delta: number): void {
    for (const burst of this._pool) {
      if (!burst.active) continue;

      burst.timer += delta;
      const t    = Math.min(1, burst.timer / DURATION);
      const fade = 1 - t;

      // Move particles & apply gravity
      for (let i = 0; i < PARTICLES; i++) {
        const bi = i * 3;
        burst.pos[bi]     += burst.vel[bi]     * delta;
        burst.pos[bi + 1] += burst.vel[bi + 1] * delta;
        burst.pos[bi + 2] += burst.vel[bi + 2] * delta;
        burst.vel[bi + 1] -= 14 * delta; // gravity pull
      }

      const posAttr = burst.pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.needsUpdate = true;

      // Spark opacity: smooth quadratic fade
      (burst.pts.material as THREE.PointsMaterial).opacity = fade * fade;

      // Ring: expand and fade
      const ringScale = 1 + t * 6;
      burst.ring.scale.setScalar(ringScale);
      (burst.ring.material as THREE.MeshBasicMaterial).opacity = fade * 0.85;

      if (burst.timer >= DURATION) {
        burst.active      = false;
        burst.pts.visible  = false;
        burst.ring.visible = false;
      }
    }
  }

  dispose(): void {
    this._tex.dispose();
    for (const b of this._pool) {
      b.pts.geometry.dispose();
      (b.pts.material as THREE.PointsMaterial).dispose();
      b.ring.geometry.dispose();
      (b.ring.material as THREE.MeshBasicMaterial).dispose();
    }
  }
}
