// @module src/gfx/renderer.ts
// Initializes and owns the Three.js WebGLRenderer + EffectComposer with bloom.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

interface IRendererOptions {
  canvas: HTMLCanvasElement;
}

/**
 * Wraps the WebGLRenderer and EffectComposer.
 * Call `render(scene, camera)` each frame.
 */
export class Renderer {
  private readonly _renderer: THREE.WebGLRenderer;
  private readonly _composer: EffectComposer;

  constructor({ canvas }: IRendererOptions) {
    this._renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.setClearColor(0x05040f, 1);
    this._renderer.toneMapping = THREE.ReinhardToneMapping;
    this._renderer.toneMappingExposure = 1.0;

    // Effect composer is initialized with a temporary scene/camera;
    // actual rendering passes are updated in render()
    this._composer = new EffectComposer(this._renderer);

    // Bloom — values from STYLE_LOCK.md
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,   // strength
      0.4,   // radius
      0.2,   // threshold
    );

    // Will add RenderPass in render() on first call
    this._composer.addPass(bloomPass);

    window.addEventListener('resize', this._onResize);
  }

  /**
   * Renders a frame through the bloom composer.
   * RenderPass is re-created only when scene/camera is set for the first time.
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    // Insert RenderPass at index 0 if not yet present
    if (this._composer.passes.length === 1) {
      const renderPass = new RenderPass(scene, camera);
      this._composer.passes.unshift(renderPass);
    }
    this._composer.render();
  }

  get domElement(): HTMLCanvasElement {
    return this._renderer.domElement as HTMLCanvasElement;
  }

  private readonly _onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer.setSize(w, h);
    this._composer.setSize(w, h);
  };

  dispose(): void {
    window.removeEventListener('resize', this._onResize);
    this._renderer.dispose();
  }
}
