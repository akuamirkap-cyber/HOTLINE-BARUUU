import type { WType, Swing } from './engine';

export type SkinId = 'superhot' | 'stickman' | 'neon_shapes' | 'classic' | 'cyber_bot';

export interface SkinDef {
  id: SkinId;
  name: string;
  category: string;
  tagline: string;
  badge: string;
  accent: string;
  description: string;
  playerTag: string;
  enemyTag: string;
}

export const SKINS: Record<SkinId, SkinDef> = {
  superhot: {
    id: 'superhot',
    name: 'SUPERHOT // GLASS',
    category: 'CRYSTALLINE',
    tagline: 'Faceted Red & White Glass Shards',
    badge: 'POLYGON',
    accent: '#e51d2e',
    description: 'Bentuk kristal poligon kaca ikonik. Musuh terbuat dari kaca merah delima berkilau, sementara kamu adalah prisma kristal putih murni.',
    playerTag: 'White Crystal Prism',
    enemyTag: 'Ruby Glass Hostiles',
  },
  stickman: {
    id: 'stickman',
    name: 'STICKMAN // SHAPES',
    category: 'MINIMAL VECTOR',
    tagline: 'Classic Stick Figure & Circles',
    badge: 'STICK FIGURE',
    accent: '#1a1d1f',
    description: 'Karakter figur stik minimalis dengan kepala bulat sempurna, sendi artikulasi fleksibel, dan tangan lingkaran mematikan.',
    playerTag: 'Onyx Stick Agent',
    enemyTag: 'Crimson Stick Brawlers',
  },
  neon_shapes: {
    id: 'neon_shapes',
    name: 'NEON // GEOMETRIC',
    category: 'ARCADE VECTOR',
    tagline: 'Delta Wing & Hexagon Prisms',
    badge: 'NEON SHAPES',
    accent: '#00d2ff',
    description: 'Bentuk geometri tajam arcade modern. Pemain berbentuk segitiga Delta Interceptor bersayap, musuh berbentuk prisma heksagonal.',
    playerTag: 'Cyan Delta Interceptor',
    enemyTag: 'Neon Hexagon Drones',
  },
  classic: {
    id: 'classic',
    name: 'OPERATOR // TACTICAL',
    category: 'RETRO HOTLINE',
    tagline: 'Classic Athletic Agent Silhouette',
    badge: 'ORIGINAL',
    accent: '#2b2d34',
    description: 'Tampilan orisinal agen taktis bergaya Hotline Miami dengan rompi anti-peluru, sarung tangan tempur, dan siluet atletis.',
    playerTag: 'Covert Operative',
    enemyTag: 'Suit Enforcers',
  },
  cyber_bot: {
    id: 'cyber_bot',
    name: 'CYBER // MECHA SQUIRCLE',
    category: 'SCI-FI ROBOT',
    tagline: 'Heavy Industrial Plating & Visor',
    badge: 'MECHA',
    accent: '#f59e0b',
    description: 'Chassis robotik squircle dengan pelindung baja modular, visor optik bercahaya, dan manipulator hidrolik.',
    playerTag: 'Titanium Drone',
    enemyTag: 'Hazard Mech Units',
  },
};

export const SKIN_LIST: SkinDef[] = Object.values(SKINS);

const SKIN_STORAGE_KEY = 'hotline-character-skin';

let inMemorySkin: SkinId = 'superhot';

export function getStoredSkin(): SkinId {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(SKIN_STORAGE_KEY);
      if (saved && saved in SKINS) return saved as SkinId;
    }
  } catch { /* storage fallback */ }
  return inMemorySkin;
}

export function setStoredSkin(id: SkinId): void {
  inMemorySkin = id;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SKIN_STORAGE_KEY, id);
    }
  } catch { /* storage fallback */ }
}

export interface RenderOptions {
  kick?: number;
  side?: number;
  flash?: number;
  fistDur?: number;
  stagger?: number;
  recoil?: number;
  swing?: Swing | null;
  moveSpeed?: number;
  hurt?: number;
  held?: boolean;
  boss?: boolean;
}

