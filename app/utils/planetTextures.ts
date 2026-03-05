import * as THREE from "three";

/*
 * 🎨 Planet Texture Factory — seeded, deterministic, LOD-aware
 * ────────────────────────────────────────────────────────────
 * Every planet deserves a face. This one gets four:
 * each sharper than the last, like zooming into
 * a Mandelbrot set made of oceans and forests.
 *
 * The trick: a seeded PRNG keeps continents in the
 * same spots across all LOD tiers. LOD 3 doesn't
 * invent new geography — she reveals what was always there.
 *
 *   LOD 0: "is that a planet or a blueberry?"
 *   LOD 1: "oh she has continents, nice"
 *   LOD 2: "are those... mountain ridges?"
 *   LOD 3: "I can see rivers. I can see everything."
 *
 *     ┌────────────────────────────────────┐
 *     │   256    512    1024    2048       │
 *     │    ●      ◉       ◎       ☀       │
 *     │  marble  globe  atlas  satellite  │
 *     └────────────────────────────────────┘
 */

// ── seeded PRNG — same seed, same planet, every time ──
// (Mulberry32: small, fast, deterministic)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── LOD configuration ──
const LOD_CONFIG = [
  { width: 256, height: 128, continents: 20, clouds: 40 },
  { width: 512, height: 256, continents: 40, clouds: 80 },
  { width: 1024, height: 512, continents: 80, clouds: 120 },
  { width: 2048, height: 1024, continents: 160, clouds: 200 },
] as const;

// the planet's DNA — change this number, change her face
const PLANET_SEED = 42;

/**
 * generateSurfaceTexture — procedural continents, oceans, and ice
 *
 * Higher LODs add finer features on top of the same base geography.
 * LOD 2+ gets deserts and mountain ridges.
 * LOD 3 gets rivers, biome gradients, and soft ice caps.
 */
