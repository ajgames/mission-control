import { Vector3 } from "three";

/*
 * 🌍→🌎→🌏 The Grandness Effect
 * ────────────────────────────────────────────
 * Zeno of Elea walks into a bar.
 * He gets halfway there. Then half of that.
 * Then half of that. The bartender sighs.
 *
 * That's what happens when you fly toward the planet.
 * She grows. Exponentially. Impossibly.
 * Your ship slows to a crawl — engines screaming,
 * thrusters blazing, but the math says no.
 *
 * You're always approaching. Never arriving.
 * Like a dream where the hallway keeps stretching.
 * Like scrolling through your ex's Instagram.
 *
 * The planet doesn't care about your velocity.
 * She cares about presence.
 *
 *   ╔═════════════════════════════════════════╗
 *   ║  d ≥ 90   →  marble on velvet          ║
 *   ║  d ≈ 50   →  she demands attention     ║
 *   ║  d ≈ 20   →  she IS the viewport       ║
 *   ║  d ≈ 10   →  god mode (540×)           ║
 *   ║  d → 6    →  2000× (cap). the horizon. ║
 *   ╚═════════════════════════════════════════╝
 */

// 📍 where the planet lives in local universe space
export const PLANET_LOCAL_POS = new Vector3(30, 5, -120);

// 🌍 her radius — 40 units of rock, ocean, and atmosphere
export const PLANET_RADIUS = 40;

/*
 * 🍎 GM — the gravitational parameter
 * ────────────────────────────────────
 * Newton's apple, but in space. No tree required.
 *
 * GM = 3100 means at distance r from center:
 *   acceleration = GM / r^2
 *   orbital velocity = sqrt(GM / r)
 *
 * At r = 124 (starting position): v_orb ≈ 5 su/s, gentle tug
 * At r = 80  (halfway there):     v_orb ≈ 6.2, she's insistent
 * At r = 60  (Zeno's porch):      v_orb ≈ 7.2, commit or leave
 *
 * The planet doesn't chase you.
 * She just... waits. Patiently. With math.
 */
export const GM = 3100;

/**
 * getDistanceToSurface — the number that actually matters
 *
 * Not "how far from her center" — that puts you 40 units
 * inside the crust before you even notice. We measure
 * from the surface: where the atmosphere ends and the
 * void begins. Zero = you're kissing the thermosphere.
 */
export function getDistanceToSurface(shipPos: Vector3): number {
  return Math.max(shipPos.distanceTo(PLANET_LOCAL_POS) - PLANET_RADIUS, 0);
}

/**
 * getVisualDistanceToSurface — what the pilot actually sees
 *
 * With the "scale from near surface" fix in Planet.tsx,
 * the camera-facing surface stays pinned at its physical
 * position — the planet grows behind it, not toward you.
 * So what you see = what the math says. Simple as that.
 *
 * (The old version tried to account for the scaled sphere
 * rushing through the camera. Now it doesn't rush. Fixed.)
 */
export function getVisualDistanceToSurface(shipPos: Vector3): number {
  return getDistanceToSurface(shipPos);
}

/**
 * computeGrandnessScale — exponential visual scaling (THE BIG ONE)
 *
 * Uses surface distance, not center distance.
 * Inverse power curve: (90 / d) ^ 2.8
 * She doesn't just grow. She ARRIVES.
 *
 *   ┌─────────────────────────────────────────────┐
 *   │  d_surface ≈ 84  →  1.2×  (a marble)       │
 *   │  d_surface ≈ 50  →  5×   (she's real)      │
 *   │  d_surface ≈ 30  →  22×  (fills the glass) │
 *   │  d_surface ≈ 15  →  170× (world-sized)     │
 *   │  d_surface ≈ 10  →  540× (you ARE there)   │
 *   │  d_surface ≈ 6   →  2000× (cap: horizon)   │
 *   └─────────────────────────────────────────────┘
 *
 * At 2000× the visual radius is 80,000 units.
 * Curvature: 1/80,000. Flat as Kansas.
 * The horizon stretches in every direction.
 * You're not looking at a planet anymore —
 * you're looking at a place.
 */
export function computeGrandnessScale(surfaceDistance: number): number {
  if (surfaceDistance >= 90) return 1.0;
  const d = Math.max(surfaceDistance, 2);
  return Math.min(Math.pow(90 / d, 2.8), 2000);
}

/**
 * computeZenoMultiplier — atmospheric braking zone
 *
 * With real gravity handling the long-range approach,
 * Zeno retreats to where he belongs: the thermosphere.
 * 20su and below — where the air gets thick (metaphorically)
 * and the hull starts glowing (also metaphorically... for now).
 *
 * Think of it as atmospheric drag, not cosmic molasses.
 * Gravity does the pulling. Zeno does the catching.
 *
 *   d_surf = 20+ → 100% thrust (vacuum — Newton's domain)
 *   d_surf ≈ 15  →  35%  (upper atmosphere — buffeting)
 *   d_surf ≈ 10  →  10%  (dense atmo — she's thick down here)
 *   d_surf ≈ 5   →  1.4% (soup — every meter costs everything)
 *   d_surf ≈ 2   →  1%   (Zeno's floor — you made it. almost.)
 */
export function computeZenoMultiplier(surfaceDistance: number): number {
  if (surfaceDistance >= 20) return 1.0;
  const t = (Math.max(surfaceDistance, 2) - 2) / 18;
  return 0.01 + 0.99 * t * t * t;
}

/**
 * getLODLevel — texture detail tier based on surface proximity
 *
 *   LOD 0 = distant marble (256px, you squint)
 *   LOD 1 = she's in focus (512px, coastlines appear)
 *   LOD 2 = high detail (1024px, mountain ridges)
 *   LOD 3 = ultra (2048px, rivers and biomes)
 */
export function getLODLevel(surfaceDistance: number): number {
  if (surfaceDistance >= 50) return 0;
  if (surfaceDistance >= 25) return 1;
  if (surfaceDistance >= 8) return 2;
  return 3;
}
