// @module src/gfx/scene.ts
// Creates and owns the Three.js Scene, Camera, and ambient lighting.

import * as THREE from 'three';

/**
 * Initializes the 3D scene with Neon Void aesthetic:
 * deep space fog, perspective camera angled down the note highway.
 */
export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();

  // Background matches --bg-void token
  scene.background = new THREE.Color(0x05040f);

  // Exponential fog creates a vanishing point effect along the highway (Z axis)
  scene.fog = new THREE.FogExp2(0x05040f, 0.015);

  // Ambient light — very dim, neon sources provide the main illumination
  const ambient = new THREE.AmbientLight(0x1a0f3a, 0.4);
  scene.add(ambient);

  // Directional fill light from above — slightly purple tint
  const fill = new THREE.DirectionalLight(0xb36bff, 0.3);
  fill.position.set(0, 20, 10);
  scene.add(fill);

  return scene;
}

/**
 * Creates the perspective camera positioned to look down the note highway.
 * FOV=60, camera sits slightly elevated and behind the hit zone.
 */
export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500,
  );

  // Position: slightly elevated, looking toward the vanishing point
  camera.position.set(0, 4, 10);
  camera.lookAt(0, 0, -30);

  // Keep aspect ratio on resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  return camera;
}
