/**
 * Character Eyes System — mounts EYES.png onto character heads
 * Supports both HTML5 Image / pre-rendered raster sprites from EYES.png
 * and high-precision vector polygon fallback for subpixel sharpness and tests.
 */
import { EYES_PNG_DATA_URL } from './eyes-data';
import type { SkinId } from './skins';

// Normalized [nx, ny] polygon vertices sampled directly from EYES.png (W: 46, H: 155)
export const TOP_EYE_POLY: [number, number][] = [
  [0.087, 0.0], [0.109, 0.032], [0.13, 0.065], [0.174, 0.097],
  [0.196, 0.129], [0.217, 0.161], [0.261, 0.194], [0.283, 0.226],
  [0.304, 0.258], [0.326, 0.29], [0.37, 0.323], [0.391, 0.355],
  [0.413, 0.387], [0.457, 0.419], [0.478, 0.452],
  [0.63, 0.452], [0.891, 0.419], [0.957, 0.387], [0.978, 0.355],
  [0.978, 0.323], [0.957, 0.29], [0.935, 0.258], [0.87, 0.226],
  [0.804, 0.194], [0.739, 0.161], [0.652, 0.129], [0.543, 0.097],
  [0.413, 0.065], [0.283, 0.032], [0.152, 0.0],
];

export const BOT_EYE_POLY: [number, number][] = [
  [0.391, 0.542], [0.37, 0.574], [0.326, 0.606], [0.304, 0.639],
  [0.283, 0.671], [0.239, 0.703], [0.217, 0.735], [0.196, 0.768],
  [0.152, 0.8], [0.13, 0.832], [0.109, 0.865], [0.087, 0.897],
  [0.043, 0.929], [0.022, 0.961], [0.022, 0.994],
  [0.065, 0.994], [0.239, 0.961], [0.348, 0.929], [0.478, 0.897],
  [0.565, 0.865], [0.652, 0.832], [0.739, 0.8], [0.804, 0.768],
  [0.848, 0.735], [0.87, 0.703], [0.891, 0.671], [0.891, 0.639],
  [0.848, 0.606], [0.761, 0.574], [0.543, 0.542],
];

export interface EyeRenderOptions {
  enemy?: boolean;
  flash?: boolean;
  skinId?: SkinId;
  fillColor?: string;
  outlineColor?: string;
  scale?: number;
  glow?: boolean;
}

// Image singleton & pre-tinted canvas cache
let eyesImageElement: HTMLImageElement | null = null;
let isImageLoaded = false;
const spriteCache = new Map<string, HTMLCanvasElement>();

export function getEyesImage(): HTMLImageElement | null {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;
  if (!eyesImageElement) {
    eyesImageElement = new Image();
    eyesImageElement.src = EYES_PNG_DATA_URL;
    eyesImageElement.onload = () => {
      isImageLoaded = true;
      // Pre-warm commonly used sprites
      createTintedEyeSprite('#ffffff', '#111216');
      createTintedEyeSprite('#ff3b4b', '#6b0a14');
      createTintedEyeSprite('#00e5ff', '#004060');
    };
  }
  return eyesImageElement;
}

// Auto-trigger loading if in browser
if (typeof window !== 'undefined') {
  getEyesImage();
}

/**
 * Creates an offscreen sprite combining the filled eye polygons with the raster EYES.png outline
 */
