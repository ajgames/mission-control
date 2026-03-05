/*
 * 🎲 Mulberry32 — the tiny PRNG that could
 * ────────────────────────────────────────────
 * One function. 32 bits of state. Infinite worlds.
 *
 * Feed her a seed, she'll feed you back a universe
 * of deterministic randomness. Same seed = same
 * continents, same mountains, same forests.
 * Change the seed and poof — new planet, who dis?
 *
 * She lives here so nobody has to copy-paste her
 * into three files ever again. (We learned that lesson.)
 *
 *   mulberry32(42)()  → 0.6011037519201636
 *   mulberry32(42)()  → 0.6011037519201636  (see? deterministic.)
 */

export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// the planet's DNA — change this number, change her face
export const PLANET_SEED = 42;

// the terrain's DNA — seeded offset from the planet seed
export const TERRAIN_SEED = 42 + 4000;
