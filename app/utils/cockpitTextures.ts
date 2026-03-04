import * as THREE from "three";

/*
 * 🔩 Procedural Hull Textures
 * ═══════════════════════════════════════════════════
 * Every spacecraft worth its salt has visible panel seams,
 * deck plating grooves, and machined trim edges. The kind
 * of details that whisper "someone built this by hand
 * in a shipyard orbiting Ceres" instead of "someone
 * dragged a box into a scene graph."
 *
 * These textures are born on <canvas> elements — no image
 * files, no fetch requests, no loading screens. Just math,
 * pixels, and the quiet satisfaction of doing things
 * the hard way.
 *
 *    ┌──────────────────────────────────────────┐
 *    │  NORMAL MAP ENCODING CHEAT SHEET         │
 *    │  ────────────────────────────────         │
 *    │  R = 128  →  flat (no X tilt)            │
 *    │  G = 128  →  flat (no Y tilt)            │
 *    │  B = 255  →  pointing straight out       │
 *    │                                          │
 *    │  R < 128  →  tilts LEFT                  │
 *    │  R > 128  →  tilts RIGHT                 │
 *    │  G < 128  →  tilts DOWN                  │
 *    │  G > 128  →  tilts UP                    │
 *    │                                          │
 *    │  We offset ±28 from 128 for seam bevels  │
 *    │  which gives a subtle but readable edge.  │
 *    └──────────────────────────────────────────┘
 */

const SIZE = 512;
const FLAT_R = 128;
const FLAT_G = 128;
const FLAT_B = 230;
const BEVEL = 28;

// ─── helpers ──────────────────────────────────────

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  return [canvas, ctx];
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Flat normal-map background — the "nothing to see here" base */
function fillFlat(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = `rgb(${FLAT_R}, ${FLAT_G}, ${FLAT_B})`;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

/**
 * Paint a beveled rectangular groove into a normal map.
 * The bevel is painted as four edge strips — each tilted
 * in the direction that light would catch a recessed seam.
 *
 *    top edge    → G offset DOWN (128 - BEVEL)
 *    bottom edge → G offset UP   (128 + BEVEL)
 *    left edge   → R offset LEFT (128 - BEVEL)
 *    right edge  → R offset RIGHT(128 + BEVEL)
 */
function paintBeveledGroove(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bevelWidth: number,
  strength: number = BEVEL,
) {
  const bw = bevelWidth;
  const rL = FLAT_R - strength;
  const rR = FLAT_R + strength;
  const gU = FLAT_G + strength;
  const gD = FLAT_G - strength;

  // top edge
  ctx.fillStyle = `rgb(${FLAT_R}, ${gD}, ${FLAT_B})`;
  ctx.fillRect(x, y, w, bw);
  // bottom edge
  ctx.fillStyle = `rgb(${FLAT_R}, ${gU}, ${FLAT_B})`;
  ctx.fillRect(x, y + h - bw, w, bw);
  // left edge
  ctx.fillStyle = `rgb(${rL}, ${FLAT_G}, ${FLAT_B})`;
  ctx.fillRect(x, y, bw, h);
  // right edge
  ctx.fillStyle = `rgb(${rR}, ${FLAT_G}, ${FLAT_B})`;
  ctx.fillRect(x + w - bw, y, bw, h);
}

/** Sprinkle per-pixel noise onto a canvas for roughness variation */
function addNoise(ctx: CanvasRenderingContext2D, intensity: number) {
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity * 255;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
}

// ═══════════════════════════════════════════════════
//  WALL TEXTURES
//  4×3 rectangular panel grid — the bread and butter
//  of any self-respecting bulkhead
// ═══════════════════════════════════════════════════

export function createWallNormalMap(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();
  fillFlat(ctx);

  const cols = 4;
  const rows = 3;
  const cellW = SIZE / cols;
  const cellH = SIZE / rows;
  const bw = 5;

  // panel seam grooves
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      paintBeveledGroove(ctx, col * cellW, row * cellH, cellW, cellH, bw);
    }
  }

  // bolt-head circles at panel corners — tiny raised bumps
  // like the rivets that remind you this hull is holding
  // back the vacuum of space
  const boltR = 4;
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const cx = col * cellW;
      const cy = row * cellH;
      // raised bolt: brighter G (tilts up) and brighter R (tilts right)
      ctx.fillStyle = `rgb(${FLAT_R + 15}, ${FLAT_G + 15}, 255)`;
      ctx.beginPath();
      ctx.arc(cx, cy, boltR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // subtle per-pixel noise for organic variation
  addNoise(ctx, 0.02);

  return toTexture(canvas);
}

export function createWallRoughnessMap(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();

  // base roughness — mid gray
  ctx.fillStyle = "rgb(140, 140, 140)";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // smoother seams (darker = smoother in roughness maps)
  const cols = 4;
  const rows = 3;
  const cellW = SIZE / cols;
  const cellH = SIZE / rows;
  const seamW = 6;

  ctx.fillStyle = "rgb(80, 80, 80)";
  for (let col = 0; col <= cols; col++) {
    ctx.fillRect(col * cellW - seamW / 2, 0, seamW, SIZE);
  }
  for (let row = 0; row <= rows; row++) {
    ctx.fillRect(0, row * cellH - seamW / 2, SIZE, seamW);
  }

  // per-pixel noise for specular variation
  addNoise(ctx, 0.06);

  return toTexture(canvas);
}