const WLEN: Partial<Record<WType, number>> = { bat: 28, pipe: 26, knife: 16, katana: 37, nunchaku: 32 };
const angDiff = (a: number, b: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

// -------------------------------------------------------------------------
// Helper: Draw stylized weapon preview or in-hand weapon
// -------------------------------------------------------------------------
export function drawWeaponStandard(ctx: CanvasRenderingContext2D, t: WType) {
  ctx.fillStyle = '#0b0b0b';
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 0.8;
  const rect = (x: number, y: number, w: number, h: number) => { ctx.fillRect(x, y, w, h); };
  switch (t) {
    case 'bat':
      ctx.beginPath(); ctx.moveTo(-2, -1.3); ctx.lineTo(26, -3); ctx.lineTo(28, 0); ctx.lineTo(26, 3); ctx.lineTo(-2, 1.3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(25, -1.5); ctx.stroke(); break;
    case 'pipe': rect(-2, -1.8, 28, 3.6); ctx.strokeRect(-2, -1.8, 28, 3.6); break;
    case 'knife':
      rect(-2, -1.5, 6, 3);
      ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(16, -0.5); ctx.lineTo(4, 1.5); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'katana':
      rect(-3, -1.4, 8, 2.8); rect(5, -3, 1.6, 6);
      ctx.beginPath(); ctx.moveTo(6.6, -1.2); ctx.lineTo(34, -1.6); ctx.lineTo(37, 0); ctx.lineTo(6.6, 1.2); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'nunchaku': {
      ctx.fillStyle = '#1c1c1f';
      ctx.fillRect(-2, -1.8, 16, 3.6);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(-2, -1.9, 2.5, 3.8);
      ctx.fillRect(11, -2, 3, 4);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(15.5, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
      ctx.ellipse(19.5, 0, 2.6, 1.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.translate(22, 0);
      ctx.rotate(0.85);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(0, -2, 3, 4);
      ctx.fillStyle = '#1c1c1f';
      ctx.fillRect(3, -1.8, 16, 3.6);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(16.5, -1.9, 2.5, 3.8);
      ctx.restore();
      break;
    }
    case 'pistol': rect(0, -2, 13, 4); rect(0, 1, 4, 4); break;
    case 'shotgun': rect(-6, -2.2, 30, 4.4); rect(8, -3, 8, 6); ctx.strokeRect(-6, -2.2, 30, 4.4); break;
    case 'uzi': rect(0, -2.5, 15, 5); rect(5, 2, 3, 6); break;
    case 'sniper':
      rect(-10, -2.2, 14, 4.4); rect(4, -1.3, 34, 2.6); rect(38, -1.8, 3, 3.6);
      ctx.fillStyle = '#1e1e1e'; rect(6, -4.5, 12, 2.6); ctx.fillStyle = '#e0141e'; rect(17, -4.2, 1.5, 2); ctx.fillStyle = '#0b0b0b';
      ctx.strokeRect(-10, -2.2, 14, 4.4); break;
    case 'rifle': rect(-8, -2, 34, 4); rect(6, 1.5, 4, 7); rect(-8, -2.8, 7, 5.6); ctx.strokeRect(-8, -2, 34, 4); break;
  }
}

// -------------------------------------------------------------------------
// Human Torso Facet Points
// -------------------------------------------------------------------------
function humanTorsoPoints(facets: number[]): [number, number][] {
  const shape: [number, number][] = [[6.7, -4.8], [3.7, -9.2], [-1, -9.5], [-6.2, -5.9], [-7, -3.3], [-7, 3.3], [-6.2, 5.9], [-1, 9.5], [3.7, 9.2], [6.7, 4.8]];
  return shape.map(([x, y], i) => {
    const variation = 1 + ((facets[i % facets.length] || 1) - 1) * 0.35;
    return [x * variation, y * variation];
  });
}

// -------------------------------------------------------------------------
// Limb Drawing Helper (Classic / Superhot)
// -------------------------------------------------------------------------
function drawLimbDefault(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color: string, shine: string) {
  const dx = x2 - x1, dy = y2 - y1;
  const length = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / length, ny = dx / length;
  const shoulder = width * 0.48, muscle = width * 0.62, wrist = width * 0.38;
  const plane = (ox = 0, oy = 0) => {
    ctx.beginPath();
    ctx.moveTo(x1 + nx * shoulder + ox, y1 + ny * shoulder + oy);
    ctx.quadraticCurveTo(x1 + dx * 0.4 + nx * muscle + ox, y1 + dy * 0.4 + ny * muscle + oy, x2 + nx * wrist + ox, y2 + ny * wrist + oy);
    ctx.lineTo(x2 - nx * wrist + ox, y2 - ny * wrist + oy);
    ctx.quadraticCurveTo(x1 + dx * 0.4 - nx * muscle + ox, y1 + dy * 0.4 - ny * muscle + oy, x1 - nx * shoulder + ox, y1 - ny * shoulder + oy);
    ctx.closePath();
  };
  ctx.save();
  ctx.fillStyle = 'rgba(78,55,60,0.1)';
  plane(0.65, 0.85); ctx.fill();
  const gradient = ctx.createLinearGradient(x1 + nx * shoulder, y1 + ny * shoulder, x1 - nx * shoulder, y1 - ny * shoulder);
  gradient.addColorStop(0, shine); gradient.addColorStop(0.48, color); gradient.addColorStop(1, color);
  ctx.fillStyle = gradient;
  plane(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(x1 + nx * shoulder * 0.65, y1 + ny * shoulder * 0.65);
  ctx.lineTo(x1 + dx * 0.44 + nx * muscle * 0.55, y1 + dy * 0.44 + ny * muscle * 0.55);
  ctx.lineTo(x2 + nx * wrist * 0.15, y2 + ny * wrist * 0.15);
  ctx.lineTo(x1 + nx * shoulder * 0.08, y1 + ny * shoulder * 0.08);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawHandDefault(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, color: string, shine: string, side = 1, clenched = false) {
  r *= 0.66;
  const palmX = r * (clenched ? 1.08 : 1.2);
  const palmY = r * (clenched ? 0.88 : 0.78);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  const shade = ctx.createLinearGradient(-r, -r, r, r);
  shade.addColorStop(0, shine); shade.addColorStop(0.45, color); shade.addColorStop(1, color);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, side * palmY * 0.77, r * 0.42, r * (clenched ? 0.57 : 0.68), -side * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, palmX, palmY, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(25,15,22,0.27)';
  ctx.lineWidth = Math.max(0.28, r * 0.12);
  for (let i = -1; i <= 1; i++) {
    const fy = i * palmY * 0.43;
    ctx.beginPath();
    ctx.moveTo(palmX * 0.42, fy - r * 0.12);
    ctx.quadraticCurveTo(palmX * 0.55, fy, palmX * 0.37, fy + r * 0.1);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-r * 0.42, side * palmY * 0.4); ctx.quadraticCurveTo(-r * 0.1, side * palmY * 0.3, r * 0.22, side * palmY * 0.65); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.ellipse(-r * 0.14, -palmY * 0.37, palmX * 0.65, palmY * 0.23, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// -------------------------------------------------------------------------
// STICKMAN Limb & Hand Helpers
// -------------------------------------------------------------------------
function drawStickLimb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, strokeColor: string, jointColor?: string) {
  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = Math.max(2.4, width * 0.75);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  if (jointColor) {
    ctx.fillStyle = jointColor;
    ctx.beginPath();
    ctx.arc(x2, y2, Math.max(1.8, width * 0.38), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStickHand(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, innerColor?: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(2.8, r * 0.85), 0, Math.PI * 2);
  ctx.fill();
  if (innerColor) {
    ctx.fillStyle = innerColor;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.2, r * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// -------------------------------------------------------------------------
// Main Character Skin Renderer
// -------------------------------------------------------------------------
export function renderCharacterSkin(
  ctx: CanvasRenderingContext2D,
  skinId: SkinId,
  x: number,
  y: number,
  angle: number,
  enemy: boolean,
  weapon: WType | null,
  walkT: number,
  attackAnim: number,
  facets: number[],
  windup = 0,
  muzzle = 0,
  o: RenderOptions = {},
  gameTime = 0
) {
  const isStick = skinId === 'stickman';
  const isNeon = skinId === 'neon_shapes';
  const isCyber = skinId === 'cyber_bot';
  const isSuperhot = skinId === 'superhot';
  const isClassic = skinId === 'classic';

  ctx.save();
  const gait = Math.min(1, (o.moveSpeed || 0) / 170);
  const phase = walkT * 0.06;
  const bob = Math.abs(Math.sin(phase)) * 2.1 * gait;
  ctx.translate(x, y - bob);
  if (o.boss) ctx.scale(1.4, 1.4);

  // Soft floor shadow
  const shadowColor = isStick
    ? 'rgba(20,20,25,0.18)'
    : isNeon
    ? enemy ? 'rgba(240,30,50,0.16)' : 'rgba(0,210,255,0.18)'
    : isCyber
    ? 'rgba(30,30,40,0.22)'
    : 'rgba(38,34,48,0.16)';

  ctx.fillStyle = shadowColor;
  ctx.beginPath();
  ctx.ellipse(3, 5, isStick ? 13 : 17, isStick ? 13 : 17, 0, 0, Math.PI * 2);
  ctx.fill();

  const kick = o.kick || 0;
  const kickProg = kick > 0 ? 1 - kick / 0.26 : 0;
  const bodyTwist = kick > 0 ? Math.sin(kickProg * Math.PI) * -0.9 : 0;
  const wob = o.stagger && o.stagger > 0 ? Math.sin(gameTime * 50) * 0.15 : 0;
  const hurtLean = o.hurt && o.hurt > 0 ? Math.sin(gameTime * 34) * 0.2 + Math.min(0.25, o.hurt * 0.3) : 0;
  ctx.rotate(angle + bodyTwist + wob + hurtLean);
  if (o.recoil) ctx.translate(-o.recoil * 30, 0);

  const st = Math.sin(phase) * 1.8 * gait;
  const st2 = Math.sin(phase + Math.PI) * 1.8 * gait;

  // =========================================================================
  // SKIN 1: STICKMAN (FIGURE & SHAPES)
  // =========================================================================
  if (isStick) {
    const flash = (o.flash || 0) > 0;
    const stickColor = flash ? '#ffffff' : enemy ? '#e51d2e' : '#14171a';
    const jointColor = flash ? '#ffffff' : enemy ? '#ff858e' : '#495057';
    const headFill = flash ? '#ffffff' : enemy ? '#ff4050' : '#1a1d20';
    const headOutline = flash ? '#ffe0e0' : enemy ? '#9b111e' : '#f8f9fa';

    // Feet: Small round stickman feet
    const drawStickFoot = (sx: number, sy: number) => {
      ctx.fillStyle = stickColor;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    };

    if (kick > 0) {
      drawStickLimb(ctx, -1, -3, -3.5, -3, 3.6, stickColor, jointColor);
      drawStickLimb(ctx, -3.5, -3, -6, -3, 3.2, stickColor);
      drawStickFoot(-6, -3);
      const ext = Math.sin(kickProg * Math.PI) * 26;
      ctx.save();
      ctx.rotate(-bodyTwist * 1.1);
      drawStickLimb(ctx, -1, 3, 1, 2, 4.0, stickColor, jointColor);
      drawStickLimb(ctx, 1, 2, 5 + ext, 1, 3.5, stickColor);
      drawStickFoot(7 + ext, 1);
      ctx.restore();
    } else {
      drawStickLimb(ctx, -1, -2.6, -3.5 + st * 0.35, -3, 3.6, stickColor, jointColor);
      drawStickLimb(ctx, -3.5 + st * 0.35, -3, -6 + st, -3, 3.2, stickColor);
      drawStickLimb(ctx, -1, 2.6, -3.5 + st2 * 0.35, 3, 3.6, stickColor, jointColor);
      drawStickLimb(ctx, -3.5 + st2 * 0.35, 3, -6 + st2, 3, 3.2, stickColor);
      drawStickFoot(-6 + st, -3);
      drawStickFoot(-6 + st2, 3);
    }

    // Arms & Weapon
    if (o.held) {
      drawStickLimb(ctx, 1, -7.6, 2, -12, 4.2, stickColor, jointColor);
      drawStickLimb(ctx, 2, -12, -1, -17, 3.8, stickColor);
      drawStickLimb(ctx, 1, 7.6, 2, 12, 4.2, stickColor, jointColor);
      drawStickLimb(ctx, 2, 12, -1, 17, 3.8, stickColor);
      drawStickHand(ctx, -1, -17, 3.5, stickColor, jointColor);
      drawStickHand(ctx, -1, 17, 3.5, stickColor, jointColor);
    } else if (weapon && !WLEN[weapon]) {
      // Gun weapon
      const kickB = muzzle > 0 ? -4 : 0;
      const recoil = kickB - (o.recoil || 0) * 22;
      drawStickLimb(ctx, -1, 7.5, 4 + recoil * 0.45, 12, 4.4, stickColor, jointColor);
      drawStickLimb(ctx, 4 + recoil * 0.45, 12, 10 + recoil, 4, 3.8, stickColor);
      drawStickLimb(ctx, -2, -7.5, 4 + recoil * 0.3, -12, 4.4, stickColor, jointColor);
      drawStickLimb(ctx, 4 + recoil * 0.3, -12, 13 + recoil, 1, 3.8, stickColor);
      ctx.save();
      ctx.translate(9 + recoil, 3);
      drawWeaponStandard(ctx, weapon);
      ctx.restore();
      drawStickHand(ctx, 10 + recoil, 4, 3.4, stickColor, jointColor);
      drawStickHand(ctx, 13 + recoil, 1, 3.2, stickColor, jointColor);
    } else if (weapon) {
      // Melee weapon
      drawStickLimb(ctx, 0, -7.5, 4, -12, 4.2, stickColor, jointColor);
      drawStickLimb(ctx, 4, -12, 9, -11, 3.8, stickColor);
      drawStickHand(ctx, 9, -11, 3.4, stickColor, jointColor);
      const sw = o.swing;
      let swing: number;
      if (sw) {
        const u = Math.min(1, sw.t / sw.dur);
        const eased = 1 - Math.pow(1 - u, 3);
        const cur = sw.from + (sw.to - sw.from) * eased;
        if (sw.t <= sw.dur) swing = cur;
        else swing = sw.to + angDiff(sw.to, 0.6) * Math.min(1, (sw.t - sw.dur) / 0.18);
      } else {
        const prog = attackAnim > 0 ? 1 - attackAnim / 0.2 : 0;
        swing = -1.1 + prog * 2.4;
        if (windup > 0) swing = -1.6;
        if (!attackAnim && !windup) swing = 0.6;
      }
      ctx.save();
      ctx.translate(0, 8.2);
      ctx.rotate(swing);
      drawStickLimb(ctx, -1, 0, 5, -2, 4.4, stickColor, jointColor);
      drawStickLimb(ctx, 5, -2, 10, 0, 3.8, stickColor);
      ctx.save(); ctx.translate(10, 0); drawWeaponStandard(ctx, weapon); ctx.restore();
      drawStickHand(ctx, 10, 0, 3.5, stickColor, jointColor);
      ctx.restore();
    } else {
      // Fists: Alternating punches
      const dur = o.fistDur || 0.2;
      const pr = attackAnim > 0 ? Math.sin((1 - attackAnim / dur) * Math.PI) : 0;
      const punch = pr * 15;
      const wl = windup > 0 ? -4 : 0;
      const side = o.side || 1;
      const r1 = side > 0 ? punch : 0, r2 = side < 0 ? punch : 0;
      drawStickLimb(ctx, 0, 7.5, 5 + r1 * 0.3, 12, 4.4, stickColor, jointColor);
      drawStickLimb(ctx, 5 + r1 * 0.3, 12, 9 + r1 + wl, 11 - r1 * 0.3, 3.8, stickColor);
      drawStickLimb(ctx, 0, -7.5, 5 + r2 * 0.3, -12, 4.4, stickColor, jointColor);
      drawStickLimb(ctx, 5 + r2 * 0.3, -12, 9 + r2 + wl, -11 + r2 * 0.3, 3.8, stickColor);
      drawStickHand(ctx, 9 + r1 + wl, 11 - r1 * 0.3, 3.6, stickColor, jointColor);
      drawStickHand(ctx, 9 + r2 + wl, -11 + r2 * 0.3, 3.6, stickColor, jointColor);
    }

    // Stickman Spine & Shoulders
    ctx.strokeStyle = stickColor;
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1, -9);
    ctx.lineTo(1, 9);
    ctx.moveTo(-5, 0);
    ctx.lineTo(2, 0);
    ctx.stroke();

    // Center chest circle / core
    ctx.fillStyle = jointColor;
    ctx.beginPath();
    ctx.arc(1, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Head: Perfect Stickman Round Head with Visor Slit
    ctx.fillStyle = headFill;
    ctx.strokeStyle = headOutline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(4, 0, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Directional aim visor/slit on head
    ctx.fillStyle = flash ? '#ffffff' : enemy ? '#ffe6e8' : '#00d2ff';
    ctx.beginPath();
    ctx.arc(8, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  // =========================================================================
  // SKIN 2: NEON SHAPES (GEOMETRIC DELTA & HEXAGONS)
  // =========================================================================
  if (isNeon) {
    const flash = (o.flash || 0) > 0;
    const neonColor = flash ? '#ffffff' : enemy ? '#ff1e3c' : '#00e5ff';
    const coreColor = flash ? '#ffffff' : enemy ? '#ff7085' : '#7df9ff';
    const bodyDark = flash ? '#ffffff' : enemy ? '#1f0d14' : '#0d1a24';

    // Thruster / foot particles
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(-8 + st * 0.5, -4, 2.2, 0, Math.PI * 2);
    ctx.arc(-8 + st2 * 0.5, 4, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    const drawNeonLimb = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.strokeStyle = neonColor;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.fillStyle = coreColor;
      ctx.beginPath(); ctx.arc(x2, y2, 2.4, 0, Math.PI * 2); ctx.fill();
    };

    if (weapon && !WLEN[weapon]) {
      const recoil = (o.recoil || 0) * 22;
      drawNeonLimb(0, 7.5, 8 + recoil, 4);
      drawNeonLimb(0, -7.5, 11 + recoil, 1);
      ctx.save(); ctx.translate(9 + recoil, 3); drawWeaponStandard(ctx, weapon); ctx.restore();
    } else if (weapon) {
      const sw = o.swing;
      let swing = 0.6;
      if (sw) {
        const u = Math.min(1, sw.t / sw.dur);
        swing = sw.from + (sw.to - sw.from) * (1 - Math.pow(1 - u, 3));
      }
      ctx.save(); ctx.translate(0, 8.2); ctx.rotate(swing);
      drawNeonLimb(0, 0, 10, 0);
      ctx.save(); ctx.translate(10, 0); drawWeaponStandard(ctx, weapon); ctx.restore();
      ctx.restore();
    } else {
      const dur = o.fistDur || 0.2;
      const punch = attackAnim > 0 ? Math.sin((1 - attackAnim / dur) * Math.PI) * 15 : 0;
      drawNeonLimb(0, 7.5, 8 + punch, 6);
      drawNeonLimb(0, -7.5, 8, -6);
    }

    // Torso: Geometric Delta (Player) or Diamond/Hexagon (Enemy)
    ctx.fillStyle = bodyDark;
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    if (enemy) {
      // Hexagon Prism
      ctx.moveTo(9, 0);
      ctx.lineTo(4, -8);
      ctx.lineTo(-6, -7);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-6, 7);
      ctx.lineTo(4, 8);
      ctx.closePath();
    } else {
      // Delta Wing Interceptor
      ctx.moveTo(11, 0);
      ctx.lineTo(-8, -10);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 10);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    // Inner glowing core polygon
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    if (enemy) {
      ctx.moveTo(3, 0); ctx.lineTo(0, -3.5); ctx.lineTo(-3, 0); ctx.lineTo(0, 3.5);
    } else {
      ctx.moveTo(4, 0); ctx.lineTo(-2, -3); ctx.lineTo(-1, 0); ctx.lineTo(-2, 3);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    return;
  }

  // =========================================================================
  // SKIN 3: CYBER BOT (MECHA SQUIRCLE)
  // =========================================================================
  if (isCyber) {
    const flash = (o.flash || 0) > 0;
    const plateColor = flash ? '#ffffff' : enemy ? '#7a1c22' : '#2b303a';
    const metalShine = flash ? '#ffffff' : enemy ? '#c9343f' : '#4b5563';
    const visorColor = flash ? '#ffffff' : enemy ? '#ff2b3d' : '#f59e0b';

    // Industrial tread feet
    ctx.fillStyle = metalShine;
    ctx.fillRect(-8 + st * 0.4, -6, 5, 3.5);
    ctx.fillRect(-8 + st2 * 0.4, 2.5, 5, 3.5);

    // Mechanical arms
    const armC = enemy ? '#a82c35' : '#374151';
    const armHi = enemy ? '#e54d58' : '#6b7280';
    if (weapon && !WLEN[weapon]) {
      const kickB = muzzle > 0 ? -4 : 0;
      const recoil = kickB - (o.recoil || 0) * 22;
      drawLimbDefault(ctx, -1, 7.5, 4 + recoil * 0.45, 12, 6.4, armC, armHi);
      drawLimbDefault(ctx, 4 + recoil * 0.45, 12, 10 + recoil, 4, 5.2, armC, armHi);
      drawLimbDefault(ctx, -2, -7.5, 4 + recoil * 0.3, -12, 6.4, armC, armHi);
      drawLimbDefault(ctx, 4 + recoil * 0.3, -12, 13 + recoil, 1, 5.2, armC, armHi);
      ctx.save(); ctx.translate(9 + recoil, 3); drawWeaponStandard(ctx, weapon); ctx.restore();
      drawHandDefault(ctx, 10 + recoil, 4, 3.6, -0.5, armC, armHi, 1);
      drawHandDefault(ctx, 13 + recoil, 1, 3.4, 0.25, armC, armHi, -1);
    } else if (weapon) {
      let swing = 0.6;
      const sw = o.swing;
      if (sw) {
        const u = Math.min(1, sw.t / sw.dur);
        swing = sw.from + (sw.to - sw.from) * (1 - Math.pow(1 - u, 3));
      }
      ctx.save(); ctx.translate(0, 8.2); ctx.rotate(swing);
      drawLimbDefault(ctx, -1, 0, 5, -2, 6.2, armC, armHi);
      drawLimbDefault(ctx, 5, -2, 10, 0, 5.2, armC, armHi);
      ctx.save(); ctx.translate(10, 0); drawWeaponStandard(ctx, weapon); ctx.restore();
      drawHandDefault(ctx, 10, 0, 3.7, 0, armC, armHi, 1, true);
      ctx.restore();
    } else {
      const dur = o.fistDur || 0.2;
      const punch = attackAnim > 0 ? Math.sin((1 - attackAnim / dur) * Math.PI) * 15 : 0;
      drawLimbDefault(ctx, 0, 7.5, 5 + punch * 0.3, 12, 6.4, armC, armHi);
      drawLimbDefault(ctx, 5 + punch * 0.3, 12, 9 + punch, 11, 5.2, armC, armHi);
      drawLimbDefault(ctx, 0, -7.5, 5, -12, 6.4, armC, armHi);
      drawLimbDefault(ctx, 5, -12, 9, -11, 5.2, armC, armHi);
      drawHandDefault(ctx, 9 + punch, 11, 3.8, -0.15, armC, armHi, 1, true);
      drawHandDefault(ctx, 9, -11, 3.8, 0.15, armC, armHi, -1, true);
    }

    // Heavy Squircle Armor Chassis
    ctx.fillStyle = plateColor;
    ctx.strokeStyle = metalShine;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-7, -9, 14, 18, 4);
    ctx.fill();
    ctx.stroke();

    // Hazard cross-hatch detail on back
    ctx.fillStyle = visorColor;
    ctx.fillRect(-6, -2, 2.5, 4);

    // Glowing Optical Scanner / Visor Unit
    ctx.fillStyle = visorColor;
    ctx.beginPath();
    ctx.roundRect(3, -5, 4.5, 10, 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  // =========================================================================
  // SKIN 4 & 5: SUPERHOT (GLASS) & CLASSIC (OPERATOR)
  // =========================================================================
  const isSuper = isSuperhot || (!isClassic && !isStick && !isNeon && !isCyber);
  const footC = enemy ? (isSuper ? '#bd2630' : '#851a24') : (isSuper ? '#8a94a6' : '#24252a');
  const legShine = enemy ? (isSuper ? '#ff8c80' : '#cc4e58') : (isSuper ? '#eef2f7' : '#777980');

  const shoe = (sx: number, sy: number) => {
    const sg = ctx.createLinearGradient(sx - 3, sy - 2, sx + 3, sy + 2);
    sg.addColorStop(0, legShine);
    sg.addColorStop(0.36, footC);
    sg.addColorStop(1, enemy ? '#971c27' : '#111216');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(sx, sy, 3.4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(sx + 0.4, sy - 0.65, 2.3, 0.55, 0, 0, Math.PI * 2); ctx.fill();
  };

  if (kick > 0) {
    drawLimbDefault(ctx, -1, -3.1, -3.5, -3, 4.2, footC, legShine);
    drawLimbDefault(ctx, -3.5, -3, -6, -3, 3.6, footC, legShine);
    shoe(-6, -3);
    const ext = Math.sin(kickProg * Math.PI) * 26;
    ctx.save();
    ctx.rotate(-bodyTwist * 1.1);
    drawLimbDefault(ctx, -1, 3, 1, 2, 4.4, footC, legShine);
    drawLimbDefault(ctx, 1, 2, 5 + ext, 1, 3.8, footC, legShine);
    shoe(7 + ext, 1);
    ctx.restore();
  } else {
    drawLimbDefault(ctx, -1, -2.6, -3.5 + st * 0.35, -3, 4.3, footC, legShine);
    drawLimbDefault(ctx, -3.5 + st * 0.35, -3, -6 + st, -3, 3.6, footC, legShine);
    drawLimbDefault(ctx, -1, 2.6, -3.5 + st2 * 0.35, 3, 4.3, footC, legShine);
    drawLimbDefault(ctx, -3.5 + st2 * 0.35, 3, -6 + st2, 3, 3.6, footC, legShine);
    shoe(-6 + st, -3);
    shoe(-6 + st2, 3);
  }

  const armC = enemy ? (isSuper ? '#e3261d' : '#a31f24') : (isSuper ? '#ced5e0' : '#1c1c1c');
  const armHi = enemy ? (isSuper ? '#ff7165' : '#e0535b') : (isSuper ? '#ffffff' : '#64666c');

  if (o.held) {
    drawLimbDefault(ctx, 1, -7.6, 2, -12, 6.4, armC, armHi);
    drawLimbDefault(ctx, 2, -12, -1, -17, 5, armC, armHi);
    drawLimbDefault(ctx, 1, 7.6, 2, 12, 6.4, armC, armHi);
    drawLimbDefault(ctx, 2, 12, -1, 17, 5, armC, armHi);
    drawHandDefault(ctx, -1, -17, 3.6, -Math.PI / 2, armC, armHi, -1);
    drawHandDefault(ctx, -1, 17, 3.6, Math.PI / 2, armC, armHi, 1);
  } else if (weapon && !WLEN[weapon]) {
    const kickB = muzzle > 0 ? -4 : 0;
    const recoil = kickB - (o.recoil || 0) * 22;
    drawLimbDefault(ctx, -1, 7.5, 4 + recoil * 0.45, 12, 6.4, armC, armHi);
    drawLimbDefault(ctx, 4 + recoil * 0.45, 12, 10 + recoil, 4, 5.2, armC, armHi);
    drawLimbDefault(ctx, -2, -7.5, 4 + recoil * 0.3, -12, 6.4, armC, armHi);
    drawLimbDefault(ctx, 4 + recoil * 0.3, -12, 13 + recoil, 1, 5.2, armC, armHi);
    ctx.save(); ctx.translate(9 + recoil, 3); drawWeaponStandard(ctx, weapon); ctx.restore();
    drawHandDefault(ctx, 10 + recoil, 4, 3.6, -0.5, armC, armHi, 1);
    drawHandDefault(ctx, 13 + recoil, 1, 3.4, 0.25, armC, armHi, -1);
  } else if (weapon) {
    drawLimbDefault(ctx, 0, -7.5, 4, -12, 6.2, armC, armHi);
    drawLimbDefault(ctx, 4, -12, 9, -11, 5.2, armC, armHi);
    drawHandDefault(ctx, 9, -11, 3.6, 0.4, armC, armHi, -1, true);
    const sw = o.swing;
    let swing: number;
    if (sw) {
      const u = Math.min(1, sw.t / sw.dur);
      const eased = 1 - Math.pow(1 - u, 3);
      const cur = sw.from + (sw.to - sw.from) * eased;
      if (sw.t <= sw.dur) swing = cur;
      else swing = sw.to + angDiff(sw.to, 0.6) * Math.min(1, (sw.t - sw.dur) / 0.18);
    } else {
      const prog = attackAnim > 0 ? 1 - attackAnim / 0.2 : 0;
      swing = -1.1 + prog * 2.4;
      if (windup > 0) swing = -1.6;
      if (!attackAnim && !windup) swing = 0.6;
    }
    ctx.save();
    ctx.translate(0, 8.2);
    ctx.rotate(swing);
    drawLimbDefault(ctx, -1, 0, 5, -2, 6.2, armC, armHi);
    drawLimbDefault(ctx, 5, -2, 10, 0, 5.2, armC, armHi);
    ctx.save(); ctx.translate(10, 0); drawWeaponStandard(ctx, weapon); ctx.restore();
    drawHandDefault(ctx, 10, 0, 3.7, 0, armC, armHi, 1, true);
    ctx.restore();
  } else {
    const dur = o.fistDur || 0.2;
    const pr = attackAnim > 0 ? Math.sin((1 - attackAnim / dur) * Math.PI) : 0;
    const punch = pr * 15;
    const wl = windup > 0 ? -4 : 0;
    const side = o.side || 1;
    const r1 = side > 0 ? punch : 0, r2 = side < 0 ? punch : 0;
    drawLimbDefault(ctx, 0, 7.5, 5 + r1 * 0.3, 12, 6.4, armC, armHi);
    drawLimbDefault(ctx, 5 + r1 * 0.3, 12, 9 + r1 + wl, 11 - r1 * 0.3, 5.2, armC, armHi);
    drawLimbDefault(ctx, 0, -7.5, 5 + r2 * 0.3, -12, 6.4, armC, armHi);
    drawLimbDefault(ctx, 5 + r2 * 0.3, -12, 9 + r2 + wl, -11 + r2 * 0.3, 5.2, armC, armHi);
    drawHandDefault(ctx, 9 + r1 + wl, 11 - r1 * 0.3, 3.8, -0.15, armC, armHi, 1, true);
    drawHandDefault(ctx, 9 + r2 + wl, -11 + r2 * 0.3, 3.8, 0.15, armC, armHi, -1, true);
  }

  // Torso
  const pts = humanTorsoPoints(facets);
  const n = pts.length;
  const flash = (o.flash || 0) > 0;
  const g = ctx.createLinearGradient(-8, -13, 8, 13);
  if (flash) {
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ffe3df');
  } else if (enemy) {
    g.addColorStop(0, '#ff998d'); g.addColorStop(0.32, '#f45c5b'); g.addColorStop(0.72, '#dd3945'); g.addColorStop(1, '#ac2939');
  } else if (isSuper) {
    // Superhot Player is crystalline white / ice prism!
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#eef2f7'); g.addColorStop(0.75, '#cbd5e1'); g.addColorStop(1, '#94a3b8');
  } else {
    // Classic Agent
    g.addColorStop(0, '#4a4a4a'); g.addColorStop(0.5, '#1d1d1d'); g.addColorStop(1, '#050505');
  }

  ctx.fillStyle = g;
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fill();

  // Internal faceted triangles
  for (let i = 0; i < n; i += 2) {
    const a = pts[i], b = pts[(i + 1) % n];
    ctx.fillStyle = enemy
      ? 'rgba(126,18,37,0.12)'
      : isSuper
      ? 'rgba(0,180,255,0.07)'
      : 'rgba(255,255,255,0.055)';
    ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill();
  }

  // Superhot moving specular sheen
  if (!flash && (enemy || isSuper)) {
    const sh = ((gameTime * 0.6 + x * 0.01) % 2) - 0.5;
    ctx.save();
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.moveTo(-10 + sh * 18, -14); ctx.lineTo(-5 + sh * 18, -14); ctx.lineTo(3 + sh * 18, 14); ctx.lineTo(-2 + sh * 18, 14); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Head
  ctx.fillStyle = flash
    ? '#ffffff'
    : enemy
    ? '#ff7b71'
    : isSuper
    ? '#f8fafc'
    : '#222327';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const r = 5.8 * (1 + (facets[i] - 1) * 0.4);
    i ? ctx.lineTo(1 + Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(1 + Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();

  // Head reflection
  ctx.fillStyle = enemy
    ? 'rgba(255,238,230,0.62)'
    : isSuper
    ? 'rgba(255,255,255,0.7)'
    : 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(3, -3); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();

  ctx.restore();
}

// -------------------------------------------------------------------------
// Downed Enemy Skin Renderer
// -------------------------------------------------------------------------
export function renderDownedSkin(
  ctx: CanvasRenderingContext2D,
  skinId: SkinId,
  e: { id: number; x: number; y: number; downAngle: number; vx: number; vy: number; launched: boolean; executing: boolean; hitFlash: number },
  gameTime: number
) {
  const isStick = skinId === 'stickman';
  const isNeon = skinId === 'neon_shapes';

  ctx.save();
  ctx.translate(e.x, e.y);
  const speed = Math.hypot(e.vx, e.vy);
  const air = e.launched ? Math.min(15, speed / 45) : 0;
  const shadow = Math.max(0.035, 0.095 - air * 0.0035);

  ctx.fillStyle = `rgba(70,58,69,${shadow})`;
  ctx.beginPath();
  ctx.ellipse(3 + air * 0.6, 5 + air, 22 + air, 12 + air * 0.45, e.downAngle, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -air);
  ctx.rotate(e.downAngle);
  const wig = e.executing ? Math.sin(gameTime * 40) * 2 : Math.sin(gameTime * 13 + e.id) * (e.launched ? 2.4 : 0.8);

  if (isStick) {
    // Sprawled stick figure
    const flash = e.hitFlash > 0;
    const stickCol = flash ? '#fff' : '#e51d2e';
    const jointCol = flash ? '#fff' : '#ff858e';

    // Limbs splayed out
    drawStickLimb(ctx, -4, -2, -12 + wig, -9, 3.8, stickCol, jointCol);
    drawStickLimb(ctx, -12 + wig, -9, -18 + wig * 1.5, -13, 3.2, stickCol);
    drawStickLimb(ctx, -4, 2, -12 - wig, 9, 3.8, stickCol, jointCol);
    drawStickLimb(ctx, -12 - wig, 9, -18 - wig * 1.5, 14, 3.2, stickCol);
    drawStickLimb(ctx, 3, -3, 0 - wig * 0.4, -12, 3.8, stickCol, jointCol);
    drawStickLimb(ctx, 0 - wig * 0.4, -12, -7 - wig, -14, 3.2, stickCol);
    drawStickLimb(ctx, 3, 3, 0 + wig * 0.4, 12, 3.8, stickCol, jointCol);
    drawStickLimb(ctx, 0 + wig * 0.4, 12, -7 + wig, 14, 3.2, stickCol);

    // Spine
    ctx.strokeStyle = stickCol;
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();

    // Knocked-out Head with 'X' indicator
    ctx.fillStyle = flash ? '#fff' : '#ff4050';
    ctx.strokeStyle = flash ? '#ffe0e0' : '#9b111e';
    ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.arc(14, 0, 6.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Knocked-out "X" eye
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(12, -2); ctx.lineTo(16, 2);
    ctx.moveTo(16, -2); ctx.lineTo(12, 2);
    ctx.stroke();

    ctx.restore();
    return;
  }

  if (isNeon) {
    const neonCol = e.hitFlash > 0 ? '#fff' : '#ff1e3c';
    ctx.strokeStyle = neonCol;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-10, -5); ctx.lineTo(-4, -8); ctx.lineTo(6, -7); ctx.lineTo(10, -3); ctx.lineTo(9, 4); ctx.lineTo(3, 8); ctx.lineTo(-7, 7); ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,30,60,0.2)';
    ctx.fill();
    ctx.fillStyle = neonCol;
    ctx.beginPath(); ctx.arc(15, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }

  // Superhot / Classic crystal downed ragdoll
  const dark = e.hitFlash > 0 ? '#fff' : '#d94750', mid = e.hitFlash > 0 ? '#fff' : '#ef5a60', light = e.hitFlash > 0 ? '#fff' : '#ff9b8e';
  drawLimbDefault(ctx, -7, -4, -12 + wig * 0.35, -9, 5.2, dark, light);
  drawLimbDefault(ctx, -12 + wig * 0.35, -9, -18 + wig, -13, 4.4, mid, light);
  drawLimbDefault(ctx, -7, 4, -12 - wig * 0.3, 9, 5.2, dark, light);
  drawLimbDefault(ctx, -12 - wig * 0.3, 9, -18 - wig, 14, 4.4, mid, light);
  drawLimbDefault(ctx, 4, -5, 0 - wig * 0.4, -12, 4.8, dark, light);
  drawLimbDefault(ctx, 0 - wig * 0.4, -12, -6 - wig, -14, 5.2, mid, light);
  drawLimbDefault(ctx, 4, 5, 0 + wig * 0.4, 12, 4.8, dark, light);
  drawLimbDefault(ctx, 0 + wig * 0.4, 12, -6 + wig, 14, 5.2, mid, light);

  const g = ctx.createLinearGradient(-14, -9, 12, 10);
  if (e.hitFlash > 0) { g.addColorStop(0, '#fff'); g.addColorStop(1, '#ffe1dc'); }
  else { g.addColorStop(0, '#ff9488'); g.addColorStop(0.38, '#ef555c'); g.addColorStop(0.76, '#d93746'); g.addColorStop(1, '#ae2b3b'); }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-10, -5); ctx.lineTo(-4, -8); ctx.lineTo(6, -7); ctx.lineTo(10, -3); ctx.lineTo(9, 4); ctx.lineTo(3, 8); ctx.lineTo(-7, 7); ctx.lineTo(-11, 2); ctx.closePath();
  ctx.fill();

  const hg = ctx.createLinearGradient(11, -5, 21, 6);
  hg.addColorStop(0, e.hitFlash > 0 ? '#fff' : '#ffaea0');
  hg.addColorStop(1, e.hitFlash > 0 ? '#df4752' : '#ae2b3b');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(16, -7); ctx.lineTo(21, -2); ctx.lineTo(20, 4); ctx.lineTo(15, 7); ctx.lineTo(10, 3); ctx.closePath();
  ctx.fill();

  ctx.restore();
}
