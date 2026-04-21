// @module src/gfx/scene.ts
// Creates and owns the Three.js Scene, Camera, and ambient lighting.
// Camera angle updated to look down the note highway per GDD §5.

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
  scene.fog = new THREE.FogExp2(0x05040f, 0.012);

  // Very dim ambient — neon emissives provide main illumination
  const ambient = new THREE.AmbientLight(0x1a0f3a, 0.3);
  scene.add(ambient);

  // Subtle directional fill from above
  const fill = new THREE.DirectionalLight(0xb36bff, 0.2);
  fill.position.set(0, 20, 5);
  scene.add(fill);

  return scene;
}

/**
 * Camera positioned above and behind the Hit Line, looking down the highway.
 * GDD §5: "Perspectiva en 3D mirando hacia un teclado virtual en la parte inferior,
 * con las notas viniendo desde el horizonte hacia la cámara."
 */
export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    600,
  );

  // Elevated and slightly behind the hit line, angled down the runway
  camera.position.set(0, 8, 14);
  camera.lookAt(0, 0, -25);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  return camera;
}
