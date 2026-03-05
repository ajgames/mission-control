/*
 * 🏔️ Terrain Noise Factory — where flatland meets fractals
 * ──────────────────────────────────────────────────────────
 * The planet looks flat at 2000× scale. So we lean in.
 * Spawn a terrain plane. Give it mountains. Give it valleys.
 * Give it the kind of procedural personality that makes
 * a mathematician weep and a hiker reach for their boots.
 *
 * This is the non-Euclidean moment:
 * The sphere never becomes a plane.
 * The plane just... appears. Tangent to the sphere.
 * And suddenly you're not orbiting a marble.
 * You're standing on a world.
 *
 *     ╔══════════════════════════════════════╗
 *     ║   Sphere → ████████████ ← Plane     ║
 *     ║                                      ║
 *     ║   "Any sufficiently large sphere     ║
 *     ║    is indistinguishable from          ║
 *     ║    a flat surface."                   ║
 *     ║              — Arthur C. Flatke      ║
 *     ╚══════════════════════════════════════╝
 */

// ── the terrain's vital statistics ──
export const TERRAIN_SIZE = 500;
export const TERRAIN_SEGMENTS = 128;
export const MAX_HEIGHT = 8;

// ── tree and rock census ──
export const TREE_COUNT = 600;
export const ROCK_COUNT = 300;

import { mulberry32, TERRAIN_SEED } from "./prng";

/*
 * 🎲 Permutation table — the secret sauce of value noise
 *
 * A shuffled array of integers that turns (x, y) coordinates
 * into pseudo-random gradient directions. Same seed → same
 * shuffle → same mountains. Change the seed and you get
 * a whole new geography, but the math stays honest.
 */
function buildPermTable(seed: number): Uint8Array {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(512);
  // fill first 256 with identity
  for (let i = 0; i < 256; i++) perm[i] = i;
  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }
  // mirror to avoid modulo in lookups
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  return perm;
}

// pre-built for the default seed — reusable across calls
const defaultPerm = buildPermTable(TERRAIN_SEED);

/*
 * 🌊 valueNoise2D — the bedrock of all procedural terrain
 *
 * Takes two coordinates, returns a smooth random value 0..1.
 * Uses bilinear interpolation between lattice points with
 * a hermite smoothstep for that organic, non-grid feel.
 *
 * The permutation table ensures the same input always gives
 * the same output. Determinism is the pillar of procedural worlds.
 */
function valueNoise2D(x: number, y: number, perm: Uint8Array): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  // smoothstep — the hermite curve that makes noise look natural
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  // four corners of the lattice cell
  const aa = perm[perm[xi] + yi] / 255;
  const ab = perm[perm[xi] + yi + 1] / 255;
  const ba = perm[perm[xi + 1] + yi] / 255;
  const bb = perm[perm[xi + 1] + yi + 1] / 255;

  // bilinear interpolation — smooth blending between corners
  const x1 = aa + u * (ba - aa);
  const x2 = ab + u * (bb - ab);
  return x1 + v * (x2 - x1);
}

/**
 * fractalNoise2D — layered octaves for natural terrain
 *
 * Each octave doubles the frequency and halves the amplitude.
 * Like looking at a mountain range from orbit, then from a
 * helicopter, then from a hiking trail. Same math, different zoom.
 *
 *   Octave 1: broad continental shapes (gentle rolling hills)
 *   Octave 2: mountain ridges (the drama)
 *   Octave 3: rocky outcrops (the texture)
 *   Octave 4: pebbles and dirt (the realism)
 *
 * Returns 0..1 (normalized)
 */
export function fractalNoise2D(
  x: number,
  y: number,
  seed: number = TERRAIN_SEED,
  octaves: number = 4
): number {
  const perm = seed === TERRAIN_SEED ? defaultPerm : buildPermTable(seed);
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += valueNoise2D(x * frequency, y * frequency, perm) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * getTerrainHeight — the one function to rule them all
 *
 * Given terrain-local X and Z (centered at origin, ranging
 * ±TERRAIN_SIZE/2), returns the Y displacement in world units.
 *
 * The spherical UV offset allows different terrain geography
 * when the ship orbits to a new region of the planet.
 * Same seed + different UV = different mountains. Same vibes.
 *
 * Edge falloff: outer 20% of the terrain fades height → 0,
 * so the edges melt seamlessly into the scaled sphere behind.
 * No hard cuts. No seams. Just vibes transitioning to more vibes.
 *
 *     center ████████████████████ edge
 *            ▲ full height    ▼ fades to 0
 */
export function getTerrainHeight(
  localX: number,
  localZ: number,
  uvOffsetX: number = 0,
  uvOffsetY: number = 0
): number {
  const half = TERRAIN_SIZE / 2;
  // noise sampling coordinates — scale to get nice feature sizes
  const nx = (localX / TERRAIN_SIZE) * 4 + uvOffsetX * 10;
  const nz = (localZ / TERRAIN_SIZE) * 4 + uvOffsetY * 10;

  const noise = fractalNoise2D(nx + 0.5, nz + 0.5);

  // remap from 0..1 to -0.3..1.0 — valleys dip below baseline
  const remapped = noise * 1.3 - 0.3;
  const height = Math.max(remapped, 0) * MAX_HEIGHT;

  // ── edge falloff — the terrain melts into the sphere ──
  const distFromCenter = Math.sqrt(localX * localX + localZ * localZ);
  const edgeStart = half * 0.8; // 80% of half-size
  if (distFromCenter > edgeStart) {
    const t = (distFromCenter - edgeStart) / (half - edgeStart);
    const falloff = 1 - t * t; // quadratic falloff — smooth, not abrupt
    return height * Math.max(falloff, 0);
  }

  return height;
}