function createTintedEyeSprite(fillColor: string, strokeColor: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = `${fillColor}_${strokeColor}`;
  const existing = spriteCache.get(key);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 46;
  canvas.height = 155;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Draw solid filled interior polygons
  ctx.fillStyle = fillColor;
  const drawPoly = (poly: [number, number][]) => {
    ctx.beginPath();
    poly.forEach(([nx, ny], i) => {
      const px = nx * 46;
      const py = ny * 155;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  };
  drawPoly(TOP_EYE_POLY);
  drawPoly(BOT_EYE_POLY);

  // 2. Overlay EYES.png raster if loaded
  if (eyesImageElement && isImageLoaded) {
    ctx.drawImage(eyesImageElement, 0, 0, 46, 155);
  } else {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.2;
    const strokePoly = (poly: [number, number][]) => {
      ctx.beginPath();
      poly.forEach(([nx, ny], i) => {
        const px = nx * 46;
        const py = ny * 155;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    };
    strokePoly(TOP_EYE_POLY);
    strokePoly(BOT_EYE_POLY);
  }

  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Draws the eye pair using vector paths directly onto the target canvas
 */
export function drawEyesVector(
  ctx: CanvasRenderingContext2D,
  eyeX: number,
  eyeY: number,
  eyeW: number,
  eyeH: number,
  fillColor: string,
  strokeColor: string
) {
  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = Math.max(0.75, eyeW * 0.12);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const renderEye = (poly: [number, number][]) => {
    ctx.beginPath();
    poly.forEach(([nx, ny], idx) => {
      const px = eyeX + nx * eyeW;
      const py = eyeY + ny * eyeH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  renderEye(TOP_EYE_POLY);
  renderEye(BOT_EYE_POLY);
  ctx.restore();
}

/**
 * Mounts EYES.png onto a character head at (hx, hy) with given radius.
 * Local coordinate system assumes the character is facing +X.
 */
export function drawCharacterEyes(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  radius: number,
  opts: EyeRenderOptions = {}
) {
  const flash = !!opts.flash;
  const enemy = !!opts.enemy;
  const skin = opts.skinId || 'stickman';

  // Determine eye colors based on skin, team, and hit flash
  let fill = opts.fillColor;
  let stroke = opts.outlineColor;

  if (!fill) {
    if (flash) fill = '#ffffff';
    else if (enemy) {
      fill = skin === 'neon_shapes' ? '#ff4060' : skin === 'cyber_bot' ? '#ff3b4b' : '#ff4d5a';
    } else {
      fill = skin === 'neon_shapes' ? '#00e5ff' : skin === 'cyber_bot' ? '#f59e0b' : '#ffffff';
    }
  }

  if (!stroke) {
    if (flash) stroke = '#ffe0e0';
    else if (enemy) {
      stroke = skin === 'stickman' ? '#7a0c16' : '#2b070b';
    } else {
      stroke = skin === 'stickman' ? '#0a0b0d' : '#14171a';
    }
  }

  // Calculate eye bounds on the forward-facing edge of the head (+X direction)
  const scale = opts.scale || 1.0;
  // Eye height spans ~80% of head diameter (R * 1.62)
  const eyeH = radius * 1.62 * scale;
  // Aspect ratio of EYES.png (46 / 155 ≈ 0.2968)
  const eyeW = eyeH * (46 / 155);
  // Position eye on the front half of the head
  const eyeX = hx + radius * 0.28 * scale;
  const eyeY = hy - eyeH / 2;

  ctx.save();

  // Subtle eye glow for active agents and enemies
  if (opts.glow || (enemy && !flash)) {
    ctx.shadowColor = enemy ? 'rgba(255, 30, 60, 0.45)' : 'rgba(0, 220, 255, 0.4)';
    ctx.shadowBlur = 3.5;
  }

  // 1. Render vector base (guarantees solid fill and works seamlessly everywhere)
  drawEyesVector(ctx, eyeX, eyeY, eyeW, eyeH, fill, stroke);

  // 2. If EYES.png image / pre-tinted raster sprite is available, draw on top for exact raster texture
  const sprite = createTintedEyeSprite(fill, stroke);
  if (sprite) {
    try {
      ctx.drawImage(sprite, eyeX, eyeY, eyeW, eyeH);
    } catch {
      // Safe fallback if proxy ctx in test
    }
  } else if (eyesImageElement && isImageLoaded) {
    try {
      ctx.drawImage(eyesImageElement, eyeX, eyeY, eyeW, eyeH);
    } catch {
      // Safe fallback if proxy ctx in test
    }
  }

  ctx.restore();
}
