# 🎨 STYLE_LOCK.md — Algorhythm Visual & Code Conventions

> **THIS FILE IS IMMUTABLE DURING DEVELOPMENT.**
> Any change to this file requires an explicit decision logged in `MEMORY.md`.
> The AI assistant (Antigravity) must never deviate from these rules without documented user approval.

---

## 1. Visual Aesthetic — NEON VOID

The game's visual identity is **Neon Void**: a deep space environment lit only by glowing neon light sources and geometric HUD elements. Think: *Tron Legacy* meets *Cyberpunk 2077* UI.

### 1.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-void` | `#05040f` | Scene background, DOM background |
| `--neon-primary` | `#b36bff` | Main accent, active lane, perfect hit |
| `--neon-secondary` | `#00f5ff` | Secondary accent, combo counter |
| `--neon-danger` | `#ff3c6e` | Miss flash, health low |
| `--neon-gold` | `#ffd166` | Score multiplier, star rating |
| `--lane-inactive` | `#1a1040` | Default lane tile color |
| `--lane-active` | `#2e1f7a` | Key-pressed lane highlight |
| `--text-primary` | `#e8e0ff` | All UI text |
| `--text-muted` | `#6b5fa8` | Secondary labels, timestamps |

### 1.2 Three.js Material Rules

- **Note cubes**: `MeshStandardMaterial` with `emissive` color set to the note's lane color and `emissiveIntensity: 1.2`.
- **Highway floor**: `MeshStandardMaterial`, dark texture, metalness `0.8`, roughness `0.2`.
- **Lane separators**: `LineSegments` with `LineBasicMaterial` in `--neon-primary` at 30% opacity.
- **Bloom**: `UnrealBloomPass` with `strength: 1.5`, `radius: 0.4`, `threshold: 0.2`. Applied to the entire scene.
- **Fog**: `THREE.FogExp2(0x05040f, 0.015)` — creates depth towards the vanishing point.
- **Background**: `scene.background = new THREE.Color(0x05040f)`.

### 1.3 Typography

```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Grotesk:wght@400;500&display=swap" rel="stylesheet">
```

| Use | Font | Weight |
|-----|------|--------|
| Score, Combo, Title | `Orbitron` | 700 / 900 |
| Labels, instructions | `Space Grotesk` | 400 / 500 |

### 1.4 Animations & Micro-interactions

- **Hit flash**: Lane tile flashes from `--lane-active` to `--neon-primary` over 80ms, then returns.
- **Miss shake**: Camera applies a 150ms positional shake (±0.05 units X).
- **Combo text pop**: CSS `scale(1) → scale(1.25) → scale(1)` over 200ms on combo increment.
- **Note spawn**: Notes fade in over 300ms (`opacity: 0 → 1` via material `transparent: true`).
- **Perfect hit**: Particle burst (`THREE.Points` with 12 particles) in lane color, lifetime 400ms.

---

## 2. Code Architecture Conventions

### 2.1 TypeScript Rules

```jsonc
// tsconfig.json — non-negotiable settings
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Rules:**
- `any` is **banned**. Use `unknown` + type guard if the type is truly dynamic.
- All function parameters and return types must be explicitly typed.
- No `as` type assertions without a comment explaining why they are safe.
- Use `interface` for object shapes, `type` only for unions/aliases.

### 2.2 File & Folder Naming

| Kind | Convention | Example |
|------|-----------|---------|
| Source files | `camelCase.ts` | `inputManager.ts` |
| Classes | `PascalCase` | `class NoteHighway` |
| Interfaces | `IPascalCase` | `interface INoteEvent` |
| Enums | `PascalCase` | `enum GamePhase` |
| Constants | `SCREAMING_SNAKE` | `const MAX_LANES = 10` |
| CSS variables | `--kebab-case` | `--neon-primary` |

### 2.3 Module Structure Rules

- **One class per file.** No file exports more than one primary class.
- **No circular imports.** Dependency direction: `main → state → entities → gfx → core`.
- **Singletons** are OK for: `InputManager`, `AudioEngine`, `GameState`. Mark them with a `// SINGLETON` comment.
- The `main.ts` entry point must only: (1) create the renderer, (2) instantiate the game, (3) start the loop.

### 2.4 Game Loop Pattern

```ts
// The ONLY accepted game loop pattern:
function animate(timestamp: DOMHighResTimeStamp): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta(); // THREE.Clock
  game.update(delta);
  game.render();
}
requestAnimationFrame(animate);
```

- `delta` in **seconds** everywhere. Never milliseconds inside the game logic.
- `THREE.Clock` is the single clock for rendering delta. `AudioContext.currentTime` is the single clock for audio sync.

### 2.5 Comment Standards

```ts
// Single-line comments: explain WHY, not WHAT.

/**
 * JSDoc for all public methods on exported classes.
 * @param time - Song position in seconds (AudioContext.currentTime - startTime)
 * @returns Notes that should be visible in the current frame
 */
```

- `TODO:` comments must include an issue reference: `// TODO: #12 — optimize note pool`
- `HACK:` comments must explain the reason and the intended fix.

### 2.6 Editing Rules for AI Assistant

> These rules bind Antigravity when generating code for this project.

1. **Never rewrite an entire file** if only a single function changes. Use surgical edits.
2. **Preserve all existing comments and JSDoc** unless the code they describe has been deleted.
3. **Do not change unrelated code** in the same edit. One PR = one concern.
4. **Emit only the changed function/block** unless the file is new.
5. All new files must start with a `// @module <path>` header comment.