// ═══════════════════════════════════════════════════
//  FLOOR TEXTURES
//  Deck plating — the kind of floor that tells you
//  a thousand boots have walked here before you
//  and a thousand more will after
// ═══════════════════════════════════════════════════

export function createFloorNormalMap(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();
  fillFlat(ctx);

  const stripes = 8;
  const stripeH = SIZE / stripes;
  const bw = 4;

  // horizontal deck-plating stripes with beveled edges
  for (let i = 0; i < stripes; i++) {
    paintBeveledGroove(ctx, 0, i * stripeH, SIZE, stripeH, bw, BEVEL + 4);
  }

  // 2 vertical cross-seams — structural divisions
  const crossPositions = [SIZE * 0.33, SIZE * 0.66];
  for (const x of crossPositions) {
    paintBeveledGroove(ctx, x - 3, 0, 6, SIZE, 2, BEVEL - 5);
  }

  // subtle diamond tread pattern — because deck plating
  // without grip texture is just a slip hazard in zero-g
  const treadSpacing = 16;
  const treadSize = 3;
  ctx.fillStyle = `rgb(${FLAT_R + 8}, ${FLAT_G + 8}, 245)`;
  for (let y = 0; y < SIZE; y += treadSpacing) {
    for (let x = 0; x < SIZE; x += treadSpacing) {
      const offsetX = (y / treadSpacing) % 2 === 0 ? 0 : treadSpacing / 2;
      ctx.fillRect(x + offsetX, y, treadSize, treadSize);
    }
  }

  addNoise(ctx, 0.015);

  return toTexture(canvas);
}

export function createFloorRoughnessMap(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();

  ctx.fillStyle = "rgb(160, 160, 160)";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // worn-center gradient per stripe — boots wear down the middle
  const stripes = 8;
  const stripeH = SIZE / stripes;
  for (let i = 0; i < stripes; i++) {
    const y = i * stripeH;
    const gradient = ctx.createLinearGradient(0, y, 0, y + stripeH);
    gradient.addColorStop(0, "rgb(160, 160, 160)");
    gradient.addColorStop(0.4, "rgb(120, 120, 120)");
    gradient.addColorStop(0.6, "rgb(120, 120, 120)");
    gradient.addColorStop(1, "rgb(160, 160, 160)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, SIZE, stripeH);
  }

  // heavier noise than walls — this floor has seen things
  addNoise(ctx, 0.1);

  return toTexture(canvas);
}

// ═══════════════════════════════════════════════════
//  CEILING TEXTURES
//  3×2 large recessed panels — the quiet overhead
//  grid that you only notice when you look up
//  and think "oh, that's nice"
// ═══════════════════════════════════════════════════

export function createCeilingNormalMap(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();
  fillFlat(ctx);

  const cols = 3;
  const rows = 2;
  const cellW = SIZE / cols;
  const cellH = SIZE / rows;
  const bw = 8; // wider, softer bevels for overhead panels

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      paintBeveledGroove(ctx, col * cellW, row * cellH, cellW, cellH, bw, BEVEL - 6);
    }
  }

  addNoise(ctx, 0.01);

  return toTexture(canvas);
}

export function createCeilingRoughnessMap(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();

  // cleaner than walls or floor — nobody walks on the ceiling
  ctx.fillStyle = "rgb(130, 130, 130)";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // slight variation at panel borders
  const cols = 3;
  const rows = 2;
  const cellW = SIZE / cols;
  const cellH = SIZE / rows;
  const borderW = 10;

  ctx.fillStyle = "rgb(100, 100, 100)";
  for (let col = 0; col <= cols; col++) {
    ctx.fillRect(col * cellW - borderW / 2, 0, borderW, SIZE);
  }
  for (let row = 0; row <= rows; row++) {
    ctx.fillRect(0, row * cellH - borderW / 2, SIZE, borderW);
  }

  addNoise(ctx, 0.03);

  return toTexture(canvas);
}

// ═══════════════════════════════════════════════════
//  TRIM TEXTURE
//  45° cross-hatch — the knurled grip pattern you'd
//  find on machined metal edges. It says "I was
//  milled, not molded" and it means it.
// ═══════════════════════════════════════════════════

export function createTrimNormalMap(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas();
  fillFlat(ctx);

  const spacing = 12;
  const lineWidth = 2;

  // diagonal lines — one direction tilts R, the other tilts G
  // together they create a diamond cross-hatch pattern
  ctx.lineWidth = lineWidth;

  // 45° lines (top-left to bottom-right)
  ctx.strokeStyle = `rgb(${FLAT_R + 14}, ${FLAT_G - 14}, ${FLAT_B})`;
  for (let offset = -SIZE; offset < SIZE * 2; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + SIZE, SIZE);
    ctx.stroke();
  }

  // 135° lines (top-right to bottom-left)
  ctx.strokeStyle = `rgb(${FLAT_R - 14}, ${FLAT_G + 14}, ${FLAT_B})`;
  for (let offset = -SIZE; offset < SIZE * 2; offset += spacing) {
    ctx.beginPath();
    ctx.moveTo(offset + SIZE, 0);
    ctx.lineTo(offset, SIZE);
    ctx.stroke();
  }

  addNoise(ctx, 0.015);

  return toTexture(canvas);
}
