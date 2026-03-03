---
name: 3d-environment-design
description: >
  Design polished, atmospheric 3D environments in Three.js / React Three Fiber
  with cinematic depth, neon glow, and dramatic lighting. Use whenever a scene
  looks flat, dark, or lifeless, or when the user shares sci‑fi cockpit or
  space‑station references they want to match.
---

## When to Trigger This Skill

Use this skill automatically when:

- The user is working with **Three.js** or **React Three Fiber** scenes.
- The user says the scene looks **flat**, **too dark**, **muddy**, or **lifeless**.
- The user shares reference images of **sci‑fi cockpits**, **space bridges**, or **neon-lit interiors** and asks to match the look.
- The user is tuning **lighting**, **materials**, **bloom/post-processing**, or **fog/atmosphere** in a 3D environment.

If in doubt and the question involves 3D scene aesthetics or lighting in Three.js, **use this skill.**

## Core Diagnosis Heuristic

When a Three.js scene looks bad, assume these three problems first:

1. **No layered lighting**: only a single ambient light is used, flattening everything.
2. **Low metalness**: dark materials absorb light instead of reflecting colored highlights.
3. **No atmosphere or post-processing**: no fog, no bloom, no glow, no tone mapping.

Your first move is to replace "more ambient light" with:

- Layered key/fill/rim + accent lights,
- High‑metalness materials for hulls/panels,
- Bloom + ACES tone mapping + fog.

## Recommended 5-Light Rig

Whenever you see a single ambient or one lonely directional light, suggest a layered rig like this and adapt it to the user’s code style (plain Three.js vs R3F):

```js
// Dim ambient — just prevents pitch black, nothing more
const ambient = new THREE.AmbientLight(0x0a0f1a, 0.3);

// Rim light — creates silhouette separation from background
const rimLight = new THREE.DirectionalLight(0x00ffcc, 0.8);
rimLight.position.set(-5, 8, -10); // Behind + above scene

// Soft fill
const fillLight = new THREE.DirectionalLight(0x1a2040, 0.4);
fillLight.position.set(5, 2, 5);

// Accent point lights (THE MAGIC) — place inside/behind glowing objects
const accentA = new THREE.PointLight(0x00e5ff, 2.0, 8);
accentA.position.set(0, 1, -3); // Near focal point

const accentB = new THREE.PointLight(0x4080ff, 1.5, 6);
accentB.position.set(-3, 0.5, 0);

// Environment for PBR reflections
scene.environment = pmremGenerator.fromScene(
  new THREE.RoomEnvironment(),
  renderer,
).texture;
scene.environmentIntensity = 0.5;
```

In React Three Fiber, convert these to `<ambientLight>`, `<directionalLight>`, `<pointLight>`, and use three‑stdlib’s `RoomEnvironment` + `PMREMGenerator` equivalents.

## Material Guidelines (High Metalness Is Non-Negotiable)

For sci‑fi hulls, consoles, and trim, push metalness high and rely on accent lights + env map to create color:

```js
// Hull panels — HIGH metalness picks up colored reflections from accent lights
const hull = new THREE.MeshStandardMaterial({
  color: 0x0d1520,
  metalness: 0.9,  // This is the key number
  roughness: 0.3,
  envMapIntensity: 1.2,
});

// Neon trim — emissiveIntensity ABOVE 1.0 for bloom
const neon = new THREE.MeshStandardMaterial({
  color: 0x00ffcc,
  emissive: 0x00ffcc,
  emissiveIntensity: 2.0,
});
```

When editing user code:

- **Raise `metalness`** on dark materials into the `0.7–0.95` range.
- **Lower `roughness`** moderately (`0.2–0.4`) so they catch reflections without becoming mirrors.
- For glow elements, ensure `emissive` matches `color` and set `emissiveIntensity > 1.0` (e.g. `1.5–3.0`) so bloom can see it.

## Edge Glow Technique (Biggest Single Visual Upgrade)

To match high‑end cockpit references, trace architectural edges with thin emissive geometry plus a small point light:

```js
function createGlowEdge(from, to, color = 0x00ffcc, width = 0.02) {
  const len = from.distanceTo(to);
  const mid = from.clone().add(to).multiplyScalar(0.5);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(len, width, width),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 3.0,
    }),
  );
  mesh.position.copy(mid);
  mesh.lookAt(to);
  scene.add(mesh);

  // Each edge gets its own small point light
  const light = new THREE.PointLight(color, 1.0, 2.5);
  light.position.copy(mid);
  scene.add(light);
}
```

When suggesting improvements, prioritize edges like:

- Floor perimeter and steps,
- Ceiling panels and beams,
- Console frames and screen bezels,
- Viewport/window borders.

Explain that this accounts for **~60% of the look difference** between a flat scene and a premium sci‑fi cockpit.

## Post-Processing Pipeline

If the user has no post‑processing, guide them to add bloom and ACES tone mapping, and replace direct `renderer.render` calls with an `EffectComposer`:

```js
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2, // strength
    0.4, // radius
    0.2, // threshold — emissiveIntensity must exceed this
  ),
);
composer.addPass(new OutputPass());

// Replace renderer.render(scene, camera) with:
composer.render();
```

In React Three Fiber, use the `@react-three/postprocessing` abstractions and `Effects` to achieve similar results, but keep the same intent: **ACES tone mapping + selective bloom on emissive edges**.

## Depth, Fog, and Staging

To avoid a flat “cardboard diorama” look, always:

- Add **fog** that matches the scene’s ambient color.
- Add a **subtle grid/helper** where appropriate for scale and grounding.
- Stagger major objects along **Z** to create parallax and depth.

```js
scene.fog = new THREE.FogExp2(0x02050f, 0.06);
scene.add(new THREE.GridHelper(20, 40, 0x00ffcc, 0x0a1a2a));
camera.fov = 65;
camera.updateProjectionMatrix();

// Example Z layout guideline (adjust to taste):
// - Viewport: z = -10
// - Consoles: z = -4
// - Camera:   z = 4
```

When refactoring user code, respect their layout but nudge toward:

- A **foreground** layer (console, hands, UI),
- A **midground** (cabin walls, seats),
- A **background** (window, planet, stars).

## Golden Rule: Contrast Over Ambient

Always teach and apply this rule:

> Never fix a flat/dark scene by adding more ambient light.  
> More ambient = more flatness.

Instead, fix problems by:

- **Darkening base colors** and backgrounds,
- **Brightening emissive trims** and edge glows,
- **Strengthening key / rim / accent lights** at specific locations,
- Adding **fog** and **bloom** to shape depth and glow.

When responding to the user:

1. Briefly name which of the three core problems you see.
2. Propose **concrete code changes** (lights, materials, post‑processing, fog).
3. Explain **why** each change improves depth, mood, or readability, in 1–2 short sentences.

