# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Mission Control is an immersive 3D spaceship cockpit experience built with React Router v7, Three.js/React Three Fiber, and Tailwind CSS. It runs as an SPA (SSR is disabled in `react-router.config.ts`). The single route renders a sealed spacecraft cabin with dual-mode controls (walk around or fly the ship), a procedural starfield, an orbiting planet with LOD textures, an HTML HUD overlay, and ambient audio via Howler.js.

## Commands

```bash
npm run dev          # Dev server with HMR (Vite on :5173)
npm run build        # Production build
npm run start        # Serve production build (react-router-serve)
npm run typecheck    # react-router typegen + tsc
```

There are no test scripts or linting commands configured.

## Architecture

**Routing**: `app/routes.ts` defines routes using React Router v7's `RouteConfig`. Currently a single index route pointing to `app/routes/home.tsx`.

**3D Scene Stack** (rendered inside `<Canvas>` from React Three Fiber):
- `Scene.tsx` — orchestrator: sets up camera, lights, composes all 3D children, manages shared refs, and renders the HTML overlay + mobile controls. This is the central hub where `locked`, `navMode`, `virtualKeys`, `joystick`, `universeRef`, `cockpitRef`, and `shipWorldPosRef` are created and passed down.
- `Cockpit.tsx` — structural geometry (walls, floor, ceiling, console) with animated LED lighting. Uses procedural normal/roughness maps from `utils/cockpitTextures.ts`.
- `Starfield.tsx` — 5000 procedurally distributed points with slow rotation
- `Planet.tsx` — orbiting body with LOD-aware canvas-generated textures, cloud layer, and atmosphere glow. Scales dynamically via the Grandness Effect.
- `Sun.tsx`, `Moon.tsx`, `Nebula.tsx` — celestial bodies in the universe group
- `CabinControls.tsx` — the dual-mode control system (see below)

**Dual-Mode Control System** (`CabinControls.tsx`):
- **Cabin Mode** (default): Pointer-lock WASD walking with mouse look, clamped to cabin boundaries. On mobile, auto-engages without pointer lock.
- **Helm Mode** (press E): Camera snaps to helm seat. WASD becomes thrust/strafe with inertia physics. Mouse becomes pitch/roll. The ship has momentum — stopping takes effort. Press E or ESC to disengage.
- The "universe moves around the ship" pattern: `universeRef` group translates opposite to `shipWorldPosRef` so the ship stays at origin while space slides past. `cockpitRef` group rotates with the ship's quaternion, pivoting around the helm seat.

**The Grandness Effect** (`utils/grandnessEffect.ts`):
- Core system that makes the planet feel massive as you approach. Exponential visual scaling: `(90/d)^2.8`, capped at 200x.
- **Zeno Multiplier**: Thrust dampening near the planet — cubic falloff from 100% at 80su to 1% floor. Creates the "approaching but never arriving" feel.
- **LOD System**: 4 texture tiers (256px → 2048px) triggered by proximity. Seeded PRNG keeps geography stable across LOD transitions.
- Exports constants `PLANET_LOCAL_POS` and `PLANET_RADIUS` used by both Planet.tsx and CabinControls.tsx.

**Mobile Support**:
- `useIsMobile` hook detects touch devices via `(pointer: coarse)` media query
- `MobileControls.tsx` renders D-pad, analog joystick, and action buttons as an HTML overlay
- Communication between HTML controls and the 3D frame loop uses shared refs: `virtualKeys` (Set<string>) and `joystick` ({x, z})

**HTML Overlay**: `HUD.tsx` renders a `pointer-events-none` HTML layer with two faces — cabin mode (mission readouts) and helm mode (flight instruments with crosshair, velocity, distance). The distance readout updates via `requestAnimationFrame` + direct DOM writes to avoid React re-render overhead.

**Audio**: `hooks/useAmbientAudio.ts` manages a looping space theme via Howler.js that fades between active (0.45) and idle (0.12) volume based on pointer lock state.

**Procedural Textures**: All textures are generated on `<canvas>` elements at runtime — no image files. `utils/cockpitTextures.ts` creates normal maps and roughness maps for hull panels. `utils/planetTextures.ts` creates surface and cloud textures with seeded PRNG for deterministic geography across LOD tiers.

## Conventions

- **Styling**: Tailwind CSS exclusively (inline styles only when Tailwind is obtuse). Use `cn()` from `app/utils.ts` to merge classes.
- **Types**: Prefer inferred types over explicit annotations. Use `useLoaderData<typeof loader>()` pattern. Props interfaces go at the bottom of files. Avoid `React.FC`.
- **Path alias**: `~/` maps to `app/` (configured in tsconfig).
- **Comments**: Story-driven with personality — emoji, ASCII art, metaphors. Preserve and continue this style. Comments should spark curiosity, not just describe what code does.
- **Components**: When working with primitives (buttons, inputs), create universal shared components and ensure they're used everywhere.
- **React Router v7**: Follow the framework mode docs. `+types/*` imports are auto-generated by `npm run dev` — don't edit those.
- **SSR is off**: `react-router.config.ts` sets `ssr: false`. This is a client-only SPA.
