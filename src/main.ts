// @module src/main.ts
// Entry point — wires renderer, scene, loop, and input together.
// Keep this file lean: create instances, start the loop. Nothing else.

import { Renderer } from '@gfx/renderer';
import { createScene, createCamera } from '@gfx/scene';
import { GameLoop } from '@core/GameLoop';
import { InputManager } from '@core/InputManager';
import { HelloCube } from '@entities/HelloCube';

// ── Bootstrap ────────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const splash = document.getElementById('splash') as HTMLDivElement;

const renderer = new Renderer({ canvas });
const scene = createScene();
const camera = createCamera();
const input = InputManager.getInstance();

// Sprint 1 hello-world entity
const cube = new HelloCube();
scene.add(cube.mesh);

// ── Game loop ─────────────────────────────────────────────────────────────────

const loop = new GameLoop({
  update(delta) {
    cube.update(delta);
    input.flush(); // clear just-pressed state at end of update
  },
  render() {
    renderer.render(scene, camera);
  },
});

// ── Splash → Game transition ──────────────────────────────────────────────────

function startGame(): void {
  // Fade out splash
  splash.style.transition = 'opacity 0.6s ease';
  splash.style.opacity = '0';
  setTimeout(() => {
    splash.style.display = 'none';
  }, 600);

  loop.start();
  window.removeEventListener('keydown', onFirstKey);
}

function onFirstKey(): void {
  startGame();
}

window.addEventListener('keydown', onFirstKey);

// Start the loop immediately so Three.js warms up in the background
// (satisfies the Vibe Jam "no loading screen" rule)
loop.start();