function generateSurfaceTexture(lod: number): THREE.CanvasTexture {
  const { width, height, continents } = LOD_CONFIG[lod];
  const rng = mulberry32(PLANET_SEED);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // 🌊 base ocean — deep blue, the color of loneliness
  ctx.fillStyle = "#1a4a7a";
  ctx.fillRect(0, 0, width, height);

  // 🏝️ land masses — continents scattered like archipelago dreams
  // seeded so they stay put across LOD transitions
  const landColors = ["#2d5a1e", "#3a6b2a", "#4a7a35", "#5a8a45"];
  for (let i = 0; i < continents; i++) {
    ctx.fillStyle = landColors[Math.floor(rng() * landColors.length)];
    ctx.beginPath();
    const x = rng() * width;
    const y = rng() * height;
    const rx = (15 + rng() * 40) * (width / 512);
    const ry = (10 + rng() * 25) * (height / 256);
    ctx.ellipse(x, y, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // 🏜️ LOD 2+: deserts and mountain ridges emerge
  if (lod >= 2) {
    const desertRng = mulberry32(PLANET_SEED + 1000);
    const desertCount = lod === 2 ? 15 : 30;
    for (let i = 0; i < desertCount; i++) {
      ctx.fillStyle =
        desertRng() > 0.5
          ? `rgba(194, 170, 100, ${0.3 + desertRng() * 0.3})`
          : `rgba(140, 120, 80, ${0.2 + desertRng() * 0.3})`;
      ctx.beginPath();
      const x = desertRng() * width;
      const y = height * 0.2 + desertRng() * height * 0.6;
      const rx = (8 + desertRng() * 20) * (width / 512);
      const ry = (5 + desertRng() * 12) * (height / 256);
      ctx.ellipse(x, y, rx, ry, desertRng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // 🏔️ mountain ridges — dark lines snaking across continents
    const ridgeRng = mulberry32(PLANET_SEED + 2000);
    const ridgeCount = lod === 2 ? 8 : 20;
    ctx.strokeStyle = "rgba(60, 50, 30, 0.4)";
    ctx.lineWidth = (width / 512) * 1.5;
    for (let i = 0; i < ridgeCount; i++) {
      ctx.beginPath();
      let rx = ridgeRng() * width;
      let ry = ridgeRng() * height;
      ctx.moveTo(rx, ry);
      const segments = 3 + Math.floor(ridgeRng() * 4);
      for (let s = 0; s < segments; s++) {
        rx += (ridgeRng() - 0.5) * width * 0.15;
        ry += (ridgeRng() - 0.5) * height * 0.1;
        ctx.lineTo(rx, ry);
      }
      ctx.stroke();
    }
  }

  // 🌊 LOD 3: rivers — thin blue veins running to the sea
  if (lod >= 3) {
    const riverRng = mulberry32(PLANET_SEED + 3000);
    ctx.strokeStyle = "rgba(40, 80, 140, 0.5)";
    ctx.lineWidth = (width / 512) * 0.8;
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      let rx = riverRng() * width;
      let ry = riverRng() * height;
      ctx.moveTo(rx, ry);
      const segments = 5 + Math.floor(riverRng() * 6);
      for (let s = 0; s < segments; s++) {
        rx += (riverRng() - 0.3) * width * 0.06;
        ry += riverRng() * height * 0.05;
        ctx.lineTo(rx, ry);
      }
      ctx.stroke();
    }
  }

  // 🧊 ice caps — cold but photogenic
  if (lod >= 3) {
    // gradient ice caps for LOD 3 — soft fade from pole to temperate
    const capHeight = height * 0.08;
    const northGrad = ctx.createLinearGradient(0, 0, 0, capHeight);
    northGrad.addColorStop(0, "rgba(220, 235, 255, 0.9)");
    northGrad.addColorStop(1, "rgba(220, 235, 255, 0)");
    ctx.fillStyle = northGrad;
    ctx.fillRect(0, 0, width, capHeight);

    const southGrad = ctx.createLinearGradient(
      0,
      height - capHeight,
      0,
      height
    );
    southGrad.addColorStop(0, "rgba(220, 235, 255, 0)");
    southGrad.addColorStop(1, "rgba(220, 235, 255, 0.9)");
    ctx.fillStyle = southGrad;
    ctx.fillRect(0, height - capHeight, width, capHeight);
  } else {
    // simple rectangles for lower LODs
    const capH = Math.round(height * 0.07);
    ctx.fillStyle = "#ddeeff";
    ctx.fillRect(0, 0, width, capH);
    ctx.fillRect(0, height - capH, width, capH);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * generateCloudTexture — wispy layers that thicken with LOD
 */
function generateCloudTexture(lod: number): THREE.CanvasTexture {
  const { width, height, clouds } = LOD_CONFIG[lod];
  const rng = mulberry32(PLANET_SEED + 5000);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, width, height);

  // ☁️ wispy cloud patches — more at higher LODs
  for (let i = 0; i < clouds; i++) {
    const alpha = 0.1 + rng() * 0.3;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    const x = rng() * width;
    const y = rng() * height;
    const rx = (20 + rng() * 60) * (width / 512);
    const ry = (8 + rng() * 20) * (height / 256);
    ctx.ellipse(x, y, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * generateAllLODTextures — precompute all 8 textures (4 surface + 4 cloud)
 *
 * Call once on mount. Returns arrays indexed by LOD level.
 * Transitions are instant material swaps — no loading spinners in space.
 */
export function generateAllLODTextures(): {
  surface: THREE.CanvasTexture[];
  cloud: THREE.CanvasTexture[];
} {
  const surface: THREE.CanvasTexture[] = [];
  const cloud: THREE.CanvasTexture[] = [];

  for (let lod = 0; lod < 4; lod++) {
    surface.push(generateSurfaceTexture(lod));
    cloud.push(generateCloudTexture(lod));
  }

  return { surface, cloud };
}
