import { LEVELS } from './levels';
import { sfx, setMusicDuck, initAudio, startMusic, toggleMusic } from './audio';

export const T = 32;
const S = 2; // prerender scale
const EXTR = 10; // wall extrusion

export type WType = 'bat' | 'pipe' | 'knife' | 'katana' | 'pistol' | 'shotgun' | 'uzi' | 'rifle' | 'sniper';

interface WDef {
  name: string;
  melee: boolean;
  cooldown: number;
  range?: number;
  arc?: number;
  blade?: boolean;
  ammo?: number;
  pellets?: number;
  spread?: number;
  auto?: boolean;
  noise?: number;
}

export const WEAPONS: Record<WType, WDef> = {
  bat: { name: 'BASEBALL BAT', melee: true, cooldown: 0.42, range: 44, arc: 1.9 },
  pipe: { name: 'LEAD PIPE', melee: true, cooldown: 0.45, range: 42, arc: 1.9 },
  knife: { name: 'KNIFE', melee: true, cooldown: 0.24, range: 36, arc: 1.5, blade: true },
  katana: { name: 'KATANA', melee: true, cooldown: 0.3, range: 54, arc: 2.3, blade: true },
  pistol: { name: '9MM', melee: false, cooldown: 0.18, ammo: 12, pellets: 1, spread: 0.03, auto: false, noise: 650 },
  shotgun: { name: 'SHOTGUN', melee: false, cooldown: 0.55, ammo: 6, pellets: 8, spread: 0.34, auto: false, noise: 850 },
  uzi: { name: 'UZI', melee: false, cooldown: 0.065, ammo: 30, pellets: 1, spread: 0.14, auto: true, noise: 650 },
  rifle: { name: 'M16', melee: false, cooldown: 0.1, ammo: 24, pellets: 1, spread: 0.05, auto: true, noise: 850 },
  sniper: { name: 'SNIPER', melee: false, cooldown: 0.9, ammo: 6, pellets: 1, spread: 0, auto: false, noise: 1100 },
};
const FISTS = { cooldown: 0.28, range: 32, arc: 1.5 };

type EState = 'idle' | 'patrol' | 'alert' | 'search' | 'down' | 'fetch' | 'hostage';

interface Pickup {
  x: number; y: number; vx: number; vy: number;
  angle: number; spin: number; type: WType; ammo: number;
  thrown: boolean; hit: Set<number>;
}
interface Bullet { x: number; y: number; vx: number; vy: number; sx: number; sy: number; owner: number; life: number; pierce?: boolean; hitIds?: Set<number>; dodged?: boolean; dmg?: number; head?: number; weapon?: WType; }
interface Swing { from: number; to: number; t: number; dur: number; kind: 'blade' | 'blunt'; spin: boolean; }
const WLEN: Partial<Record<WType, number>> = { bat: 28, pipe: 26, knife: 16, katana: 37 };
interface Half { x: number; y: number; vx: number; vy: number; cut: number; body: number; side: number; rot: number; vr: number; facets: number[]; t: number; }
interface Enemy {
  id: number; x: number; y: number; angle: number; r: number;
  weapon: WType | null; state: EState; base: 'idle' | 'patrol';
  downT: number; vx: number; vy: number; downAngle: number;
  react: number; cd: number; windup: number;
  lastX: number; lastY: number; lostT: number;
  path: { x: number; y: number }[]; pathT: number;
  lookT: number; turnT: number; walkT: number; alertFlash: number;
  executing: boolean; facets: number[]; fetch: Pickup | null; attackAnim: number;
  muzzle: number;
  stagger: number; hitFlash: number; launched: boolean; hits: number; spin: number; hp: number; maxHp: number; doomed: boolean;
  batHits: number; launchDistance: number; launchHits: Set<number>;
  boss: boolean; homeX: number; homeY: number; burstShots: number;
  moveVx: number; moveVy: number; moveSpeed: number; strafeDir: number; strafeT: number; dodgeCd: number; dodgeT: number;
}
interface Trail { x1: number; y1: number; x2: number; y2: number; life: number; max: number; enemy: boolean; w: number; }
interface Ghost { x: number; y: number; angle: number; life: number; }
interface Casing { x: number; y: number; z: number; vx: number; vy: number; vz: number; rot: number; vr: number; big: boolean; }
interface Light { x: number; y: number; r: number; life: number; max: number; color: string; }
interface Door { hx: number; hy: number; closed: number; angle: number; av: number; pushT: number; pusher: 'player' | 'enemy'; }
interface Shard { x: number; y: number; z: number; vz: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string; pts: number[]; glint: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; kind: 'spark' | 'flash' | 'ring' | 'star' | 'smoke' | 'cone' | 'slash'; angle?: number; }
interface FText { x: number; y: number; text: string; life: number; color: string; size: number; }

export type GState = 'intro' | 'play' | 'cleared' | 'complete' | 'dead' | 'paused';

export interface GameSnapshot {
  state: GState;
  level: number;
  score: number;
  grade: string;
  focusPercent: number;
  focusActive: boolean;
  canFocus: boolean;
  action: string;
  weaponAction: string;
  showResults: boolean;
  nextReady: boolean;
  kills: number;
  totalEnemies: number;
  timeSeconds: number;
  maxCombo: number;
}

function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const angDiff = (a: number, b: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const rotTo = (a: number, b: number, max: number) => {
  const d = angDiff(a, b);
  return a + Math.max(-max, Math.min(max, d));
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + dx * t, cy = ay + dy * t;
  return { d: Math.hypot(px - cx, py - cy), cx, cy, t };
}

function lineIntersects(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): { x: number; y: number } | null {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-6) return null;
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return { x: x1 + ua * (x2 - x1), y: y1 + ua * (y2 - y1) };
  }
  return null;
}

export interface GameCallbacks {
  onQuit: () => void;
  onLevelComplete: (level: number, score: number) => void;
  onUIChange?: (snapshot: GameSnapshot) => void;
}

// Broad shoulders, a tapered waist and a compact chest, rather than a large oval.
function humanTorsoPoints(facets: number[]): [number, number][] {
  const shape: [number, number][] = [[6.7, -4.8], [3.7, -9.2], [-1, -9.5], [-6.2, -5.9], [-7, -3.3], [-7, 3.3], [-6.2, 5.9], [-1, 9.5], [3.7, 9.2], [6.7, 4.8]];
  return shape.map(([x, y], i) => {
    const variation = 1 + ((facets[i % facets.length] || 1) - 1) * 0.35;
    return [x * variation, y * variation];
  });
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cb: GameCallbacks;
  levelIndex = 0;
  tiles: string[][] = [];
  w = 0; h = 0;
  player = {
    x: 0, y: 0, angle: 0, r: 11, vx: 0, vy: 0, moveSpeed: 0, weapon: null as WType | null, ammo: 0, cd: 0, alive: true, attackAnim: 0, walkT: 0, muzzle: 0,
    exec: null as null | { e: Enemy; t: number; hits: number },
    dashT: 0, dashCd: 0, dashX: 0, dashY: 0, ghostT: 0,
    comboStep: 0, comboWin: 0, punchSide: 1, hitCount: 0, hitCountT: 0,
    kickCd: 0, kickAnim: 0, lungeT: 0, lungeX: 0, lungeY: 0, recoil: 0,
    hp: 3, hpT: 0, hurtT: 0, swing: null as Swing | null, meleeStep: 0, meleeWin: 0,
  };
  trails: Trail[] = [];
  ghosts: Ghost[] = [];
  casings: Casing[] = [];
  lights: Light[] = [];
  kickPressed = false;
  kickBuffer = 0;
  attackBuffer = 0;
  dashBuffer = 0;
  weaponBuffer = 0;
  focusHeld = false;
  focus = 1;
  focusActive = false;
  halves: Half[] = [];
  superTime = false;
  worldScale = 1;
  slowmo = 0;
  noSlowMo = false;
  hostage: Enemy | null = null;
  whiteFlash = 0;
  camKick = { x: 0, y: 0 };
  moveAmt = 0;
  lastMouse = { x: 0, y: 0 };
  zp = 1;
  enemies: Enemy[] = [];
  pickups: Pickup[] = [];
  bullets: Bullet[] = [];
  doors: Door[] = [];
  shards: Shard[] = [];
  particles: Particle[] = [];
  texts: FText[] = [];
  exitX = 0; exitY = 0;
  totalEnemies = 0;
  state: GState = 'intro';
  prevState: GState = 'play';
  stateT = 0;
  time = 0;
  levelTime = 0;
  score = 0; combo = 0; comboT = 0; kills = 0; maxCombo = 0;
  cam = { x: 0, y: 0, zoom: 2, rot: 0 };
  shake = 0;
  hitstop = 0;
  redFlash = 0;
  keys = new Set<string>();
  mouse = { x: 0, y: 0, down: false, pressed: false, right: false };
  spacePressed = false;
  floorC!: HTMLCanvasElement;
  wallC!: HTMLCanvasElement;
  decalC!: HTMLCanvasElement;
  decalX!: CanvasRenderingContext2D;
  raf = 0;
  last = 0;
  nextId = 1;
  cw = 0; ch = 0; dpr = 1;
  hint = '';
  hintT = 0;
  chantIdx = -1;
  destroyed = false;
  suspended = false;
  touch = { enabled: false, moveX: 0, moveY: 0, aimX: 0, aimY: 0, aiming: false, angle: 0, focus: false };
  private aimSource: 'mouse' | 'touch' = 'mouse';
  private lastUIStamp = '';
  private lastUIAt = -1;
  private levelReported = false;

  constructor(canvas: HTMLCanvasElement, level: number, cb: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cb = cb;
    this.resize();
    this.bind();
    initAudio();
    startMusic();
    this.loadLevel(level);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------------- Input ----------------
  private handlers: [EventTarget, string, EventListener][] = [];
  private on(t: EventTarget, ev: string, fn: EventListener) {
    t.addEventListener(ev, fn);
    this.handlers.push([t, ev, fn]);
  }
  bind() {
    this.on(window, 'resize', () => this.resize());
    this.on(window, 'keydown', ((e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button') && (e.code === 'Enter' || e.code === 'Space')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.repeat || this.suspended) return;
      this.keys.add(e.code);
      if (e.code === 'Space') { this.spacePressed = true; this.dashBuffer = 0.18; }
      if (e.code === 'KeyR') this.restart();
      if (e.code === 'KeyM') toggleMusic();
      if (e.code === 'KeyN') {
        this.noSlowMo = !this.noSlowMo;
        this.superTime = false;
        this.focusHeld = false;
        this.focusActive = false;
        this.slowmo = 0;
        this.worldScale = 1;
        setMusicDuck(this.state === 'dead' || this.state === 'complete');
        this.showHint(this.noSlowMo ? 'NO SLOW-MO — BULLET TIME OFF' : 'SLOW-MO ENABLED', 2.5);
      }
      if (e.code === 'KeyF' || e.code === 'KeyE') this.kickBuffer = 0.22;
      if (e.code === 'KeyC') this.focusHeld = true;
      if (e.code === 'KeyT' && !this.noSlowMo) { this.superTime = !this.superTime; this.showHint(this.superTime ? 'SUPERHOT MODE: WAKTU HANYA BERJALAN SAAT KAMU BERGERAK' : 'SUPERHOT MODE: OFF', 2.5); }
      if (e.code === 'Escape') {
        if (this.state === 'dead') this.quit();
        else this.togglePause();
      }
      if (e.code === 'KeyQ' && this.state === 'paused') this.quit();
      if ((e.code === 'Enter' || e.code === 'Space') && this.state === 'complete' && this.stateT > 3.2) this.advance();
    }) as EventListener);
    this.on(window, 'keyup', ((e: KeyboardEvent) => { this.keys.delete(e.code); if (e.code === 'KeyC') this.focusHeld = false; }) as EventListener);
    this.on(this.canvas, 'mousemove', ((e: MouseEvent) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.aimSource = 'mouse';
    }) as EventListener);
    this.on(this.canvas, 'mousedown', ((e: MouseEvent) => {
      if (this.suspended) return;
      initAudio();
      if (e.button === 0) { this.mouse.down = true; this.mouse.pressed = true; this.attackBuffer = 0.18; }
      if (e.button === 2) { this.mouse.right = true; this.weaponBuffer = 0.2; }
      if (e.button === 1) { e.preventDefault(); this.focusHeld = true; }
      if (this.state === 'complete' && this.stateT > 3.2) this.advance();
      if (this.state === 'dead' && this.stateT > 0.6 && e.button === 0) this.restart();
    }) as EventListener);
    this.on(window, 'mouseup', ((e: MouseEvent) => { if (e.button === 0) this.mouse.down = false; if (e.button === 1) this.focusHeld = false; }) as EventListener);
    this.on(window, 'auxclick', ((e: MouseEvent) => { if (e.button === 1) e.preventDefault(); }) as EventListener);
    this.on(window, 'blur', () => this.resetInputs());
    this.on(document, 'visibilitychange', () => { if (document.hidden) { this.resetInputs(); if (this.state !== 'paused') this.togglePause(); } });
    this.on(this.canvas, 'contextmenu', ((e: Event) => e.preventDefault()) as EventListener);
  }

  destroy() {
    this.resetInputs();
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.handlers.forEach(([t, ev, fn]) => t.removeEventListener(ev, fn));
    setMusicDuck(false);
  }

  // Public input API: touch controls feed the same combat/movement systems as PC.
  setTouchControls(enabled: boolean) {
    if (this.touch.enabled === enabled) return;
    this.resetTouchInput();
    this.touch.enabled = enabled;
    this.touch.angle = this.player.angle;
    this.aimSource = enabled ? 'touch' : 'mouse';
    this.emitUI(true);
  }

  setTouchMove(x: number, y: number) {
    if (!this.touch.enabled || this.suspended || this.state === 'paused') return;
    const length = Math.max(1, Math.hypot(x, y));
    this.touch.moveX = x / length;
    this.touch.moveY = y / length;
  }

  setTouchAim(x: number, y: number) {
    if (!this.touch.enabled || this.suspended || this.state === 'paused') return;
    const length = Math.max(1, Math.hypot(x, y));
    this.touch.aimX = x / length;
    this.touch.aimY = y / length;
    this.touch.aiming = Math.hypot(x, y) > 0.1;
    if (this.touch.aiming) {
      this.aimSource = 'touch';
      this.touch.angle = Math.atan2(y, x) - this.cam.rot;
    }
  }

  setTouchFocus(held: boolean) {
    this.touch.focus = held && this.touch.enabled && !this.suspended && this.state !== 'paused';
  }

  pressTouchAction(action: 'kick' | 'action' | 'weapon') {
    if (this.suspended || !this.player.alive || !['intro', 'play', 'cleared'].includes(this.state)) return;
    if (action === 'kick') this.kickBuffer = 0.22;
    if (action === 'action') { this.spacePressed = true; this.dashBuffer = 0.18; }
    if (action === 'weapon') { this.mouse.right = true; this.weaponBuffer = 0.2; }
  }

  resetTouchInput() {
    this.touch.moveX = this.touch.moveY = this.touch.aimX = this.touch.aimY = 0;
    this.touch.aiming = this.touch.focus = false;
  }

  resetInputs() {
    this.keys.clear();
    this.mouse.down = this.mouse.pressed = this.mouse.right = false;
    this.spacePressed = this.kickPressed = this.focusHeld = false;
    this.kickBuffer = 0;
    this.attackBuffer = 0;
    this.dashBuffer = 0;
    this.weaponBuffer = 0;
    this.resetTouchInput();
  }

  setSuspended(suspended: boolean) {
    if (this.suspended === suspended) return;
    this.suspended = suspended;
    this.resetInputs();
  }

  togglePause() {
    if (this.state === 'paused') {
      this.state = this.prevState;
      setMusicDuck(false);
    } else if (this.state === 'play' || this.state === 'cleared' || this.state === 'intro') {
      this.prevState = this.state;
      this.state = 'paused';
      setMusicDuck(true);
    } else return;
    this.resetInputs();
    this.emitUI(true);
  }

  quit() {
    this.resetInputs();
    this.reportCompletion();
    this.cb.onQuit();
  }

  private reportCompletion() {
    if (this.state !== 'complete' || this.levelReported) return;
    this.levelReported = true;
    this.cb.onLevelComplete(this.levelIndex, this.score);
  }

  getSnapshot(): GameSnapshot {
    let action = this.hostage ? 'LEMPAR SANDERA' : this.player.exec ? 'EKSEKUSI' : 'SPRINT';
    if (!this.hostage && !this.player.exec) {
      let distance = Infinity;
      for (const enemy of this.enemies) {
        if (enemy.launched || enemy.state === 'hostage') continue;
        const d = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (d < (enemy.state === 'down' ? 34 : 40) && d < distance) {
          distance = d;
          action = enemy.state === 'down' ? 'EKSEKUSI' : 'SANDERA';
        }
      }
    }
    return {
      state: this.state, level: this.levelIndex, score: this.score, grade: this.grade(),
      focusPercent: Math.round(this.focus * 100), focusActive: this.focusActive,
      canFocus: !this.noSlowMo && this.focus > 0.02,
      action, weaponAction: this.player.weapon ? 'LEMPAR' : 'AMBIL',
      showResults: this.state === 'complete' && this.stateT >= 3,
      nextReady: this.state === 'complete' && this.stateT > 3.2,
      kills: this.kills,
      totalEnemies: this.totalEnemies,
      timeSeconds: Math.floor(this.levelTime),
      maxCombo: this.maxCombo,
    };
  }

  private emitUI(force = false) {
    if (!this.cb.onUIChange || (!force && this.time - this.lastUIAt < 0.1)) return;
    this.lastUIAt = this.time;
    const snapshot = this.getSnapshot();
    const stamp = JSON.stringify(snapshot);
    if (force || stamp !== this.lastUIStamp) {
      this.lastUIStamp = stamp;
      this.cb.onUIChange(snapshot);
    }
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cw = window.innerWidth;
    this.ch = window.innerHeight;
    this.canvas.width = this.cw * this.dpr;
    this.canvas.height = this.ch * this.dpr;
    this.canvas.style.width = this.cw + 'px';
    this.canvas.style.height = this.ch + 'px';
    this.cam.zoom = Math.max(1.3, Math.min(this.ch / (T * 15.5), this.cw / (T * 24)));
  }

  // ---------------- Level ----------------
  loadLevel(i: number) {
    this.levelIndex = i;
    this.levelReported = false;
    const def = LEVELS[i];
    const width = Math.max(...def.map.map((r) => r.length));
    this.h = def.map.length;
    this.w = width;
    this.tiles = def.map.map((r) => r.padEnd(width, '#').split(''));
    this.enemies = []; this.pickups = []; this.bullets = []; this.doors = [];
    this.shards = []; this.particles = []; this.texts = [];
    this.score = 0; this.combo = 0; this.comboT = 0; this.kills = 0; this.maxCombo = 0;
    this.levelTime = 0; this.redFlash = 0; this.shake = 0; this.chantIdx = -1;
    const rng = mulberry(1337 + i * 77);
    const p = this.player;
    this.resetInputs();
    p.weapon = null; p.ammo = 0; p.cd = 0; p.alive = true; p.exec = null; p.attackAnim = 0;
    p.dashT = 0; p.dashCd = 0; p.comboStep = 0; p.comboWin = 0; p.hitCount = 0; p.hitCountT = 0; p.kickCd = 0; p.kickAnim = 0; p.lungeT = 0; p.recoil = 0;
    p.hp = 3; p.hpT = 0; p.hurtT = 0; p.swing = null; p.meleeStep = 0; p.meleeWin = 0;
    this.trails = []; this.ghosts = []; this.casings = []; this.lights = []; this.halves = [];
    this.focus = 1; this.focusActive = false; this.kickBuffer = 0;
    this.hostage = null;
    p.vx = 0; p.vy = 0; p.moveSpeed = 0;
    this.slowmo = 0; this.whiteFlash = 0; this.worldScale = 1;
    const enemyMap: Record<string, WType | null> = { m: 'bat', k: 'knife', p: 'pistol', s: 'shotgun', u: 'uzi', r: 'rifle', f: null };
    const pickMap: Record<string, WType> = { b: 'bat', n: 'knife', K: 'katana', i: 'pipe', '1': 'pistol', '2': 'shotgun', '3': 'uzi', '4': 'rifle', Z: 'sniper' };
    const solidCh = (x: number, y: number) => { const c = this.tiles[y]?.[x]; return c === '#' || c === 'G' || c === undefined; };
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.tiles[y][x];
        const cx = x * T + T / 2, cy = y * T + T / 2;
        if (c === 'P') { p.x = cx; p.y = cy; this.tiles[y][x] = '.'; p.angle = def.entryAngle || 0; this.touch.angle = p.angle; }
        else if (c === 'E') { this.exitX = x; this.exitY = y; }
        else if (c === 'D') {
          this.tiles[y][x] = '.';
          const horiz = solidCh(x - 1, y) && solidCh(x + 1, y);
          if (horiz) this.doors.push({ hx: x * T, hy: cy, closed: 0, angle: 0, av: 0, pushT: 9, pusher: 'enemy' });
          else this.doors.push({ hx: cx, hy: y * T, closed: Math.PI / 2, angle: Math.PI / 2, av: 0, pushT: 9, pusher: 'enemy' });
        } else if (c in enemyMap || c === 'B') {
          this.tiles[y][x] = '.';
          const base = rng() < 0.4 ? 'patrol' : 'idle';
          const ang = [0, Math.PI / 2, Math.PI, -Math.PI / 2][Math.floor(rng() * 4)];
          const enemy = this.makeEnemy(cx, cy, c === 'B' ? Math.PI / 2 : ang, c === 'B' ? 'rifle' : enemyMap[c], c === 'B' ? 'idle' : base);
          if (c === 'B') { enemy.boss = true; enemy.r = 16; enemy.hp = 11; enemy.maxHp = 11; enemy.react = 0.65; }
          this.enemies.push(enemy);
        } else if (c in pickMap) {
          this.tiles[y][x] = '.';
          const t = pickMap[c];
          this.pickups.push({ x: cx, y: cy, vx: 0, vy: 0, angle: rng() * 6.28, spin: 0, type: t, ammo: WEAPONS[t].ammo || 0, thrown: false, hit: new Set() });
        }
      }
    }
    this.totalEnemies = this.enemies.length;
    // The boss room uses only its intentional, risk/reward pickup placements.
    if (def.starterLoadout !== false) {
      const ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
      const spots: [number, number][] = [];
      for (let r = 1; r <= 3 && spots.length < 5; r++)
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || spots.length >= 5) continue;
          const tx = ptx + dx, ty = pty + dy;
          if (this.tile(tx, ty) !== '.' || this.solidMove(tx, ty)) continue;
          if (!this.los(p.x, p.y, tx * T + T / 2, ty * T + T / 2)) continue;
          if (this.pickups.some((q) => Math.floor(q.x / T) === tx && Math.floor(q.y / T) === ty)) continue;
          spots.push([tx, ty]);
        }
      const starter: WType[] = ['sniper', 'rifle', 'katana', 'pistol', 'bat'];
      spots.forEach(([tx, ty], i) => {
        const t = starter[i];
        this.pickups.push({ x: tx * T + T / 2, y: ty * T + T / 2, vx: 0, vy: 0, angle: -0.4 + i * 0.5, spin: 0, type: t, ammo: WEAPONS[t].ammo || 0, thrown: false, hit: new Set() });
      });
    }
    this.cam.x = p.x; this.cam.y = p.y;
    this.bakeStatic();
    this.state = 'intro';
    this.stateT = 0;
    setMusicDuck(false);
    this.showHint(def.introHint || 'SPASI dekat musuh = sandera/perisai; SPACE lagi = lempar • N = no slow-mo • sprint: SPASI', 6);
    this.emitUI(true);
  }

  makeEnemy(x: number, y: number, angle: number, weapon: WType | null, base: 'idle' | 'patrol'): Enemy {
    return {
      id: this.nextId++, x, y, angle, r: 11, weapon, state: base, base,
      downT: 0, vx: 0, vy: 0, downAngle: 0, react: 0, cd: 0, windup: 0,
      lastX: x, lastY: y, lostT: 0, path: [], pathT: 0, lookT: 0, turnT: rand(2, 5),
      walkT: Math.random() * 10, alertFlash: 0, executing: false,
      facets: Array.from({ length: 9 }, () => rand(0.86, 1.12)), fetch: null, attackAnim: 0, muzzle: 0,
      stagger: 0, hitFlash: 0, launched: false, hits: 0, spin: 0, hp: 3, maxHp: 3, doomed: false,
      batHits: 0, launchDistance: 0, launchHits: new Set(), boss: false, homeX: x, homeY: y, burstShots: 0,
      moveVx: 0, moveVy: 0, moveSpeed: 0, strafeDir: Math.random() < 0.5 ? -1 : 1, strafeT: rand(1.5, 3), dodgeCd: 0, dodgeT: 0,
    };
  }

  restart() {
    if (this.state === 'complete' || this.state === 'paused') return;
    this.loadLevel(this.levelIndex);
    this.state = 'play';
    this.stateT = 0;
  }

  advance() {
    if (this.state !== 'complete' || this.stateT <= 3.2) return;
    this.reportCompletion();
    if (this.levelIndex + 1 < LEVELS.length) this.loadLevel(this.levelIndex + 1);
    else this.cb.onQuit();
  }

  showHint(t: string, d = 2) { this.hint = t; this.hintT = d; }

  // ---------------- Static rendering ----------------
  bakeStatic() {
    const W = this.w * T, H = this.h * T;
    const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w * S; c.height = h * S; return c; };
    this.floorC = mk(W, H);
    this.wallC = mk(W, H + EXTR + 2);
    this.decalC = mk(W, H);
    this.decalX = this.decalC.getContext('2d')!;
    this.decalX.scale(S, S);

    const f = this.floorC.getContext('2d')!;
    f.scale(S, S);
    f.fillStyle = '#d3d6dc';
    f.fillRect(0, 0, W, H);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.tiles[y][x] === '#') continue;
      const alt = ((x >> 1) + (y >> 1)) % 2 === 0;
      f.fillStyle = LEVELS[this.levelIndex].environment === 'rooftop' ? (alt ? '#e9edf0' : '#e2e7eb') : (alt ? '#f4f4f5' : '#efeff1');
      f.fillRect(x * T, y * T, T, T);
      f.strokeStyle = 'rgba(0,0,0,0.045)';
      f.lineWidth = 1;
      f.strokeRect(x * T + 0.5, y * T + 0.5, T, T);
    }
    const helipad = LEVELS[this.levelIndex].helipad;
    if (helipad) {
      const hx = (helipad.x + 0.5) * T, hy = (helipad.y + 0.5) * T, radius = helipad.radius * T;
      f.save();
      f.strokeStyle = 'rgba(98,115,127,0.3)'; f.lineWidth = 4;
      f.beginPath(); f.arc(hx, hy, radius, 0, Math.PI * 2); f.stroke();
      f.strokeStyle = 'rgba(255,255,255,0.72)'; f.lineWidth = 2;
      f.beginPath(); f.arc(hx, hy, radius - 10, 0, Math.PI * 2); f.stroke();
      f.strokeStyle = 'rgba(128,144,155,0.4)'; f.lineWidth = 17; f.lineCap = 'square';
      f.beginPath(); f.moveTo(hx - 33, hy - 49); f.lineTo(hx - 33, hy + 49); f.moveTo(hx + 33, hy - 49); f.lineTo(hx + 33, hy + 49); f.moveTo(hx - 33, hy); f.lineTo(hx + 33, hy); f.stroke();
      f.strokeStyle = 'rgba(224,20,30,0.25)'; f.lineWidth = 5;
      for (let i = 0; i < 4; i++) { f.beginPath(); f.arc(hx, hy, radius + 5, i * Math.PI / 2 - 0.12, i * Math.PI / 2 + 0.12); f.stroke(); }
      f.restore();
    }

    // soft wall shadows
    f.fillStyle = 'rgba(40,44,60,0.09)';
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.tiles[y][x] !== '#') continue;
      f.fillRect(x * T + 5, y * T + 7, T, T);
      f.fillRect(x * T + 10, y * T + 13, T, T);
    }
    // furniture
    const isT = (x: number, y: number) => this.tiles[y]?.[x] === 'T';
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!isT(x, y)) continue;
      f.fillStyle = 'rgba(40,44,60,0.10)';
      f.fillRect(x * T + 4, y * T + 5, T, T);
    }
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!isT(x, y)) continue;
      f.fillStyle = '#c3c7cf';
      f.fillRect(x * T, y * T, T, T);
    }
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!isT(x, y)) continue;
      const tx = x * T, ty = y * T - 5;
      f.fillStyle = '#e4e6ea';
      f.fillRect(tx, ty, T, T);
      f.strokeStyle = '#b3b8c2';
      f.lineWidth = 1.2;
      f.beginPath();
      if (!isT(x, y - 1)) { f.moveTo(tx, ty + 0.5); f.lineTo(tx + T, ty + 0.5); }
      if (!isT(x - 1, y)) { f.moveTo(tx + 0.5, ty); f.lineTo(tx + 0.5, ty + T); }
      if (!isT(x + 1, y)) { f.moveTo(tx + T - 0.5, ty); f.lineTo(tx + T - 0.5, ty + T); }
      if (!isT(x, y + 1)) { f.moveTo(tx, ty + T - 0.5); f.lineTo(tx + T, ty + T - 0.5); }
      f.stroke();
    }

    // walls
    const wc = this.wallC.getContext('2d')!;
    wc.scale(S, S);
    wc.translate(0, EXTR + 2);
    const isW = (x: number, y: number) => this.tiles[y]?.[x] === '#';
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!isW(x, y)) continue;
      if (!isW(x, y + 1)) {
        const g = wc.createLinearGradient(0, y * T + T - EXTR, 0, y * T + T);
        g.addColorStop(0, '#d9dce2');
        g.addColorStop(1, '#aeb3bd');
        wc.fillStyle = g;
        wc.fillRect(x * T, y * T + T - EXTR - 1, T, EXTR + 1);
      }
    }
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!isW(x, y)) continue;
      const tx = x * T, ty = y * T - EXTR;
      wc.fillStyle = '#fbfbfc';
      wc.fillRect(tx, ty, T, T);
      wc.strokeStyle = '#c4c8d0';
      wc.lineWidth = 1.2;
      wc.beginPath();
      if (!isW(x, y - 1)) { wc.moveTo(tx, ty + 0.6); wc.lineTo(tx + T, ty + 0.6); }
      if (!isW(x - 1, y)) { wc.moveTo(tx + 0.6, ty); wc.lineTo(tx + 0.6, ty + T); }
      if (!isW(x + 1, y)) { wc.moveTo(tx + T - 0.6, ty); wc.lineTo(tx + T - 0.6, ty + T); }
      if (!isW(x, y + 1)) { wc.moveTo(tx, ty + T - 0.6); wc.lineTo(tx + T, ty + T - 0.6); }
      wc.stroke();
    }
  }

  // ---------------- World queries ----------------
  tile(x: number, y: number) { return this.tiles[y]?.[x] ?? '#'; }
  solidMove(tx: number, ty: number) { const c = this.tile(tx, ty); return c === '#' || c === 'G' || c === 'T'; }
  solidAt(x: number, y: number) { return this.solidMove(Math.floor(x / T), Math.floor(y / T)); }

  los(x1: number, y1: number, x2: number, y2: number) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.ceil(d / 6);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.tile(Math.floor((x1 + (x2 - x1) * t) / T), Math.floor((y1 + (y2 - y1) * t) / T)) === '#') return false;
    }
    for (const dr of this.doors) {
      if (Math.abs(angDiff(dr.closed, dr.angle)) < 0.4) {
        const dx2 = dr.hx + Math.cos(dr.angle) * T, dy2 = dr.hy + Math.sin(dr.angle) * T;
        if (lineIntersects(x1, y1, x2, y2, dr.hx, dr.hy, dx2, dy2)) return false;
      }
    }
    return true;
  }

  collide(e: { x: number; y: number }, r: number) {
    for (let it = 0; it < 2; it++) {
      const minx = Math.floor((e.x - r) / T), maxx = Math.floor((e.x + r) / T);
      const miny = Math.floor((e.y - r) / T), maxy = Math.floor((e.y + r) / T);
      for (let ty = miny; ty <= maxy; ty++) for (let tx = minx; tx <= maxx; tx++) {
        if (!this.solidMove(tx, ty)) continue;
        const cx = Math.max(tx * T, Math.min(e.x, tx * T + T));
        const cy = Math.max(ty * T, Math.min(e.y, ty * T + T));
        const dx = e.x - cx, dy = e.y - cy;
        const d = Math.hypot(dx, dy);
        if (d < r) {
          if (d > 0.0001) { e.x += (dx / d) * (r - d); e.y += (dy / d) * (r - d); }
          else { e.y += r; }
        }
      }
    }
  }

  findPath(sx: number, sy: number, gx: number, gy: number) {
    const W = this.w, H = this.h;
    const s0 = Math.floor(sx / T) + Math.floor(sy / T) * W;
    let gtx = Math.floor(gx / T), gty = Math.floor(gy / T);
    if (this.solidMove(gtx, gty)) {
      let found = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        if (!this.solidMove(gtx + dx, gty + dy)) { gtx += dx; gty += dy; found = true; break; }
      }
      if (!found) return null;
    }
    const g0 = gtx + gty * W;
    const prev = new Int32Array(W * H).fill(-1);
    prev[s0] = s0;
    const q = [s0];
    let head = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    while (head < q.length) {
      const c = q[head++];
      if (c === g0) break;
      const cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (this.solidMove(nx, ny)) continue;
        if (dx && dy && (this.solidMove(cx + dx, cy) || this.solidMove(cx, cy + dy))) continue;
        const ni = nx + ny * W;
        if (prev[ni] !== -1) continue;
        prev[ni] = c;
        q.push(ni);
      }
    }
    if (prev[g0] === -1) return null;
    const path: { x: number; y: number }[] = [];
    let c = g0;
    while (c !== s0) {
      path.push({ x: (c % W) * T + T / 2, y: ((c / W) | 0) * T + T / 2 });
      c = prev[c];
    }
    path.reverse();
    return path;
  }

  mouseWorld() {
    const dx = this.mouse.x - this.cw / 2, dy = this.mouse.y - this.ch / 2;
    const c = Math.cos(-this.cam.rot), s = Math.sin(-this.cam.rot);
    const z = this.cam.zoom * this.zp;
    return { x: this.cam.x + this.camKick.x + (dx * c - dy * s) / z, y: this.cam.y + this.camKick.y + (dx * s + dy * c) / z };
  }

  worldToScreen(x: number, y: number) {
    const z = this.cam.zoom * this.zp;
    const dx = (x - this.cam.x - this.camKick.x) * z, dy = (y - this.cam.y - this.camKick.y) * z;
    const c = Math.cos(this.cam.rot), s = Math.sin(this.cam.rot);
    return { x: this.cw / 2 + dx * c - dy * s, y: this.ch / 2 + dx * s + dy * c };
  }

  headUnderCursor() {
    let best: Enemy | null = null;
    if (this.touch.enabled && this.aimSource === 'touch') {
      let minDiff = 0.11;
      for (const e of this.enemies) {
        if (e.state === 'down') continue;
        const toE = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        const diff = Math.abs(angDiff(this.touch.angle, toE));
        if (diff < minDiff && this.los(this.player.x, this.player.y, e.x, e.y)) {
          minDiff = diff;
          best = e;
        }
      }
      return best;
    }
    const m = this.mouseWorld();
    let bd = 12;
    for (const e of this.enemies) {
      if (e.state === 'down') continue;
      const headR = e.boss ? 15 : 10;
      const d = Math.hypot(e.x + Math.cos(e.angle) * 3 - m.x, e.y + Math.sin(e.angle) * 3 - m.y);
      if (d < headR && d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ---------------- Events ----------------
  noise(x: number, y: number, radius: number) {
    for (const e of this.enemies) {
      if (e === this.hostage || e.state === 'hostage' || e.state === 'down' || e.state === 'alert') continue;
      if (Math.hypot(e.x - x, e.y - y) < radius) {
        e.state = 'search';
        e.lastX = x; e.lastY = y;
        e.path = this.findPath(e.x, e.y, x, y) || [];
        e.pathT = 0.6;
        e.turnT = 0;
        e.alertFlash = 0.6;
      }
    }
  }

  raiseAlarm(source: Enemy) {
    const p = this.player;
    for (const ally of this.enemies) {
      if (ally === source || ally.state === 'down' || ally.state === 'hostage' || ally.state === 'alert') continue;
      if (Math.hypot(ally.x - source.x, ally.y - source.y) > 420) continue;
      ally.state = 'search';
      ally.lastX = p.x;
      ally.lastY = p.y;
      ally.path = this.findPath(ally.x, ally.y, p.x, p.y) || [];
      ally.pathT = 0.5;
      ally.turnT = 0;
      ally.alertFlash = 0.7;
    }
  }

  addKill(pts: number, x: number, y: number, label?: string) {
    this.combo = this.comboT > 0 ? this.combo + 1 : 1;
    this.comboT = 3.6;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const total = pts * this.combo;
    this.score += total;
    this.kills++;
    this.texts.push({ x, y: y - 10, text: `${total}PTS${label ? ' ' + label : ''}`, life: 1.3, color: '#e0141e', size: 12 });
  }

  killEnemy(e: Enemy, dx: number, dy: number, pts: number, label?: string) {
    const i = this.enemies.indexOf(e);
    if (i < 0) return;
    if (this.hostage === e) {
      this.hostage = null;
      this.texts.push({ x: e.x, y: e.y - 30, text: 'SHIELD BROKEN', life: 1, color: '#e0141e', size: 13 });
    }
    this.enemies.splice(i, 1);
    if (e.weapon) this.dropWeapon(e.x, e.y, e.weapon, dx * 80, dy * 80);
    if (e.boss) {
      // Extra dramatic boss explosion
      this.spawnShards(e.x, e.y, dx, dy, true);
      this.spawnShards(e.x, e.y, -dx, -dy, false);
      for (let k = 0; k < 50; k++) {
        const a = rand(0, Math.PI * 2);
        this.particles.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * rand(120, 620), vy: Math.sin(a) * rand(120, 620),
          life: 0.75, max: 0.75,
          color: k % 3 === 0 ? '#ffd700' : k % 2 === 0 ? '#ff2233' : '#ffffff',
          size: rand(4, 9), kind: 'spark'
        });
      }
      for (let k = 0; k < 25; k++) {
        this.makeShard(e.x, e.y, rand(0, Math.PI * 2), rand(180, 650), rand(2, 5), ['#ff2233', '#111', '#fff', '#ffd700'][k % 4], rand(90, 280));
      }
      sfx.boom();
      sfx.shatter();
      this.shake = Math.max(this.shake, 34);
      this.hitstop = 0.25;
      this.slowmo = 2.4; // dramatic longer slow-mo for boss defeat
      this.whiteFlash = 1.0;
      this.redFlash = 0.8;
      this.lights.push({ x: e.x, y: e.y, r: 260, life: 0.9, max: 0.9, color: '255,40,20' });
      this.texts.push({ x: e.x, y: e.y - 34, text: '★ BIG BOSS DESTROYED ★', life: 2.4, color: '#e0141e', size: 16 });
    } else {
      this.spawnShards(e.x, e.y, dx, dy, false);
      sfx.shatter();
      this.shake = Math.max(this.shake, 9);
      this.hitstop = 0.07;
      this.slowmo = 0.32;
      this.whiteFlash = Math.max(this.whiteFlash, 0.5);
      this.lights.push({ x: e.x, y: e.y, r: 90, life: 0.25, max: 0.25, color: '255,60,40' });
    }
    this.addKill(pts, e.x, e.y, label);
    this.focus = Math.min(1, this.focus + 0.12);
    this.checkCleared();
  }

  // KATANA: clean cut — enemy splits into two sliding halves instead of shattering
  sliceEnemy(e: Enemy, angle: number, pts: number, label: string) {
    const i = this.enemies.indexOf(e);
    if (i < 0) return;
    this.enemies.splice(i, 1);
    const dx = Math.cos(angle), dy = Math.sin(angle);
    if (e.weapon) this.dropWeapon(e.x, e.y, e.weapon, dx * 60 + rand(-40, 40), dy * 60 + rand(-40, 40));
    const cut = angle + rand(-0.35, 0.35);
    const body = e.state === 'down' ? e.downAngle : e.angle;
    const px = -Math.sin(cut), py = Math.cos(cut);
    for (const side of [-1, 1]) {
      const sp = rand(70, 120);
      this.halves.push({
        x: e.x, y: e.y,
        vx: dx * rand(60, 140) + px * side * sp, vy: dy * rand(60, 140) + py * side * sp,
        cut, body, side, rot: 0, vr: side * rand(1.5, 4), facets: e.facets, t: 0,
      });
    }
    // slash line + fine sparks, only a few chips (no shatter)
    this.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.28, max: 0.28, color: '#fff', size: 70, kind: 'slash', angle: cut });
    for (let k = 0; k < 10; k++) {
      const a = cut + (k % 2 ? Math.PI / 2 : -Math.PI / 2) + rand(-0.4, 0.4);
      this.particles.push({ x: e.x + dx * rand(-10, 10), y: e.y + dy * rand(-10, 10), vx: Math.cos(a) * rand(80, 260), vy: Math.sin(a) * rand(80, 260), life: 0.25, max: 0.25, color: k % 3 ? '#ff3326' : '#fff', size: 1.4, kind: 'spark' });
    }
    for (let k = 0; k < 6; k++) this.makeShard(e.x, e.y, cut + (k % 2 ? 1.57 : -1.57) + rand(-0.5, 0.5), rand(60, 160), rand(1.2, 2.5), '#ff2a1f', rand(40, 100));
    sfx.slice();
    this.shake = Math.max(this.shake, 6);
    this.hitstop = 0.09;
    this.slowmo = Math.max(this.slowmo, 0.4);
    this.whiteFlash = Math.max(this.whiteFlash, 0.35);
    this.addKill(pts, e.x, e.y, label);
    this.focus = Math.min(1, this.focus + 0.12);
    this.checkCleared();
  }

  drawHalf(ctx: CanvasRenderingContext2D, h: Half, live: boolean) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.cut + h.rot);
    const sepGlow = live ? Math.max(0, 1 - h.t * 1.5) : 0;
    ctx.save();
    ctx.beginPath();
    if (h.side < 0) ctx.rect(-40, -40, 80, 40); else ctx.rect(-40, 0, 80, 40);
    ctx.clip();
    ctx.rotate(h.body - h.cut);
    const pts = humanTorsoPoints(h.facets);
    const g = ctx.createLinearGradient(-8, -13, 8, 13);
    g.addColorStop(0, '#ff8a7e'); g.addColorStop(0.48, '#f0444c'); g.addColorStop(1, '#b92636');
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-2, -8); ctx.lineTo(1, -1); ctx.lineTo(-4, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(144,17,33,0.1)';
    ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(9, -2); ctx.lineTo(9, 4); ctx.lineTo(3, 8); ctx.closePath(); ctx.fill();
    const head = ctx.createLinearGradient(11, -5, 21, 6);
    head.addColorStop(0, '#ff9a8f'); head.addColorStop(1, '#df3542');
    ctx.fillStyle = head;
    ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(16, -7); ctx.lineTo(21, -2); ctx.lineTo(20, 4); ctx.lineTo(15, 7); ctx.lineTo(10, 3); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath(); ctx.moveTo(11, -4); ctx.lineTo(16, -6); ctx.lineTo(14, -1); ctx.closePath(); ctx.fill();
    ctx.restore();
    // polished cut face
    ctx.strokeStyle = 'rgba(255,246,240,0.72)';
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(170,35,48,0.4)';
    ctx.lineWidth = 0.65;
    ctx.beginPath(); ctx.moveTo(-13, h.side * 1.4); ctx.lineTo(13, h.side * 1.4); ctx.stroke();
    if (sepGlow > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${sepGlow})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.stroke();
    }
    ctx.restore();
  }

  headshot(e: Enemy, dx: number, dy: number) {
    const hx = e.x, hy = e.y;
    this.killEnemy(e, dx, dy, 1000, 'HEADSHOT!');
    sfx.headshot();
    this.particles.push({ x: hx, y: hy, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#fff', size: 40, kind: 'star', angle: Math.atan2(dy, dx) });
    this.particles.push({ x: hx, y: hy, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#e0141e', size: 70, kind: 'ring' });
    for (let k = 0; k < 14; k++) this.makeShard(hx, hy, Math.atan2(dy, dx) + rand(-0.5, 0.5), rand(250, 600), rand(1.5, 4), ['#ff2a1f', '#ff7a6b', '#fff'][k % 3], rand(120, 260));
    this.slowmo = Math.max(this.slowmo, 0.5);
    this.hitstop = 0.1;
    this.shake = Math.max(this.shake, 12);
  }

  woundEnemy(e: Enemy, dx: number, dy: number, byPlayer: boolean) {
    e.hitFlash = 0.12;
    e.stagger = Math.max(e.stagger, 0.32);
    e.windup = 0;
    e.vx = dx * 140; e.vy = dy * 140;
    e.cd = Math.max(e.cd, 0.4);
    sfx.hit();
    this.impact(e.x - dx * 6, e.y - dy * 6, Math.atan2(dy, dx), 0.6);
    for (let k = 0; k < 4; k++) this.makeShard(e.x, e.y, Math.atan2(dy, dx) + rand(-0.6, 0.6), rand(105, 230), rand(1.3, 2.6), ['#e87175', '#f2958d', '#d95863'][k % 3], rand(48, 110));
    const pips = Math.max(0, Math.ceil(e.hp));
    this.texts.push({ x: e.x, y: e.y - 20, text: `HIT ${'■'.repeat(pips)}${'□'.repeat(Math.max(0, 3 - pips))}`, life: 0.7, color: '#e0141e', size: 10 });
    if (byPlayer) this.score += 50;
    if (e !== this.hostage && e.state !== 'hostage' && e.state !== 'alert') { e.state = 'alert'; e.react = 0.5; e.lastX = this.player.x; e.lastY = this.player.y; }
    this.shake = Math.max(this.shake, 3);
  }

  hurtPlayer(dx: number, dy: number, dmg: number) {
    const p = this.player;
    p.hp -= dmg;
    p.hpT = 0;
    p.hurtT = 0.4;
    p.x += dx * 6; p.y += dy * 6;
    this.collide(p, p.r);
    this.redFlash = Math.max(this.redFlash, 0.7);
    this.shake = Math.max(this.shake, 10);
    this.hitstop = 0.06;
    this.slowmo = Math.max(this.slowmo, 0.35);
    sfx.hurt();
    for (let k = 0; k < 6; k++) this.makeShard(p.x, p.y, Math.atan2(dy, dx) + rand(-0.7, 0.7), rand(90, 250), rand(1.4, 3), ['#9b9da4', '#c4c6cb', '#e2d4d2'][k % 3], rand(48, 130));
    this.texts.push({ x: p.x, y: p.y - 22, text: `HIT! ${Math.ceil(p.hp)} HP`, life: 0.9, color: '#e0141e', size: 12 });
  }

  checkCleared() {
    if (this.enemies.length === 0 && (this.state === 'play' || this.state === 'intro')) {
      this.state = 'cleared';
      this.stateT = 0;
      sfx.clear();
      this.showHint('AREA BERSIH — PERGI KE EXIT', 4);
    }
  }

  knockdown(e: Enemy, dx: number, dy: number, pts = 0, speed = 240, label = 'DOWN') {
    if (e.state === 'down' && !(speed > 300)) return;
    e.state = 'down';
    e.downT = 3.3;
    e.vx = dx * speed; e.vy = dy * speed;
    e.moveVx = e.moveVy = 0;
    e.launched = speed > 300;
    e.launchDistance = 0;
    e.launchHits.clear();
    e.doomed = false;
    e.spin = speed > 300 ? rand(-14, 14) : 0;
    e.downAngle = Math.atan2(dy, dx);
    e.windup = 0;
    e.stagger = 0;
    e.hits = 0;
    e.hitFlash = 0.12;
    if (e.weapon) {
      this.dropWeapon(e.x, e.y, e.weapon, dx * 160 + rand(-60, 60), dy * 160 + rand(-60, 60));
      e.weapon = null;
    }
    sfx.hit();
    this.shake = Math.max(this.shake, speed > 300 ? 8 : 4);
    if (pts) this.score += pts;
    this.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.22, max: 0.22, color: 'rgba(211,81,89,0.42)', size: speed > 300 ? 25 : 17, kind: 'ring' });
    this.texts.push({ x: e.x, y: e.y - 14, text: label, life: 0.8, color: speed > 300 ? '#dc4e58' : '#8d7377', size: speed > 300 ? 12 : 10 });
  }

  dropWeapon(x: number, y: number, type: WType, vx: number, vy: number, ammo?: number) {
    this.pickups.push({ x, y, vx, vy, angle: Math.random() * 6.28, spin: rand(-12, 12), type, ammo: ammo ?? (WEAPONS[type].ammo ? Math.ceil((WEAPONS[type].ammo as number) * rand(0.4, 1)) : 0), thrown: false, hit: new Set() });
  }

  makeShard(x: number, y: number, a: number, sp: number, size: number, color: string, vz: number) {
    const pts: number[] = [];
    const k = 3 + (Math.random() < 0.35 ? 1 : 0);
    for (let j = 0; j < k; j++) {
      const aa = (j / k) * Math.PI * 2 + rand(-0.4, 0.4);
      pts.push(Math.cos(aa) * size * rand(0.45, 1.25), Math.sin(aa) * size * rand(0.45, 1.25));
    }
    this.shards.push({ x, y, z: rand(4, 14), vz, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rand(0, 6.28), vr: rand(-18, 18), size, color, pts, glint: Math.random() < 0.45 });
  }

  spawnShards(x: number, y: number, dx: number, dy: number, dark: boolean, glass = false) {
    const base = Math.atan2(dy, dx);
    const n = glass ? 18 : 46;
    for (let i = 0; i < n; i++) {
      const cone = i % 4 === 0 ? 3.1 : 0.9;
      const a = base + rand(-cone, cone);
      const sp = rand(50, glass ? 280 : 520) * (i % 4 === 0 ? 0.5 : 1);
      const big = !glass && i < 7;
      const size = big ? rand(7, 12) : rand(1.5, glass ? 6 : 7);
      let color: string;
      if (glass) color = `rgba(${190 + rand(0, 50) | 0},${225 + rand(0, 25) | 0},250,0.8)`;
      else if (dark) color = ['#0d0d0d', '#262626', '#3d3d3d', '#171717', '#050505'][i % 5];
      else color = ['#ff2a1f', '#d80f18', '#ff5747', '#a8000c', '#ff7a6b', '#ff1408'][i % 6];
      this.makeShard(x + rand(-6, 6), y + rand(-6, 6), a, sp, size, color, rand(60, big ? 160 : 260));
    }
    if (!glass) {
      for (let i = 0; i < 16; i++) {
        const a = base + rand(-1.6, 1.6);
        this.particles.push({ x, y, vx: Math.cos(a) * rand(200, 520), vy: Math.sin(a) * rand(200, 520), life: 0.32, max: 0.32, color: dark ? '#000' : '#ff3326', size: 2, kind: 'spark' });
      }
      for (let i = 0; i < 6; i++) {
        const a = base + rand(-0.8, 0.8);
        this.particles.push({ x, y, vx: Math.cos(a) * rand(30, 140), vy: Math.sin(a) * rand(30, 140), life: 0.7, max: 0.7, color: dark ? '20,20,20' : '255,50,40', size: rand(8, 16), kind: 'smoke' });
      }
      this.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, color: dark ? '#000' : '#ff2a1f', size: 44, kind: 'ring' });
      this.particles.push({ x, y, vx: 0, vy: 0, life: 0.18, max: 0.18, color: '#fff', size: 26, kind: 'star', angle: base });
    }
  }

  breakGlass(tx: number, ty: number, dx: number, dy: number) {
    if (this.tile(tx, ty) !== 'G') return;
    this.tiles[ty][tx] = '.';
    this.spawnShards(tx * T + T / 2, ty * T + T / 2, dx, dy, false, true);
    sfx.glass();
    this.noise(tx * T + T / 2, ty * T + T / 2, 260);
  }

  playerDie(dx: number, dy: number) {
    const p = this.player;
    if (!p.alive) return;
    if (this.hostage) {
      this.hostage.state = 'alert';
      this.hostage.lastX = p.x;
      this.hostage.lastY = p.y;
      this.hostage.react = 0;
      this.hostage = null;
    }
    p.alive = false;
    p.exec = null;
    this.spawnShards(p.x, p.y, dx, dy, true);
    if (p.weapon) { this.dropWeapon(p.x, p.y, p.weapon, dx * 90, dy * 90, p.ammo); p.weapon = null; }
    sfx.death();
    this.shake = 16;
    this.redFlash = 1;
    this.slowmo = 1.2;
    this.state = 'dead';
    this.stateT = 0;
    setMusicDuck(true);
  }

  fire(x: number, y: number, angle: number, w: WType, owner: number, spreadMul = 1) {
    const d = WEAPONS[w];
    const pellets = d.pellets || 1;
    const c = Math.cos(angle), s = Math.sin(angle);
    let headId: number | undefined;
    if (w === 'pistol' && owner === 0) { const h = this.headUnderCursor(); if (h) headId = h.id; }
    for (let i = 0; i < pellets; i++) {
      const a = angle + (Math.random() - 0.5) * (d.spread || 0) * 2 * spreadMul;
      const sp = w === 'shotgun' ? rand(1300, 1700) : w === 'sniper' ? 3400 : 1900;
      const mx = x + c * 22, my = y + s * 22;
      this.bullets.push({ x: mx, y: my, sx: mx, sy: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, owner, life: w === 'shotgun' ? 0.26 : 1.2, pierce: w === 'sniper', hitIds: new Set(), dmg: w === 'pistol' ? 1 : undefined, head: headId, weapon: w });
    }
    const fx = x + c * 24, fy = y + s * 24;
    const big = w === 'shotgun' ? 1.8 : w === 'sniper' ? 2 : w === 'rifle' ? 1.2 : 1;
    this.particles.push({ x: fx, y: fy, vx: 0, vy: 0, life: 0.07, max: 0.07, color: '#fff3c4', size: 11 * big, kind: 'flash' });
    this.particles.push({ x: fx, y: fy, vx: 0, vy: 0, life: 0.06, max: 0.06, color: '#ffd76a', size: 26 * big, kind: 'cone', angle });
    this.lights.push({ x: fx, y: fy, r: 110 * big, life: 0.08, max: 0.08, color: '255,210,120' });
    for (let i = 0; i < (w === 'shotgun' ? 6 : 3); i++) {
      const a = angle + rand(-0.5, 0.5);
      this.particles.push({ x: fx, y: fy, vx: Math.cos(a) * rand(40, 120) + rand(-20, 20), vy: Math.sin(a) * rand(40, 120), life: 0.5, max: 0.5, color: '120,120,130', size: rand(5, 9) * big, kind: 'smoke' });
    }
    for (let i = 0; i < 4; i++) {
      const a = angle + rand(-0.35, 0.35);
      this.particles.push({ x: fx, y: fy, vx: Math.cos(a) * rand(300, 700), vy: Math.sin(a) * rand(300, 700), life: 0.09, max: 0.09, color: '#ffe08a', size: 1.6, kind: 'spark' });
    }
    // eject casing to the right
    const ex = -s, ey = c;
    this.casings.push({ x: x + c * 10, y: y + s * 10, z: 10, vx: ex * rand(90, 160) - c * rand(10, 50), vy: ey * rand(90, 160) - s * rand(10, 50), vz: rand(80, 140), rot: rand(0, 6), vr: rand(-30, 30), big: w === 'shotgun' });
    sfx.shot(w);
    this.noise(x, y, d.noise || 600);
    if (owner === 0) {
      const kick = w === 'shotgun' || w === 'sniper' ? 18 : w === 'rifle' ? 6 : w === 'uzi' ? 4 : 8;
      this.camKick.x -= c * kick; this.camKick.y -= s * kick;
      this.player.recoil = w === 'shotgun' || w === 'sniper' ? 0.14 : 0.07;
      this.player.x -= c * (w === 'shotgun' ? 5 : 1.5);
      this.player.y -= s * (w === 'shotgun' ? 5 : 1.5);
      this.hitstop = Math.max(this.hitstop, w === 'shotgun' ? 0.035 : w === 'sniper' ? 0.06 : 0.012);
      if (w === 'sniper') this.shake = Math.max(this.shake, 14);
      this.whiteFlash = Math.max(this.whiteFlash, w === 'shotgun' ? 0.22 : 0.08);
    }
  }

  // ---------------- Update ----------------
  loop = (now: number) => {
    if (this.destroyed) return;
    let dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    if (this.hitstop > 0 && !this.noSlowMo) { this.hitstop -= dt; dt *= 0.05; }
    else if (this.noSlowMo) this.hitstop = 0;
    if (this.state !== 'paused' && !this.suspended) this.update(dt);
    this.render();
    this.emitUI();
    this.mouse.pressed = false;
    this.mouse.right = false;
    this.spacePressed = false;
    this.kickPressed = false;
    this.raf = requestAnimationFrame(this.loop);
  };

  update(rdt: number) {
    const p = this.player;
    this.stateT += rdt;
    if (this.state === 'intro' && this.stateT > 1.6) { this.state = 'play'; }
    if (this.comboT > 0) { this.comboT -= rdt; if (this.comboT <= 0) this.combo = 0; }
    if (this.hintT > 0) this.hintT -= rdt;
    this.redFlash = Math.max(0, this.redFlash - rdt * 1.5);
    this.whiteFlash = Math.max(0, this.whiteFlash - rdt * 4);

    // --- time scale: slowmo on kill + SUPERHOT mode (time moves when you move) ---
    this.slowmo = this.noSlowMo ? 0 : Math.max(0, this.slowmo - rdt);
    const md = Math.hypot(this.mouse.x - this.lastMouse.x, this.mouse.y - this.lastMouse.y);
    this.lastMouse.x = this.mouse.x; this.lastMouse.y = this.mouse.y;
    let target = 1;
    if (!this.noSlowMo && this.superTime && p.alive && this.state !== 'complete') {
      const moving = this.moveAmt > 0 || p.dashT > 0 || p.attackAnim > 0 || p.kickAnim > 0 || p.lungeT > 0 || !!p.exec || p.recoil > 0;
      target = moving ? 1 : Math.min(0.35, 0.05 + md * 0.004);
    }
    if (!this.noSlowMo && this.slowmo > 0) target = Math.min(target, this.state === 'dead' ? 0.25 : 0.35);
    // FOCUS slow-mo: hold mouse wheel (middle button) or C
    const canFocus = p.alive && (this.state === 'play' || this.state === 'cleared');
    if (!this.noSlowMo && (this.focusHeld || this.touch.focus) && canFocus && this.focus > 0.02) {
      if (!this.focusActive) { this.focusActive = true; sfx.slowIn(); }
      this.focus = Math.max(0, this.focus - rdt / 5);
      target = Math.min(target, 0.2);
    } else {
      if (this.focusActive) { this.focusActive = false; sfx.slowOut(); if (this.state === 'dead' || this.state === 'complete') setMusicDuck(true); }
      this.focus = Math.min(1, this.focus + rdt / 9);
    }
    const k = target < this.worldScale ? 10 : 7;
    if (this.noSlowMo) this.worldScale = 1;
    else this.worldScale += (target - this.worldScale) * Math.min(1, rdt * k);
    const dt = rdt * this.worldScale;

    if (this.state === 'play' || this.state === 'cleared' || this.state === 'intro') this.levelTime += dt;

    if (this.state === 'complete') {
      const idx = Math.floor(this.stateT / 0.5);
      if (idx !== this.chantIdx && idx < 6) { this.chantIdx = idx; sfx.voice(idx % 2 === 0 ? 'SUPER' : 'HOT'); }
    }

    // player moves in (mostly) real time — bullet-time feel
    const pdt = this.superTime || this.focusActive ? rdt : Math.max(dt, rdt * 0.6);
    if (p.alive && this.state !== 'complete') this.updatePlayer(pdt);
    this.updateHostage(dt);
    this.updateDoors(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.updateFx(dt, rdt);
    this.updateCamera(rdt);

    if (this.state === 'cleared' && p.alive) {
      const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
      if (tx === this.exitX && ty === this.exitY) {
        this.state = 'complete';
        this.stateT = 0;
        setMusicDuck(true);
      }
    }
  }

  updatePlayer(dt: number) {
    const p = this.player;
    p.cd -= dt;
    p.attackAnim = Math.max(0, p.attackAnim - dt);
    p.muzzle = Math.max(0, p.muzzle - dt);
    p.recoil = Math.max(0, p.recoil - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.hpT += dt;
    if (p.hp < 3 && p.hpT > 3.5) { p.hp = Math.min(3, Math.floor(p.hp) + 1); p.hpT = 2.5; }
    p.meleeWin -= dt;
    if (p.swing) { p.swing.t += dt; if (p.swing.t > p.swing.dur + 0.3) p.swing = null; }
    p.dashCd -= dt;
    p.kickCd -= dt;
    p.kickAnim = Math.max(0, p.kickAnim - dt);
    p.comboWin -= dt;
    if (p.comboWin <= 0) p.comboStep = 0;
    p.hitCountT -= dt;
    if (p.hitCountT <= 0) p.hitCount = 0;
    this.moveAmt = 0;
    if (this.touch.enabled && this.aimSource === 'touch') {
      if (this.touch.aiming) this.touch.angle = Math.atan2(this.touch.aimY, this.touch.aimX) - this.cam.rot;
      const cursor = this.worldToScreen(p.x + Math.cos(this.touch.angle) * 240, p.y + Math.sin(this.touch.angle) * 240);
      this.mouse.x = cursor.x; this.mouse.y = cursor.y;
    }
    const mw = this.mouseWorld();

    if (p.exec) {
      const ex = p.exec;
      if (!this.enemies.includes(ex.e)) { p.exec = null; return; }
      p.x += (ex.e.x - p.x) * Math.min(1, dt * 14);
      p.y += (ex.e.y - p.y) * Math.min(1, dt * 14);
      p.angle = ex.e.downAngle + Math.PI;
      ex.t += dt;
      const w = p.weapon;
      const hitDur = w === null ? 0.2 : WEAPONS[w].melee ? 0.34 : 0.22;
      const need = w === null ? 3 : 1;
      if (ex.t >= hitDur) {
        ex.t = 0;
        ex.hits++;
        p.attackAnim = 0.18;
        p.punchSide *= -1;
        this.shake = Math.max(this.shake, 7);
        this.hitstop = 0.04;
        ex.e.hitFlash = 0.08;
        this.impact(ex.e.x, ex.e.y, p.angle, 0.8);
        if (w && !WEAPONS[w].melee) { sfx.shot(w); this.noise(p.x, p.y, 600); this.particles.push({ x: ex.e.x, y: ex.e.y, vx: 0, vy: 0, life: 0.06, max: 0.06, color: '#fff3c4', size: 14, kind: 'flash' }); }
        else sfx.punch(ex.hits);
        if (ex.hits >= need) {
          const e = ex.e;
          e.executing = false;
          p.exec = null;
          this.killEnemy(e, Math.cos(p.angle), Math.sin(p.angle), 800, 'EXECUTION');
        }
      }
      return;
    }

    // ---------- FAST RUN BURST ----------
    if (p.dashT > 0) {
      p.dashT -= dt;
      const dashProgress = 1 - Math.max(0, p.dashT) / 0.34;
      const sp = 300 + Math.sin(Math.min(1, dashProgress) * Math.PI) * 250;
      p.vx = p.dashX * sp;
      p.vy = p.dashY * sp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.walkT += sp * dt;
      p.moveSpeed = sp;
      this.moveAmt = 1;
      this.collide(p, p.r);
      p.ghostT -= dt;
      if (p.ghostT <= 0) {
        p.ghostT = 0.075;
        const a = Math.atan2(-p.dashY, -p.dashX) + rand(-0.4, 0.4);
        this.particles.push({ x: p.x - p.dashX * 10, y: p.y - p.dashY * 10, vx: Math.cos(a) * rand(15, 55), vy: Math.sin(a) * rand(15, 55), life: 0.22, max: 0.22, color: '110,110,120', size: rand(3, 5), kind: 'smoke' });
      }
      // shoulder charge
      for (const e of this.enemies) {
        if (e.state === 'down' || e.state === 'hostage') continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < p.r + e.r + 2) {
          this.knockdown(e, p.dashX, p.dashY, 150, 460, 'SHOULDER BASH');
          this.impact(e.x, e.y, Math.atan2(p.dashY, p.dashX), 1);
          this.hitstop = 0.05;
          p.dashT = Math.min(p.dashT, 0.02);
        }
      }
    }

    // ---------- LUNGE (sifu style auto-step into target) ----------
    if (p.lungeT > 0) {
      p.lungeT -= dt;
      const k = Math.min(1, dt * 22);
      p.x += (p.lungeX - p.x) * k;
      p.y += (p.lungeY - p.y) * k;
      this.moveAmt = 1;
      this.collide(p, p.r);
    }

    // movement
    let mx = 0, my = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.touch.enabled) {
      const c = Math.cos(-this.cam.rot), s = Math.sin(-this.cam.rot);
      mx += this.touch.moveX * c - this.touch.moveY * s;
      my += this.touch.moveX * s + this.touch.moveY * c;
    }
    const ml = Math.hypot(mx, my);
    const speed = 215 * Math.min(1, ml);
    if (p.dashT <= 0) {
      const tvx = ml ? (mx / ml) * speed : 0;
      const tvy = ml ? (my / ml) * speed : 0;
      const response = 1 - Math.exp(-(ml ? 14 : 10) * dt);
      p.vx += (tvx - p.vx) * response;
      p.vy += (tvy - p.vy) * response;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.moveSpeed = Math.hypot(p.vx, p.vy);
      if (p.moveSpeed > 8) {
        p.walkT += p.moveSpeed * dt;
        this.moveAmt = 1;
      }
    }
    this.collide(p, p.r);
    for (const e of this.enemies) {
      if (e.state === 'down' || e === this.hostage) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
      if (d < p.r + e.r - 2 && d > 0.01) {
        const push = (p.r + e.r - 2 - d) / 2;
        p.x += (dx / d) * push; p.y += (dy / d) * push;
        e.x -= (dx / d) * push; e.y -= (dy / d) * push;
      }
    }
    this.collide(p, p.r);
    if (p.lungeT <= 0) p.angle = this.touch.enabled && this.aimSource === 'touch' ? this.touch.angle : Math.atan2(mw.y - p.y, mw.x - p.x);

    // Decrement all combat action input buffers
    this.dashBuffer = Math.max(0, this.dashBuffer - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    this.weaponBuffer = Math.max(0, this.weaponBuffer - dt);
    this.kickBuffer = Math.max(0, this.kickBuffer - dt);

    // ---------- SPACE / ACTION / SPRINT / HOSTAGE (Buffered) ----------
    const dashWanted = this.spacePressed || this.dashBuffer > 0;
    if (dashWanted) {
      if (this.hostage) {
        this.dashBuffer = 0;
        this.spacePressed = false;
        this.throwHostage();
        return;
      }
      let nearby: Enemy | null = null;
      let nearD = Infinity;
      for (const e of this.enemies) {
        if (e.state === 'hostage' || e.launched) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        const reach = e.state === 'down' ? 34 : 40;
        if (d < reach && d < nearD) { nearD = d; nearby = e; }
      }
      if (nearby?.state === 'down') {
        this.dashBuffer = 0;
        this.spacePressed = false;
        nearby.executing = true;
        nearby.vx = 0; nearby.vy = 0;
        p.exec = { e: nearby, t: 0, hits: 0 };
        p.dashT = 0;
        return;
      } else if (nearby) {
        this.dashBuffer = 0;
        this.spacePressed = false;
        this.grabHostage(nearby);
        return;
      } else if (p.dashCd <= 0) {
        this.dashBuffer = 0;
        this.spacePressed = false;
        let dx = mx, dy = my;
        if (!ml) { dx = Math.cos(p.angle); dy = Math.sin(p.angle); }
        const l = Math.hypot(dx, dy);
        p.dashX = dx / l; p.dashY = dy / l;
        p.dashT = 0.34;
        p.dashCd = 0.50; // snappier dash cooldown
        p.ghostT = 0;
        sfx.dash();
        this.shake = Math.max(this.shake, 2.5);
        for (let i = 0; i < 5; i++) {
          const a = Math.atan2(-p.dashY, -p.dashX) + rand(-0.6, 0.6);
          this.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * rand(20, 85), vy: Math.sin(a) * rand(20, 85), life: 0.24, max: 0.24, color: '145,145,155', size: rand(2, 4), kind: 'smoke' });
        }
      }
    }

    // ---------- KICK (Buffered) ----------
    if (this.kickBuffer > 0 && p.kickCd <= 0 && p.lungeT <= 0) {
      this.kickBuffer = 0;
      this.playerKick(false);
    }

    // ---------- ATTACK (Buffered) ----------
    const w = p.weapon;
    const touchAttack = this.touch.enabled && this.touch.aiming;
    const attackWanted = this.mouse.down || touchAttack || this.attackBuffer > 0;
    if (attackWanted && p.cd <= 0) {
      if (w && !WEAPONS[w].melee) {
        const d = WEAPONS[w];
        if (d.auto || this.mouse.pressed || touchAttack || this.attackBuffer > 0) {
          if (p.ammo > 0) {
            this.fire(p.x, p.y, p.angle, w, 0);
            p.ammo--;
            p.cd = d.cooldown;
            p.muzzle = 0.06;
            this.shake = Math.max(this.shake, w === 'shotgun' ? 14 : w === 'uzi' ? 5 : 7);
            this.attackBuffer = 0;
          } else if (this.mouse.pressed || this.attackBuffer > 0) {
            sfx.empty();
            p.cd = 0.2;
            this.texts.push({ x: p.x, y: p.y - 18, text: 'NO AMMO — LEMPAR!', life: 0.9, color: '#111', size: 10 });
            this.attackBuffer = 0;
          }
        }
      } else if (w && WEAPONS[w].melee) {
        this.attackBuffer = 0;
        this.playerMelee();
      } else if (this.mouse.pressed || touchAttack || this.attackBuffer > 0) {
        this.attackBuffer = 0;
        this.playerFist();
      }
    }

    // ---------- WEAPON SWAP / THROW / PICKUP (Buffered) ----------
    const weaponWanted = this.mouse.right || this.weaponBuffer > 0;
    if (weaponWanted) {
      let near: Pickup | null = null;
      let nd = 36;
      for (const pk of this.pickups) {
        if (pk.thrown) continue;
        const d = Math.hypot(pk.x - p.x, pk.y - p.y);
        if (d < nd) { nd = d; near = pk; }
      }
      if (near && p.weapon) {
        this.weaponBuffer = 0;
        this.mouse.right = false;
        this.dropWeapon(p.x, p.y, p.weapon, Math.cos(p.angle) * 60, Math.sin(p.angle) * 60, p.ammo);
        this.pickUp(near);
      } else if (p.weapon) {
        this.weaponBuffer = 0;
        this.mouse.right = false;
        const c = Math.cos(p.angle), s = Math.sin(p.angle);
        this.pickups.push({ x: p.x + c * 12, y: p.y + s * 12, vx: c * 920, vy: s * 920, angle: p.angle, spin: 28, type: p.weapon, ammo: p.ammo, thrown: true, hit: new Set() });
        p.weapon = null; p.ammo = 0;
        sfx.throwW();
        this.shake = Math.max(this.shake, 4);
      } else if (near) {
        this.weaponBuffer = 0;
        this.mouse.right = false;
        this.pickUp(near);
      }
    }
  }

  grabHostage(e: Enemy) {
    if (e.state === 'down' || !this.enemies.includes(e)) return;
    if (e.weapon) {
      this.dropWeapon(e.x, e.y, e.weapon, rand(-30, 30), rand(-30, 30));
      e.weapon = null;
    }
    e.state = 'hostage';
    e.stagger = 0;
    e.windup = 0;
    e.vx = e.vy = 0;
    e.moveVx = e.moveVy = 0;
    e.downT = 0;
    this.hostage = e;
    this.updateHostage(0.12);
    this.texts.push({ x: e.x, y: e.y - 25, text: 'HOSTAGE', life: 1, color: '#e0141e', size: 13 });
    this.showHint('SANDERA AKTIF — SPACE LEMPAR / LEPAS', 2.4);
    sfx.hostage();
    this.shake = Math.max(this.shake, 2);
  }

  throwHostage() {
    const e = this.hostage;
    if (!e) return;
    this.hostage = null;
    const p = this.player;
    const dx = Math.cos(p.angle), dy = Math.sin(p.angle);
    e.state = 'down';
    e.executing = false;
    e.doomed = false;
    e.downT = 3.3;
    e.launched = true;
    e.launchDistance = 0;
    e.launchHits.clear();
    e.spin = rand(-9, 9);
    e.downAngle = p.angle;
    e.vx = dx * 590;
    e.vy = dy * 590;
    this.texts.push({ x: e.x, y: e.y - 24, text: 'SHIELD THROW', life: 0.85, color: '#e0141e', size: 12 });
    this.impact(e.x, e.y, p.angle, 0.75);
    sfx.throwW();
  }

  updateHostage(dt: number) {
    const e = this.hostage;
    const p = this.player;
    if (!e || !p.alive || !this.enemies.includes(e)) return;
    const distance = 29;
    const tx = p.x + Math.cos(p.angle) * distance;
    const ty = p.y + Math.sin(p.angle) * distance;
    const k = 1 - Math.exp(-Math.max(14, 22 * (dt > 0 ? 1 : 0.7)) * Math.max(dt, 0.008));
    const ox = e.x, oy = e.y;
    e.x += (tx - e.x) * k;
    e.y += (ty - e.y) * k;
    e.moveSpeed = dt > 0 ? Math.hypot(e.x - ox, e.y - oy) / dt : 0;
    e.walkT += Math.hypot(e.x - ox, e.y - oy);
    e.angle = p.angle + Math.PI;
    e.vx = e.vy = 0;
    e.moveVx = e.moveVy = 0;
  }

  // white burst + chips at hit point
  impact(x: number, y: number, angle: number, power: number) {
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.12, max: 0.12, color: '#fff', size: 18 * power, kind: 'star', angle });
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.2, max: 0.2, color: 'rgba(205,81,88,0.48)', size: 20 * power, kind: 'ring' });
    for (let i = 0; i < 6 * power; i++) {
      const a = angle + rand(-0.9, 0.9);
      this.particles.push({ x, y, vx: Math.cos(a) * rand(120, 300), vy: Math.sin(a) * rand(120, 300), life: 0.18, max: 0.18, color: i % 2 ? '#e05b64' : '#fff2ee', size: 1.25, kind: 'spark' });
    }
    for (let i = 0; i < 2 * power; i++) this.makeShard(x, y, angle + rand(-0.8, 0.8), rand(65, 170), rand(1.2, 2.8), ['#f07a79', '#db515d', '#ffb1a3'][i % 3], rand(50, 120));
  }

  // pick the best target for melee magnetism
  meleeTarget(range: number, arc: number, includeDowned = false) {
    const p = this.player;
    let target: Enemy | null = null;
    let score = Infinity;
    for (const e of this.enemies) {
      if ((e.state === 'down' && !includeDowned) || e.executing || e === this.hostage || e.state === 'hostage') continue;
      const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy);
      if (dist > range + e.r) continue;
      const ad = Math.abs(angDiff(p.angle, Math.atan2(dy, dx)));
      if (ad > arc / 2) continue;
      if (!this.los(p.x, p.y, e.x, e.y)) continue;
      const sc = dist + ad * 40;
      if (sc < score) { score = sc; target = e; }
    }
    return target;
  }

  lungeTo(e: Enemy, stop = 22) {
    const p = this.player;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
    p.angle = Math.atan2(dy, dx);
    if (d > stop) {
      p.lungeX = e.x - (dx / d) * stop;
      p.lungeY = e.y - (dy / d) * stop;
      p.lungeT = 0.09;
      this.particles.push({ x: p.x, y: p.y + 5, vx: -dx * 24, vy: -dy * 24, life: 0.15, max: 0.15, color: '110,110,120', size: 3, kind: 'smoke' });
    }
  }

  // SIFU-style combo: jab → cross → hook → spinning kick (launch)
  playerFist() {
    const p = this.player;
    const step = p.comboStep;
    const finisher = step >= 3;
    p.cd = finisher ? 0.3 : 0.13;
    p.comboWin = 0.6;
    p.comboStep = finisher ? 0 : step + 1;
    const target = this.meleeTarget(finisher ? 80 : 74, 2.2);
    if (target) this.lungeTo(target, finisher ? 24 : 21);
    if (finisher) { p.kickAnim = 0.26; } else { p.attackAnim = 0.13; p.punchSide *= -1; }
    sfx.swing();
    if (!target) return;
    const dx = Math.cos(p.angle), dy = Math.sin(p.angle);
    p.hitCount++;
    p.hitCountT = 1.4;
    target.hitFlash = 0.09;
    this.hitstop = finisher ? 0.09 : 0.035;
    this.impact(target.x - dx * 6, target.y - dy * 6, p.angle, finisher ? 1.4 : 0.7);
    if (target.boss) {
      const dmg = finisher ? 1.8 : 1.0;
      target.hp -= dmg;
      target.hits++;
      target.stagger = 0.55;
      target.windup = 0;
      target.cd = Math.max(target.cd, 0.6);
      target.vx = dx * (finisher ? 110 : 65);
      target.vy = dy * (finisher ? 110 : 65);
      this.shake = Math.max(this.shake, finisher ? 14 : 5 + step * 2);
      this.score += 60 * (step + 1);
      sfx.punch(step);
      this.texts.push({ x: target.x + rand(-8, 8), y: target.y - 18, text: finisher ? 'SPIN PUNCH!' : ['JAB', 'CROSS', 'HOOK'][step], life: 0.6, color: '#e0141e', size: 10 + step });
      if (target.hp <= 0.01) {
        this.killEnemy(target, dx, dy, 2000, 'FIST FINISH');
      } else {
        this.woundEnemy(target, dx, dy, true);
        this.texts.push({ x: target.x, y: target.y - 28, text: `-${dmg.toFixed(1)} HP [${Math.ceil(target.hp)}/11]`, life: 0.75, color: '#e0141e', size: 11 });
      }
      return;
    }
    if (finisher) {
      sfx.kick();
      this.knockdown(target, dx, dy, 300, 720, 'SPIN KICK!');
      this.shake = Math.max(this.shake, 12);
      this.slowmo = Math.max(this.slowmo, 0.18);
    } else {
      sfx.punch(step);
      target.hits++;
      target.stagger = 0.55;
      target.windup = 0;
      target.cd = Math.max(target.cd, 0.6);
      target.vx = dx * 90; target.vy = dy * 90;
      target.angle = Math.atan2(-dy, -dx) + rand(-0.4, 0.4);
      this.shake = Math.max(this.shake, 4 + step * 2);
      this.score += 50 * (step + 1);
      this.texts.push({ x: target.x + rand(-8, 8), y: target.y - 16, text: ['JAB', 'CROSS', 'HOOK'][step], life: 0.5, color: '#111', size: 9 + step });
      if (target.state !== 'alert') { target.state = 'alert'; target.react = 0.6; }
      // drop weapon on third hit
      if (step === 2 && target.weapon) {
        this.dropWeapon(target.x, target.y, target.weapon, dx * 140, dy * 140);
        target.weapon = null;
        this.texts.push({ x: target.x, y: target.y - 28, text: 'DISARM', life: 0.8, color: '#e0141e', size: 11 });
      }
    }
  }

  playerKick(fromCombo: boolean) {
    const p = this.player;
    p.kickCd = 0.32;
    p.kickAnim = 0.26;
    sfx.swing();
    const dx = Math.cos(p.angle), dy = Math.sin(p.angle);
    // kick doors hard
    for (const d of this.doors) {
      const ex = d.hx + Math.cos(d.angle) * T * 0.6, ey = d.hy + Math.sin(d.angle) * T * 0.6;
      if (Math.hypot(ex - (p.x + dx * 20), ey - (p.y + dy * 20)) < 24) {
        const perpX = -Math.sin(d.angle), perpY = Math.cos(d.angle);
        const sign = Math.sign(perpX * dx + perpY * dy) || 1;
        d.av = sign * 22; d.pushT = 0; d.pusher = 'player';
        sfx.door();
        this.shake = Math.max(this.shake, 6);
      }
    }
    let target = this.meleeTarget(78, 2.4);
    if (!target) {
      // also kick downed enemies across the room
      let bd = 60;
      for (const e of this.enemies) {
        if (e.state !== 'down' || e.executing) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < bd && Math.abs(angDiff(p.angle, Math.atan2(e.y - p.y, e.x - p.x))) < 1.6) { bd = d; target = e; }
      }
    }
    if (!target) return;
    if (!fromCombo) this.lungeTo(target, 24);
    const ax = Math.cos(p.angle), ay = Math.sin(p.angle);
    target.hitFlash = 0.1;
    sfx.kick();
    this.impact(target.x - ax * 6, target.y - ay * 6, p.angle, 1.3);
    if (target.boss) {
      target.hp -= 1.0;
      target.hitFlash = 0.15;
      target.stagger = 0.5;
      this.hitstop = 0.09;
      this.shake = Math.max(this.shake, 14);
      p.hitCount++;
      p.hitCountT = 1.4;
      if (target.hp <= 0.01) {
        this.killEnemy(target, ax, ay, 2000, 'BIG BOSS KICK FINISH');
      } else {
        this.texts.push({ x: target.x, y: target.y - 24, text: `-1 HP [${Math.ceil(target.hp)}/11]`, life: 0.8, color: '#e0141e', size: 11 });
      }
      return;
    }
    this.knockdown(target, ax, ay, 200, 680, 'KICK!');
    this.hitstop = 0.08;
    this.shake = Math.max(this.shake, 11);
    p.hitCount++;
    p.hitCountT = 1.4;
  }

  pickUp(pk: Pickup) {
    const p = this.player;
    this.pickups.splice(this.pickups.indexOf(pk), 1);
    p.weapon = pk.type;
    p.ammo = pk.ammo;
    sfx.pickup();
    const d = WEAPONS[pk.type];
    this.texts.push({ x: p.x, y: p.y - 18, text: d.melee ? d.name : `${d.name} [${pk.ammo}]`, life: 0.9, color: '#111', size: 10 });
  }

  // MELEE COMBO: 3-hit chain per weapon. Bat/pipe finisher = HOME RUN, Katana finisher = 360° spin slash
  playerMelee() {
    const p = this.player;
    const w = p.weapon!;
    const d = WEAPONS[w];
    const blade = !!d.blade;
    const step = p.meleeWin > 0 ? p.meleeStep : 0;
    const fin = step === 2;
    p.meleeStep = fin ? 0 : step + 1;
    p.meleeWin = 0.6;
    const spin = fin && w === 'katana';
    const heavy = w === 'bat' || w === 'pipe';
    let range = d.range!, arc = d.arc!;
    if (fin) { range += 12; arc = spin ? Math.PI * 2 : arc + 0.7; }
    const dur = w === 'knife' ? 0.11 : fin ? (spin ? 0.34 : 0.28) : heavy ? 0.19 : 0.15;
    p.cd = fin ? d.cooldown * 1.3 : d.cooldown * 0.72;
    let from: number, to: number;
    if (spin) { from = 1.6; to = 1.6 - Math.PI * 2.25; }
    else if (fin) { from = -2.5; to = 2.1; }
    else if (step === 0) { from = -1.8; to = 1.5; }
    else { from = 1.8; to = -1.5; }
    const dir = Math.sign(to - from);
    p.swing = { from, to, t: 0, dur, kind: blade ? 'blade' : 'blunt', spin };
    p.attackAnim = dur;
    sfx.swing(fin);
    const target = this.meleeTarget(range + 22, Math.min(arc, 2.8), w === 'bat');
    if (target) this.lungeTo(target, 24);
    const gx = p.x + Math.cos(p.angle) * 26, gy = p.y + Math.sin(p.angle) * 26;
    if (this.tile(Math.floor(gx / T), Math.floor(gy / T)) === 'G') this.breakGlass(Math.floor(gx / T), Math.floor(gy / T), Math.cos(p.angle), Math.sin(p.angle));
    if (spin) {
      this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.35, max: 0.35, color: 'rgba(198,83,91,0.38)', size: range + 20, kind: 'ring' });
      this.shake = Math.max(this.shake, 6);
    }
    // gather victims
    const victims: Enemy[] = [];
    if (target) victims.push(target);
    if (blade || spin) {
      for (const e of this.enemies) {
        if (e.state === 'down' || victims.includes(e)) continue;
        const ex = e.x - p.x, ey = e.y - p.y;
        if (Math.hypot(ex, ey) > range + e.r + 8) continue;
        if (!spin && Math.abs(angDiff(p.angle, Math.atan2(ey, ex))) > arc / 2) continue;
        if (!this.los(p.x, p.y, e.x, e.y)) continue;
        victims.push(e);
      }
    }
    if (!victims.length) return;
    const dx = Math.cos(p.angle), dy = Math.sin(p.angle);
    sfx.hit();
    victims.forEach((e, i) => {
      const toE = Math.atan2(e.y - p.y, e.x - p.x);
      this.impact(e.x, e.y, toE, fin ? 1.3 : 0.9);
      if (e.boss) {
        const dmg = w === 'katana' ? (fin ? 3.0 : 2.0) : w === 'bat' ? (fin ? 2.5 : 1.8) : 1.5;
        e.hp -= dmg;
        sfx.hit();
        this.shake = Math.max(this.shake, 14);
        this.hitstop = 0.08;
        if (e.hp <= 0.01) {
          if (w === 'katana') this.sliceEnemy(e, toE + (Math.PI / 2) * dir, 2500, 'BOSS SLICED');
          else this.killEnemy(e, Math.cos(toE), Math.sin(toE), 2500, 'BOSS BATTERED');
        } else {
          this.woundEnemy(e, Math.cos(toE), Math.sin(toE), true);
          this.texts.push({ x: e.x, y: e.y - 24, text: `BOSS -${dmg} HP [${Math.ceil(e.hp)}/11]`, life: 0.85, color: '#e0141e', size: 11 });
        }
        return;
      }
      if (w === 'katana') {
        const label = spin ? (victims.length > 1 ? `SPIN SLICE x${victims.length}` : 'SPIN SLICE') : i > 0 ? 'DOUBLE SLICE' : ['SLICED', 'CROSS CUT'][step] || 'SLICED';
        this.sliceEnemy(e, toE + (Math.PI / 2) * dir, 700 + step * 150, label);
      } else if (w === 'bat') {
        e.batHits++;
        if (e.batHits > 1) {
          this.killEnemy(e, Math.cos(toE), Math.sin(toE), 800, 'DOUBLE IMPACT!');
        } else {
          // One bat hit launches a living body. Only the second hit or a solid
          // wall impact shatters it; nearby enemies are hit later by its flight.
          this.knockdown(e, Math.cos(toE), Math.sin(toE), 200, fin ? 900 : 720, 'HOME RUN!');
          this.hitstop = 0.08;
          this.shake = Math.max(this.shake, 11);
        }
      } else if (fin && heavy) {
        this.knockdown(e, Math.cos(toE), Math.sin(toE), 300, 1000, 'HOME RUN!');
        e.doomed = true;
        this.hitstop = 0.12;
        this.slowmo = Math.max(this.slowmo, 0.3);
        this.shake = Math.max(this.shake, 14);
      } else {
        this.killEnemy(e, dx, dy, 600 + step * 100, blade ? 'STAB' : ['SMASH', 'BACKHAND'][step] || 'SMASH');
      }
    });
  }

  updateDoors(dt: number) {
    const p = this.player;
    for (const d of this.doors) {
      d.pushT += dt;
      const ex = () => ({ x: d.hx + Math.cos(d.angle) * T, y: d.hy + Math.sin(d.angle) * T });
      const interact = (ent: { x: number; y: number; r: number }, who: 'player' | 'enemy') => {
        const e2 = ex();
        const sd = segDist(ent.x, ent.y, d.hx, d.hy, e2.x, e2.y);
        if (sd.d >= ent.r + 2.5 || sd.t < 0.05) return false;
        const nx = (ent.x - sd.cx) / (sd.d || 1), ny = (ent.y - sd.cy) / (sd.d || 1);
        const perpX = -Math.sin(d.angle), perpY = Math.cos(d.angle);
        const sign = Math.sign(perpX * -nx + perpY * -ny) || 1;
        const target = who === 'player' ? 11 : 6;
        if (Math.sign(d.av) !== sign || Math.abs(d.av) < target) d.av = sign * target;
        d.pushT = 0;
        d.pusher = who;
        const pen = ent.r + 2.5 - sd.d;
        ent.x += nx * pen * 0.6;
        ent.y += ny * pen * 0.6;
        return true;
      };
      if (p.alive && !p.exec) { interact(p, 'player'); this.collide(p, p.r); }
      for (const e of this.enemies) {
        if (e.state === 'down' || e.state === 'hostage') continue;
        const e2 = ex();
        const sd = segDist(e.x, e.y, d.hx, d.hy, e2.x, e2.y);
        if (sd.d < e.r + 3 && Math.abs(d.av) > 4 && d.pusher === 'player' && d.pushT < 0.5 && sd.t > 0.2) {
          const nx = (e.x - sd.cx) / (sd.d || 1), ny = (e.y - sd.cy) / (sd.d || 1);
          this.knockdown(e, nx, ny, 200);
          sfx.door();
          this.texts.push({ x: e.x, y: e.y - 24, text: 'DOOR SLAM', life: 1, color: '#e0141e', size: 11 });
          continue;
        }
        interact(e, 'enemy');
      }
      d.angle += d.av * dt;
      const lim = 1.75;
      const off = angDiff(d.closed, d.angle);
      if (off > lim) { d.angle = d.closed + lim; d.av = -d.av * 0.25; }
      if (off < -lim) { d.angle = d.closed - lim; d.av = -d.av * 0.25; }
      d.av *= Math.exp(-2.6 * dt);
    }
  }

  canSee(e: Enemy) {
    const p = this.player;
    if (!p.alive) return false;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
    if (d > (e.boss ? 1200 : 600)) return false;
    const aware = e.state === 'alert' || e.state === 'search' || e.state === 'fetch';
    if (!aware && d > 44 && Math.abs(angDiff(e.angle, Math.atan2(dy, dx))) > 1.2) return false;
    return this.los(e.x, e.y, p.x, p.y);
  }

  moveEnemy(e: Enemy, tx: number, ty: number, speed: number, dt: number, face = true) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (dt <= 0) return 0;
    const desiredSpeed = d < 1 ? 0 : Math.min(speed, d * 5);
    const desiredX = d > 0.001 ? dx / d * desiredSpeed : 0;
    const desiredY = d > 0.001 ? dy / d * desiredSpeed : 0;
    const response = 1 - Math.exp(-10 * dt);
    e.moveVx += (desiredX - e.moveVx) * response;
    e.moveVy += (desiredY - e.moveVy) * response;
    const ox = e.x, oy = e.y;
    e.x += e.moveVx * dt;
    e.y += e.moveVy * dt;
    this.collide(e, e.r);
    const moved = Math.hypot(e.x - ox, e.y - oy);
    if (moved < Math.hypot(e.moveVx, e.moveVy) * dt * 0.25) { e.moveVx *= 0.35; e.moveVy *= 0.35; }
    e.moveSpeed = moved / dt;
    if (face && e.moveSpeed > 6) e.angle = rotTo(e.angle, Math.atan2(e.moveVy, e.moveVx), 10 * dt);
    e.walkT += moved;
    return moved;
  }

  followPath(e: Enemy, speed: number, dt: number) {
    if (!e.path.length) return true;
    const n = e.path[0];
    this.moveEnemy(e, n.x, n.y, speed, dt);
    if (Math.hypot(n.x - e.x, n.y - e.y) < 8) e.path.shift();
    return e.path.length === 0;
  }

  findWeaponFor(e: Enemy) {
    let best: Pickup | null = null;
    let bd = 360;
    for (const pk of this.pickups) {
      if (pk.thrown) continue;
      const d = Math.hypot(pk.x - e.x, pk.y - e.y);
      if (d < bd) { bd = d; best = pk; }
    }
    return best;
  }

  updateEnemies(dt: number) {
    const p = this.player;
    for (const e of [...this.enemies]) {
      if (!this.enemies.includes(e)) continue;
      if (e === this.hostage || e.state === 'hostage') continue;
      e.cd -= dt;
      e.dodgeCd = Math.max(0, e.dodgeCd - dt);
      e.dodgeT = Math.max(0, e.dodgeT - dt);
      e.strafeT -= dt;
      e.moveSpeed = 0;
      e.alertFlash = Math.max(0, e.alertFlash - dt);
      e.attackAnim = Math.max(0, e.attackAnim - dt);
      e.muzzle = Math.max(0, e.muzzle - dt);

      e.hitFlash = Math.max(0, e.hitFlash - dt);

      if (e.state === 'down') {
        if (e.launched) {
          if (this.updateLaunched(e, dt)) continue;
        } else {
          e.x += e.vx * dt; e.y += e.vy * dt;
          e.vx *= Math.exp(-7 * dt); e.vy *= Math.exp(-7 * dt);
          this.collide(e, 8);
        }
        if (!e.executing) {
          e.downT -= dt;
          if (e.downT <= 0) {
            e.state = 'search';
            e.lastX = p.x; e.lastY = p.y;
            e.path = []; e.pathT = 0;
            e.angle = e.downAngle + Math.PI;
            e.lostT = 0;
            e.turnT = 0;
          }
        }
        continue;
      }

      // staggered by punches: slide back, can't act
      if (e.stagger > 0) {
        e.stagger -= dt;
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.vx *= Math.exp(-9 * dt); e.vy *= Math.exp(-9 * dt);
        this.collide(e, e.r);
        if (e.stagger <= 0) e.hits = 0;
        continue;
      }

      if (e.boss && e.weapon && !WEAPONS[e.weapon].melee) { this.updateBoss(e, dt); continue; }
      const sees = this.state !== 'intro' && this.canSee(e);
      if (sees) {
        e.lastX = p.x; e.lastY = p.y; e.lostT = 0;
        if (e.state !== 'alert') {
          if (e.state !== 'search' && e.state !== 'fetch') e.alertFlash = 0.7;
          e.state = 'alert';
          e.react = e.weapon && !WEAPONS[e.weapon].melee ? rand(0.28, 0.48) : 0.12;
          this.raiseAlarm(e);
        }
      }

      // unarmed looks for a weapon
      if (!e.weapon && e.state !== 'fetch') {
        const pd = Math.hypot(p.x - e.x, p.y - e.y);
        const pk = this.findWeaponFor(e);
        if (pk && (pd > 110 || !sees) && Math.hypot(pk.x - e.x, pk.y - e.y) < pd) {
          e.state = 'fetch';
          e.fetch = pk;
          e.path = this.findPath(e.x, e.y, pk.x, pk.y) || [];
        }
      }

      switch (e.state) {
        case 'idle': {
          e.turnT -= dt;
          if (e.turnT <= 0) { e.turnT = rand(2.5, 6); e.lookT = e.angle + (Math.random() < 0.5 ? -1 : 1) * Math.PI / 2 * (Math.random() < 0.3 ? 2 : 1); }
          if (e.lookT) e.angle = rotTo(e.angle, e.lookT, 2.5 * dt);
          break;
        }
        case 'patrol': {
          const sp = 58;
          const moved = this.moveEnemy(e, e.x + Math.cos(e.angle) * 20, e.y + Math.sin(e.angle) * 20, sp, dt, false);
          e.turnT -= dt;
          const aheadX = e.x + Math.cos(e.angle) * (T * 0.75), aheadY = e.y + Math.sin(e.angle) * (T * 0.75);
          if (moved < sp * dt * 0.4 || this.solidAt(aheadX, aheadY) || e.turnT <= 0) {
            e.turnT = rand(3, 7);
            const opts = [0, Math.PI / 2, Math.PI, -Math.PI / 2].filter((a) => {
              if (Math.abs(angDiff(a, e.angle)) < 0.1) return false;
              return !this.solidAt(e.x + Math.cos(a) * T, e.y + Math.sin(a) * T);
            });
            const nonBack = opts.filter((a) => Math.abs(angDiff(a, e.angle + Math.PI)) > 0.1);
            const pool = nonBack.length ? nonBack : opts;
            if (pool.length) e.angle = pool[Math.floor(Math.random() * pool.length)];
            // snap to tile center line for neat corridors
            e.x += ((Math.floor(e.x / T) * T + T / 2) - e.x) * 0.5;
            e.y += ((Math.floor(e.y / T) * T + T / 2) - e.y) * 0.5;
          }
          break;
        }
        case 'fetch': {
          const pk = e.fetch;
          if (!pk || !this.pickups.includes(pk) || pk.thrown) { e.fetch = null; e.state = sees ? 'alert' : 'search'; e.path = []; e.turnT = 0; break; }
          e.pathT -= dt;
          if (e.pathT <= 0) { e.path = this.findPath(e.x, e.y, pk.x, pk.y) || []; e.pathT = 0.5; }
          if (this.los(e.x, e.y, pk.x, pk.y) && Math.hypot(pk.x - e.x, pk.y - e.y) < 90) this.moveEnemy(e, pk.x, pk.y, 150, dt);
          else this.followPath(e, 150, dt);
          if (Math.hypot(pk.x - e.x, pk.y - e.y) < 16) {
            this.pickups.splice(this.pickups.indexOf(pk), 1);
            e.weapon = pk.type;
            e.fetch = null;
            e.state = 'search';
            e.react = 0.3;
            e.path = [];
            e.turnT = 0;
          }
          break;
        }
        case 'alert': {
          if (!sees) {
            e.lostT += dt;
            if (e.lostT > 0.35) { e.turnT = 0; e.state = 'search'; e.path = this.findPath(e.x, e.y, e.lastX, e.lastY) || []; e.pathT = 0.5; }
          }
          const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy);
          const toP = Math.atan2(dy, dx);
          const gun = e.weapon && !WEAPONS[e.weapon].melee;
          if (gun) {
            const lead = Math.min(0.24, dist / 1450);
            const aimX = p.x + p.vx * lead;
            const aimY = p.y + p.vy * lead;
            const aimAngle = Math.atan2(aimY - e.y, aimX - e.x);
            e.angle = rotTo(e.angle, aimAngle, 8.5 * dt);
            e.react -= dt;
            if (e.strafeT <= 0) { e.strafeDir *= -1; e.strafeT = rand(1.1, 2.4); }
            const px = -Math.sin(toP), py = Math.cos(toP);
            let tx: number, ty: number;
            if (e.dodgeT > 0) {
              tx = e.x + px * e.strafeDir * 110;
              ty = e.y + py * e.strafeDir * 110;
            } else if (dist > 320) {
              // close distance without walking in a straight firing lane
              tx = p.x - Math.cos(toP) * 230 + px * e.strafeDir * (e.id % 3 === 0 ? 120 : 42);
              ty = p.y - Math.sin(toP) * 230 + py * e.strafeDir * (e.id % 3 === 0 ? 120 : 42);
            } else if (dist < 145) {
              // backpedal while keeping the player in sight
              tx = e.x - Math.cos(toP) * 92 + px * e.strafeDir * 50;
              ty = e.y - Math.sin(toP) * 92 + py * e.strafeDir * 50;
            } else {
              // hold an angle and strafe rather than stacking on teammates
              tx = e.x + px * e.strafeDir * (e.id % 3 === 0 ? 105 : 68);
              ty = e.y + py * e.strafeDir * (e.id % 3 === 0 ? 105 : 68);
            }
            if (this.clearPath(e.x, e.y, tx, ty)) {
              e.path = [];
              this.moveEnemy(e, tx, ty, e.dodgeT > 0 ? 205 : 104, dt, false);
            } else {
              e.pathT -= dt;
              if (e.pathT <= 0 || !e.path.length) { e.path = this.findPath(e.x, e.y, tx, ty) || []; e.pathT = 0.45; }
              this.followPath(e, 115, dt);
            }
            if (sees && e.react <= 0 && e.cd <= 0 && Math.abs(angDiff(e.angle, aimAngle)) < 0.22 && p.alive) {
              this.fire(e.x, e.y, e.angle, e.weapon!, e.id, 1.4);
              e.muzzle = 0.06;
              const d = WEAPONS[e.weapon!];
              e.cd = d.auto ? (Math.random() < 0.15 ? 0.6 : d.cooldown * 1.8) : d.cooldown * 2.8 + rand(0, 0.25);
            }
          } else {
            const w = e.weapon;
            const range = w ? WEAPONS[w].range! : FISTS.range;
            if (e.windup > 0) {
              e.windup -= dt;
              e.angle = rotTo(e.angle, toP, 5 * dt);
              if (e.windup <= 0) {
                e.attackAnim = 0.2;
                e.cd = 0.7;
                sfx.swing();
                if (p.alive && dist < range + p.r + 2 && Math.abs(angDiff(e.angle, toP)) < 1.1 && this.los(e.x, e.y, p.x, p.y)) {
                  sfx.hit();
                  this.playerDie(Math.cos(e.angle), Math.sin(e.angle));
                }
              }
            } else {
              if (sees && dist < 90) this.moveEnemy(e, p.x, p.y, 165, dt);
              else {
                e.pathT -= dt;
                if (e.pathT <= 0 || !e.path.length) { e.path = this.findPath(e.x, e.y, p.x, p.y) || []; e.pathT = 0.3; }
                if (sees && this.clearPath(e.x, e.y, p.x, p.y)) this.moveEnemy(e, p.x, p.y, 165, dt);
                else this.followPath(e, 165, dt);
              }
              if (dist < range + p.r - 4 && e.cd <= 0 && p.alive) e.windup = w === 'knife' ? 0.14 : 0.2;
            }
          }
          break;
        }
        case 'search': {
          e.pathT -= dt;
          if (e.path.length) {
            this.followPath(e, 130, dt);
            e.turnT = 0;
          } else if (e.pathT <= 0 && e.turnT > -0.05 && Math.hypot(e.lastX - e.x, e.lastY - e.y) > 20) {
            e.path = this.findPath(e.x, e.y, e.lastX, e.lastY) || [];
            e.pathT = 0.8;
            if (!e.path.length) e.turnT = -0.1;
          } else {
            // look around then give up
            e.turnT -= dt;
            e.angle += dt * 2.2;
            if (e.turnT < -2.8) { e.state = e.base; e.turnT = rand(2, 5); e.lookT = 0; }
          }
          break;
        }
      }
    }
    // separation
    for (let i = 0; i < this.enemies.length; i++) for (let j = i + 1; j < this.enemies.length; j++) {
      const a = this.enemies[i], b = this.enemies[j];
      if (a.state === 'down' || b.state === 'down' || a.state === 'hostage' || b.state === 'hostage') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < 22 && d > 0.01) {
        const push = (22 - d) / 2;
        a.x -= (dx / d) * push; a.y -= (dy / d) * push;
        b.x += (dx / d) * push; b.y += (dy / d) * push;
      }
    }
  }

  updateBoss(e: Enemy, dt: number) {
    const p = this.player;
    if (!p.alive || this.state === 'intro') return;
    const sees = this.canSee(e);
    if (!e.weapon) {
      // A disarmed boss remains a normal, dangerous melee opponent.
      e.state = 'alert';
      e.react = 0.25;
      return;
    }
    const dx = p.x - e.x, dy = p.y - e.y;
    const distance = Math.hypot(dx, dy);
    const lead = Math.min(0.22, distance / 1900);
    const aim = Math.atan2(p.y + p.vy * lead - e.y, p.x + p.vx * lead - e.x);
    if (sees) {
      if (e.state !== 'alert') { e.state = 'alert'; e.react = 0.55; e.alertFlash = 0.7; }
      e.lastX = p.x; e.lastY = p.y;
      e.angle = rotTo(e.angle, aim, 10 * dt);
      e.react -= dt;
    } else {
      e.state = 'search';
      e.react = Math.max(e.react, 0.3);
      e.burstShots = 0;
      e.angle = rotTo(e.angle, Math.atan2(e.lastY - e.y, e.lastX - e.x), 4 * dt);
    }
    if (e.strafeT <= 0) { e.strafeDir *= -1; e.strafeT = rand(1.2, 2); }
    const tx = Math.max(e.homeX - 135, Math.min(e.homeX + 135, e.x + e.strafeDir * 60));
    const ty = e.homeY + (distance < 170 ? -20 : 0);
    if (this.clearPath(e.x, e.y, tx, ty)) this.moveEnemy(e, tx, ty, 65, dt, false);
    else { e.strafeDir *= -1; e.strafeT = 0.4; }
    if (sees && e.react <= 0 && e.cd <= 0 && Math.abs(angDiff(e.angle, aim)) < 0.12) {
      this.fire(e.x, e.y, e.angle, 'rifle', e.id, 0.35);
      e.muzzle = 0.06;
      e.burstShots++;
      e.cd = e.burstShots >= 6 ? 0.72 : WEAPONS.rifle.cooldown;
      if (e.burstShots >= 6) e.burstShots = 0;
    }
  }

  // Flying bodies collide only while travelling, never as an AoE melee hit.
  updateLaunched(e: Enemy, dt: number) {
    const sp = Math.hypot(e.vx, e.vy);
    e.downAngle += e.spin * dt * Math.min(1, sp / 400);
    if (sp > 120) {
      e.walkT += dt;
      if (Math.random() < dt * 40) this.ghosts.push({ x: e.x, y: e.y, angle: -999 - e.downAngle, life: 0.18 });
    }
    const steps = Math.max(1, Math.ceil((sp * dt) / 4));
    const r = 9;
    for (let s = 0; s < steps; s++) {
      const nx = e.x + (e.vx * dt) / steps, ny = e.y + (e.vy * dt) / steps;
      const cur = Math.hypot(e.vx, e.vy);
      const dirx = e.vx / (cur || 1), diry = e.vy / (cur || 1);
      // glass: smash through
      const gtx = Math.floor((nx + dirx * r) / T), gty = Math.floor((ny + diry * r) / T);
      if (this.tile(gtx, gty) === 'G') { this.breakGlass(gtx, gty, dirx, diry); e.vx *= 0.75; e.vy *= 0.75; this.texts.push({ x: e.x, y: e.y - 20, text: 'THROUGH GLASS', life: 0.9, color: '#e0141e', size: 10 }); }
      const tileX = this.tile(Math.floor((nx + Math.sign(e.vx) * r) / T), Math.floor(e.y / T));
      const tileY = this.tile(Math.floor(e.x / T), Math.floor((ny + Math.sign(e.vy) * r) / T));
      const hitX = this.solidAt(nx + Math.sign(e.vx) * r, e.y);
      const hitY = this.solidAt(e.x, ny + Math.sign(e.vy) * r);
      if (hitX || hitY) {
        if ((cur > 300 || e.batHits > 0) && (tileX === '#' || tileY === '#')) {
          // WALL SPLAT — shatter against the wall
          this.killEnemy(e, -dirx * 0.3 + (hitY ? dirx : 0), -diry * 0.3 + (hitX ? diry : 0), 900, 'WALL SPLAT');
          this.shake = Math.max(this.shake, 14);
          return true;
        }
        if (hitX) e.vx *= -0.35;
        if (hitY) e.vy *= -0.35;
        sfx.door();
        break;
      }
      const previousX = e.x, previousY = e.y;
      e.launchDistance += Math.hypot(nx - e.x, ny - e.y);
      e.x = nx; e.y = ny;
      // An actual advancing body must reach the other enemy first.
      if (cur > 200 && e.launchDistance > 4) {
        for (const o of this.enemies) {
          if (o === e || o.state === 'down' || o.state === 'hostage' || e.launchHits.has(o.id)) continue;
          const approaching = (o.x - previousX) * dirx + (o.y - previousY) * diry > 0;
          if (approaching && Math.hypot(o.x - e.x, o.y - e.y) < r + o.r) {
            e.launchHits.add(o.id);
            this.knockdown(o, dirx, diry, 250, cur * 0.75, 'BODY COLLISION!');
            this.impact(o.x, o.y, Math.atan2(diry, dirx), 1);
            e.vx *= 0.55; e.vy *= 0.55;
            this.hitstop = 0.05;
          }
        }
      }
    }
    const fr = sp > 250 ? 2.2 : 7;
    e.vx *= Math.exp(-fr * dt); e.vy *= Math.exp(-fr * dt);
    this.collide(e, 8);
    if (Math.hypot(e.vx, e.vy) < 40) {
      if (e.doomed) { this.killEnemy(e, Math.cos(e.downAngle), Math.sin(e.downAngle), 600, 'HOME RUN'); return true; }
      e.launched = false; e.spin = 0;
    }
    return false;
  }

  clearPath(x1: number, y1: number, x2: number, y2: number) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.ceil(d / 8);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      if (this.solidAt(x + 8, y) || this.solidAt(x - 8, y) || this.solidAt(x, y + 8) || this.solidAt(x, y - 8)) return false;
    }
    return true;
  }

  updateBullets(dt: number) {
    const p = this.player;
    const endTrail = (b: Bullet) => {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const length = b.pierce ? 86 : 56;
      this.trails.push({ x1: b.x - b.vx / sp * length, y1: b.y - b.vy / sp * length, x2: b.x, y2: b.y, life: b.pierce ? 1.1 : 0.68, max: b.pierce ? 1.1 : 0.68, enemy: b.owner !== 0, w: b.pierce ? 1.35 : 1 });
    };
    outer: for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      if (b.life <= 0) { endTrail(b); this.bullets.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vy);
      const steps = Math.max(1, Math.ceil((sp * dt) / 6));
      const sx = (b.vx * dt) / steps, sy = (b.vy * dt) / steps;
      const dx = b.vx / sp, dy = b.vy / sp;
        if (b.owner === 0) {
          const fx = b.x + dx * 34, fy = b.y + dy * 34;
          for (const e of this.enemies) {
            if (e.state === 'down' || e.state === 'hostage' || e.dodgeCd > 0) continue;
            const near = segDist(e.x, e.y, b.x, b.y, fx, fy);
            if (near.d < 22 && Math.hypot(e.x - this.player.x, e.y - this.player.y) > 42) {
              const side = (e.x - b.x) * -dy + (e.y - b.y) * dx;
              e.strafeDir = side < 0 ? -1 : 1;
              e.dodgeT = 0.26;
              e.dodgeCd = 0.85;
              break;
            }
          }
        }
      for (let s = 0; s < steps; s++) {
        b.x += sx; b.y += sy;
        const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T);
        const c = this.tile(tx, ty);
        if (c === '#') {
          const hx = b.x - sx, hy = b.y - sy;
          for (let k = 0; k < 8; k++) {
            const a = Math.atan2(-dy, -dx) + rand(-1.1, 1.1);
            this.particles.push({ x: hx, y: hy, vx: Math.cos(a) * rand(120, 380), vy: Math.sin(a) * rand(120, 380), life: 0.22, max: 0.22, color: k % 3 === 0 ? '#ffd76a' : '#222', size: 1.5, kind: 'spark' });
          }
          this.particles.push({ x: hx, y: hy, vx: -dx * 30, vy: -dy * 30, life: 0.6, max: 0.6, color: '200,200,205', size: 8, kind: 'smoke' });
          this.particles.push({ x: hx, y: hy, vx: 0, vy: 0, life: 0.08, max: 0.08, color: '#fff', size: 8, kind: 'star', angle: Math.atan2(-dy, -dx) });
          // bullet hole decal on floor edge
          const g = this.decalX;
          g.fillStyle = 'rgba(20,20,20,0.55)';
          g.beginPath(); g.arc(hx, hy, 1.6, 0, Math.PI * 2); g.fill();
          b.x = hx; b.y = hy;
          endTrail(b);
          this.bullets.splice(i, 1);
          continue outer;
        }
        if (c === 'G') this.breakGlass(tx, ty, dx, dy);

        // Bullets must NEVER penetrate doors!
        for (const d of this.doors) {
          const dx2 = d.hx + Math.cos(d.angle) * T, dy2 = d.hy + Math.sin(d.angle) * T;
          const hit = lineIntersects(b.x - sx, b.y - sy, b.x, b.y, d.hx, d.hy, dx2, dy2);
          const sd = segDist(b.x, b.y, d.hx, d.hy, dx2, dy2);
          if (hit || (sd.d < 6 && sd.t >= 0 && sd.t <= 1)) {
            const hx = hit ? hit.x : sd.cx, hy = hit ? hit.y : sd.cy;
            for (let k = 0; k < 6; k++) {
              const a = Math.atan2(-dy, -dx) + rand(-1.0, 1.0);
              this.particles.push({
                x: hx, y: hy,
                vx: Math.cos(a) * rand(80, 260), vy: Math.sin(a) * rand(80, 260),
                life: 0.22, max: 0.22,
                color: k % 2 === 0 ? '#b8860b' : '#3d2817',
                size: rand(1.5, 3.5), kind: 'spark'
              });
            }
            this.particles.push({ x: hx, y: hy, vx: -dx * 20, vy: -dy * 20, life: 0.4, max: 0.4, color: '180,180,185', size: 6, kind: 'smoke' });
            sfx.door();
            d.av += Math.sign(dx * -Math.sin(d.angle) + dy * Math.cos(d.angle) || 1) * 3;
            b.x = hx; b.y = hy;
            endTrail(b);
            this.bullets.splice(i, 1);
            continue outer;
          }
        }

        for (const e of [...this.enemies]) {
          if (e.id === b.owner || b.hitIds?.has(e.id)) continue;
          if (b.owner === 0 && e === this.hostage) continue;
          const r = e.state === 'down' ? 12 : e.r;
          if (Math.hypot(e.x - b.x, e.y - b.y) < r) {
            if (e.boss) {
              // 2 INSTANT KILL REWARDS FOR HIGH SKILL:
              // 1) 1 sniper shot instantly kills Big Boss
              if (b.pierce) {
                b.hitIds!.add(e.id);
                endTrail(b);
                this.bullets.splice(i, 1);
                this.killEnemy(e, dx, dy, 2500, 'SNIPER 1-SHOT!');
                this.texts.push({ x: e.x, y: e.y - 30, text: '★ SNIPER CRITICAL! ONE SHOT! ★', life: 1.8, color: '#e0141e', size: 14 });
                continue outer;
              }
              // 2) Precision pistol headshot instantly kills Big Boss
              if (b.dmg && b.head === e.id) {
                endTrail(b);
                this.bullets.splice(i, 1);
                this.headshot(e, dx, dy);
                this.texts.push({ x: e.x, y: e.y - 30, text: '★ PRECISION HEADSHOT! ★', life: 1.8, color: '#e0141e', size: 14 });
                continue outer;
              }
              // Otherwise: gradual damage to Big Boss (doesn't die in 1 hit)
              let dmg = 1.0;
              if (b.weapon === 'shotgun') dmg = 1.2;
              else if (b.weapon === 'rifle') dmg = 1.5;
              else if (b.weapon === 'uzi') dmg = 0.85;
              else if (b.weapon === 'pistol') dmg = 1.0;
              const pointBlank = Math.hypot(e.x - b.sx, e.y - b.sy) < 90;
              if (pointBlank) dmg *= 1.3;
              e.hp -= dmg;
              endTrail(b);
              this.bullets.splice(i, 1);
              if (e.hp <= 0.01) {
                this.killEnemy(e, dx, dy, 2500, 'BIG BOSS ELIMINATED');
              } else {
                this.woundEnemy(e, dx, dy, b.owner === 0);
                this.texts.push({ x: e.x, y: e.y - 20, text: `-${dmg.toFixed(1)} HP [${Math.ceil(e.hp)}/11]`, life: 0.75, color: '#e0141e', size: 11 });
              }
              continue outer;
            }

            // Standard enemy damage
            // PISTOL: headshot = instant, body = 2-3 shots
            if (b.dmg && e.state !== 'down') {
              if (b.head === e.id) {
                endTrail(b);
                this.bullets.splice(i, 1);
                this.headshot(e, dx, dy);
                continue outer;
              }
              const pointBlank = Math.hypot(e.x - b.sx, e.y - b.sy) < 80;
              e.hp -= pointBlank ? 1.5 : b.dmg;
              if (e.hp > 0.01) {
                endTrail(b);
                this.bullets.splice(i, 1);
                this.woundEnemy(e, dx, dy, b.owner === 0);
                continue outer;
              }
            }
            if (b.pierce) {
              b.hitIds!.add(e.id);
              const n = b.hitIds!.size;
              this.killEnemy(e, dx, dy, 500 * n, n > 1 ? `PIERCE x${n}` : 'HEADSHOT');
              continue;
            }
            endTrail(b);
            this.bullets.splice(i, 1);
            if (b.owner === 0) this.killEnemy(e, dx, dy, 400, e.state === 'down' ? 'GROUND' : undefined);
            else {
              this.killEnemy(e, dx, dy, 0);
              this.texts.push({ x: e.x, y: e.y - 20, text: 'FRIENDLY FIRE', life: 1.2, color: '#e0141e', size: 10 });
            }
            continue outer;
          }
        }
        // dash gives i-frames: bullets fly through you
        if (b.owner !== 0 && p.alive && p.dashT <= 0 && Math.hypot(p.x - b.x, p.y - b.y) < p.r - 1) {
          endTrail(b);
          this.bullets.splice(i, 1);
          if (b.dmg && p.hp > b.dmg) { this.hurtPlayer(dx, dy, b.dmg); continue outer; }
          this.playerDie(dx, dy);
          continue outer;
        }
        if (b.owner !== 0 && p.alive && p.dashT > 0 && Math.hypot(p.x - b.x, p.y - b.y) < p.r + 4 && !b.dodged) {
          b.dodged = true;
          this.texts.push({ x: p.x, y: p.y - 20, text: 'DODGE', life: 0.6, color: '#111', size: 10 });
          this.score += 100;
          this.slowmo = Math.max(this.slowmo, 0.2);
        }
      }
    }
  }

  updatePickups(dt: number) {
    for (const pk of this.pickups) {
      const sp = Math.hypot(pk.vx, pk.vy);
      if (sp < 2) { pk.vx = pk.vy = 0; pk.thrown = false; continue; }
      const steps = Math.ceil((sp * dt) / 5);
      for (let s = 0; s < steps; s++) {
        const nx = pk.x + (pk.vx * dt) / steps, ny = pk.y + (pk.vy * dt) / steps;
        const txn = Math.floor(nx / T), tyn = Math.floor(ny / T);
        const c = this.tile(txn, tyn);
        const blocked = c === '#' || c === 'G' || (c === 'T' && !pk.thrown);
        if (c === 'G' && pk.thrown && sp > 300) { this.breakGlass(txn, tyn, pk.vx / sp, pk.vy / sp); pk.vx *= 0.6; pk.vy *= 0.6; }
        else if (blocked) {
          const bx = this.tile(Math.floor(nx / T), Math.floor(pk.y / T));
          const by = this.tile(Math.floor(pk.x / T), Math.floor(ny / T));
          if (bx === '#' || bx === 'G' || (bx === 'T' && !pk.thrown)) pk.vx *= -0.4;
          if (by === '#' || by === 'G' || (by === 'T' && !pk.thrown)) pk.vy *= -0.4;
          if (pk.thrown) { sfx.door(); pk.thrown = false; }
          break;
        } else { pk.x = nx; pk.y = ny; }
        if (pk.thrown) {
          for (const e of this.enemies) {
            if (e.state === 'down' || pk.hit.has(e.id)) continue;
            if (Math.hypot(e.x - pk.x, e.y - pk.y) < e.r + 6) {
              pk.hit.add(e.id);
              const dx = pk.vx / sp, dy = pk.vy / sp;
              if (e.boss) {
                const dmg = pk.type === 'katana' ? 2.5 : WEAPONS[pk.type].blade ? 2.0 : 1.5;
                e.hp -= dmg;
                this.shake = Math.max(this.shake, 12);
                this.hitstop = 0.08;
                if (e.hp <= 0.01) {
                  this.killEnemy(e, dx, dy, 2500, 'THROW FINISH');
                } else {
                  this.woundEnemy(e, dx, dy, true);
                  this.texts.push({ x: e.x, y: e.y - 24, text: `BOSS -${dmg} HP [${Math.ceil(e.hp)}/11]`, life: 0.85, color: '#e0141e', size: 11 });
                }
                pk.vx *= -0.25; pk.vy *= -0.25;
                pk.thrown = false;
                break;
              }
              if (pk.type === 'katana') this.sliceEnemy(e, Math.atan2(dy, dx), 800, 'FLYING SLICE');
              else if (WEAPONS[pk.type].blade) this.killEnemy(e, dx, dy, 700, 'THROW KILL');
              else this.knockdown(e, dx, dy, 150, 440, 'THROW HIT');
              pk.vx *= -0.25; pk.vy *= -0.25;
              pk.thrown = false;
              break;
            }
          }
        }
      }
      const fr = pk.thrown ? 1.1 : 6;
      pk.vx *= Math.exp(-fr * dt);
      pk.vy *= Math.exp(-fr * dt);
      pk.angle += pk.spin * dt;
      pk.spin *= Math.exp(-3 * dt);
      if (Math.hypot(pk.vx, pk.vy) < 320) pk.thrown = false;
    }
  }

  updateFx(dt: number, rdt: number) {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.vz -= 900 * dt;
      s.z += s.vz * dt;
      if (s.z <= 0) {
        s.z = 0;
        if (s.vz < -60) { s.vz *= -0.35; s.vx *= 0.6; s.vy *= 0.6; s.vr *= 0.5; } else s.vz = 0;
      }
      const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
      if (this.tile(Math.floor(nx / T), Math.floor(s.y / T)) === '#') s.vx *= -0.4; else s.x = nx;
      if (this.tile(Math.floor(s.x / T), Math.floor(ny / T)) === '#') s.vy *= -0.4; else s.y = ny;
      const fr = s.z > 0 ? 0.6 : 5;
      s.vx *= Math.exp(-fr * dt); s.vy *= Math.exp(-fr * dt);
      s.rot += s.vr * dt; s.vr *= Math.exp(-(s.z > 0 ? 0.5 : 4) * dt);
      if (s.z <= 0 && s.vz === 0 && Math.hypot(s.vx, s.vy) < 8) {
        this.drawShard(this.decalX, s);
        this.shards.splice(i, 1);
      }
    }
    for (let i = this.halves.length - 1; i >= 0; i--) {
      const h = this.halves[i];
      h.t += dt;
      const nx = h.x + h.vx * dt, ny = h.y + h.vy * dt;
      if (this.solidAt(nx, h.y)) h.vx *= -0.3; else h.x = nx;
      if (this.solidAt(h.x, ny)) h.vy *= -0.3; else h.y = ny;
      h.vx *= Math.exp(-3.2 * dt); h.vy *= Math.exp(-3.2 * dt);
      h.rot += h.vr * dt; h.vr *= Math.exp(-3 * dt);
      if (h.t > 0.5 && Math.hypot(h.vx, h.vy) < 4) {
        this.drawHalf(this.decalX, h, false);
        this.halves.splice(i, 1);
      }
    }
    for (let i = this.casings.length - 1; i >= 0; i--) {
      const c = this.casings[i];
      c.vz -= 800 * dt; c.z += c.vz * dt;
      if (c.z <= 0) { c.z = 0; if (c.vz < -40) { c.vz *= -0.4; c.vx *= 0.6; c.vy *= 0.6; } else c.vz = 0; }
      const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
      if (this.solidAt(nx, c.y)) c.vx *= -0.5; else c.x = nx;
      if (this.solidAt(c.x, ny)) c.vy *= -0.5; else c.y = ny;
      c.vx *= Math.exp(-(c.z > 0 ? 0.5 : 6) * dt); c.vy *= Math.exp(-(c.z > 0 ? 0.5 : 6) * dt);
      c.rot += c.vr * dt; c.vr *= Math.exp(-3 * dt);
      if (c.z === 0 && c.vz === 0 && Math.hypot(c.vx, c.vy) < 5) {
        this.drawCasing(this.decalX, c);
        this.casings.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      const fr = q.kind === 'smoke' ? 3 : 6;
      q.vx *= Math.exp(-fr * dt); q.vy *= Math.exp(-fr * dt);
      if (q.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].life -= dt;
      if (this.trails[i].life <= 0) this.trails.splice(i, 1);
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      this.ghosts[i].life -= rdt;
      if (this.ghosts[i].life <= 0) this.ghosts.splice(i, 1);
    }
    for (let i = this.lights.length - 1; i >= 0; i--) {
      this.lights[i].life -= rdt;
      if (this.lights[i].life <= 0) this.lights.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= rdt; t.y -= 22 * rdt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    this.shake = Math.max(0, this.shake - rdt * 40);
    const kd = Math.exp(-14 * rdt);
    this.camKick.x *= kd; this.camKick.y *= kd;
  }

  updateCamera(dt: number) {
    const p = this.player;
    const look = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 0.62 : this.player.weapon === 'sniper' ? 0.42 : 0.24;
    const dx = (this.mouse.x - this.cw / 2) / this.cam.zoom, dy = (this.mouse.y - this.ch / 2) / this.cam.zoom;
    const c = Math.cos(-this.cam.rot), s = Math.sin(-this.cam.rot);
    const wx = dx * c - dy * s, wy = dx * s + dy * c;
    const tx = p.x + wx * look, ty = p.y + wy * look;
    const k = 1 - Math.exp(-7 * dt);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    this.cam.rot = Math.sin(this.time * 0.33) * 0.035 + Math.sin(this.time * 0.81) * 0.012;
  }

  drawCasing(ctx: CanvasRenderingContext2D, c: Casing) {
    ctx.save();
    ctx.translate(c.x, c.y - c.z);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.big ? '#b3121b' : '#1a1a1a';
    ctx.fillRect(c.big ? -3.5 : -2.5, c.big ? -1.6 : -1, c.big ? 7 : 5, c.big ? 3.2 : 2);
    ctx.fillStyle = c.big ? '#d9a441' : '#6a6a6a';
    ctx.fillRect(c.big ? 2 : 1.5, c.big ? -1.6 : -1, 1.5, c.big ? 3.2 : 2);
    ctx.restore();
  }

  drawTaperedStreak(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, width: number, color: string, alpha: number) {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const nx = -dy, ny = dx;
    const bx = x - dx * length, by = y - dy * length;
    const near = width, far = width * 0.08;
    const g = ctx.createLinearGradient(bx, by, x, y);
    g.addColorStop(0, `rgba(${color},0)`);
    g.addColorStop(0.72, `rgba(${color},${alpha * 0.38})`);
    g.addColorStop(1, `rgba(${color},${alpha})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx + nx * far, by + ny * far);
    ctx.lineTo(x + nx * near, y + ny * near);
    ctx.lineTo(x + dx * 2, y + dy * 2);
    ctx.lineTo(x - nx * near, y - ny * near);
    ctx.lineTo(bx - nx * far, by - ny * far);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${color},${alpha * 0.7})`;
    ctx.lineWidth = Math.max(0.4, width * 0.35);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x, y); ctx.stroke();
  }

  // ---------------- Render ----------------
  drawShard(ctx: CanvasRenderingContext2D, s: Shard, live = false) {
    if (live && s.z > 0.5) {
      ctx.save();
      ctx.translate(s.x + s.z * 0.25, s.y + s.z * 0.15);
      ctx.rotate(s.rot);
      ctx.fillStyle = 'rgba(30,30,50,0.16)';
      ctx.beginPath();
      ctx.moveTo(s.pts[0], s.pts[1]);
      for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i], s.pts[i + 1]);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(s.x, s.y - (live ? s.z : 0));
    ctx.rotate(s.rot);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(s.pts[0], s.pts[1]);
    for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i], s.pts[i + 1]);
    ctx.closePath();
    ctx.fill();
    // One quiet specular plane keeps shards glassy without drawing an ink contour.
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(s.pts[0], s.pts[1]);
    ctx.lineTo(s.pts[2], s.pts[3]);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    if (live && s.glint && Math.sin(this.time * 30 + s.rot * 5) > 0.6) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-s.size, 0); ctx.lineTo(s.size, 0); ctx.moveTo(0, -s.size); ctx.lineTo(0, s.size); ctx.stroke();
    }
    ctx.restore();
  }

  drawWeapon(ctx: CanvasRenderingContext2D, t: WType) {
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

  drawLimb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color: string, shine: string) {
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
    // A small faceted muscle plane keeps the arms athletic, not tube-thin.
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(x1 + nx * shoulder * 0.65, y1 + ny * shoulder * 0.65);
    ctx.lineTo(x1 + dx * 0.44 + nx * muscle * 0.55, y1 + dy * 0.44 + ny * muscle * 0.55);
    ctx.lineTo(x2 + nx * wrist * 0.15, y2 + ny * wrist * 0.15);
    ctx.lineTo(x1 + nx * shoulder * 0.08, y1 + ny * shoulder * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, color: string, shine: string, side = 1, clenched = false) {
    // Keep the palm compact relative to the fuller forearms.
    r *= 0.66;
    const palmX = r * (clenched ? 1.08 : 1.2);
    const palmY = r * (clenched ? 0.88 : 0.78);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    const shade = ctx.createLinearGradient(-r, -r, r, r);
    shade.addColorStop(0, shine); shade.addColorStop(0.45, color); shade.addColorStop(1, color);
    ctx.fillStyle = shade;
    // Thumb projects sideways, but stays tucked in across a closed fist.
    ctx.beginPath();
    ctx.ellipse(-r * 0.12, side * palmY * 0.77, r * 0.42, r * (clenched ? 0.57 : 0.68), -side * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, palmX, palmY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(25,15,22,0.27)';
    ctx.lineWidth = Math.max(0.28, r * 0.12);
    // Subtle knuckle and finger folds, not a heavy cartoon outline.
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

  drawHuman(x: number, y: number, angle: number, enemy: boolean, weapon: WType | null, walkT: number, attackAnim: number, facets: number[], windup = 0, muzzle = 0,
    o: { kick?: number; side?: number; flash?: number; fistDur?: number; stagger?: number; recoil?: number; swing?: Swing | null; moveSpeed?: number; hurt?: number; held?: boolean; boss?: boolean } = {}) {
    const ctx = this.ctx;
    ctx.save();
    const gait = Math.min(1, (o.moveSpeed || 0) / 170);
    const phase = walkT * 0.06;
    const bob = Math.abs(Math.sin(phase)) * 2.1 * gait;
    ctx.translate(x, y - bob);
    if (o.boss) ctx.scale(1.4, 1.4);
    const bodyShadow = ctx.createRadialGradient(4, 6, 2, 4, 6, 17);
    bodyShadow.addColorStop(0, 'rgba(38,34,48,0.16)');
    bodyShadow.addColorStop(0.55, 'rgba(55,50,63,0.07)');
    bodyShadow.addColorStop(1, 'rgba(55,50,63,0)');
    ctx.fillStyle = bodyShadow;
    ctx.beginPath(); ctx.ellipse(4, 6, 17, 17, 0, 0, Math.PI * 2); ctx.fill();
    const kick = o.kick || 0;
    const kickProg = kick > 0 ? 1 - kick / 0.26 : 0;
    const bodyTwist = kick > 0 ? Math.sin(kickProg * Math.PI) * -0.9 : 0;
    const wob = o.stagger && o.stagger > 0 ? Math.sin(this.time * 50) * 0.15 : 0;
    const hurtLean = o.hurt && o.hurt > 0 ? Math.sin(this.time * 34) * 0.2 + Math.min(0.25, o.hurt * 0.3) : 0;
    ctx.rotate(angle + bodyTwist + wob + hurtLean);
    if (o.recoil) ctx.translate(-o.recoil * 30, 0);

    // Compact trailing feet stay close to the body silhouette in the top-down view.
    const st = Math.sin(phase) * 1.8 * gait;
    const st2 = Math.sin(phase + Math.PI) * 1.8 * gait;
    const footC = enemy ? '#bd2630' : '#24252a';
    const legShine = enemy ? '#ff8c80' : '#777980';
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
      this.drawLimb(ctx, -1, -3.1, -3.5, -3, 4.2, footC, legShine);
      this.drawLimb(ctx, -3.5, -3, -6, -3, 3.6, footC, legShine);
      shoe(-6, -3);
    } else {
      this.drawLimb(ctx, -1, -2.6, -3.5 + st * 0.35, -3, 4.3, footC, legShine);
      this.drawLimb(ctx, -3.5 + st * 0.35, -3, -6 + st, -3, 3.6, footC, legShine);
      this.drawLimb(ctx, -1, 2.6, -3.5 + st2 * 0.35, 3, 4.3, footC, legShine);
      this.drawLimb(ctx, -3.5 + st2 * 0.35, 3, -6 + st2, 3, 3.6, footC, legShine);
      shoe(-6 + st, -3);
      shoe(-6 + st2, 3);
    }
    if (kick > 0) {
      const ext = Math.sin(kickProg * Math.PI) * 26;
      ctx.save();
      ctx.rotate(-bodyTwist * 1.1);
      this.drawLimb(ctx, -1, 3, 1, 2, 4.4, footC, legShine);
      this.drawLimb(ctx, 1, 2, 5 + ext, 1, 3.8, footC, legShine);
      shoe(7 + ext, 1);
      if (ext > 18) {
      ctx.strokeStyle = 'rgba(160,128,132,0.28)';
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(0, 0, 20 + ext * 0.35 + i * 4, -0.65, 0.65); ctx.stroke(); }
      }
      ctx.restore();
    }

    const armC = enemy ? '#e3261d' : '#1c1c1c';
    const armHi = enemy ? '#ff7165' : '#64666c';
    if (o.held) {
      // Captive raises both arms; the sharp shoulder silhouette reads clearly at game scale.
      this.drawLimb(ctx, 1, -7.6, 2, -12, 6.4, armC, armHi);
      this.drawLimb(ctx, 2, -12, -1, -17, 5, armC, armHi);
      this.drawLimb(ctx, 1, 7.6, 2, 12, 6.4, armC, armHi);
      this.drawLimb(ctx, 2, 12, -1, 17, 5, armC, armHi);
      this.drawHand(ctx, -1, -17, 3.6, -Math.PI / 2, armC, armHi, -1);
      this.drawHand(ctx, -1, 17, 3.6, Math.PI / 2, armC, armHi, 1);
    } else if (weapon && !WEAPONS[weapon].melee) {
      const flinch = (o.hurt || 0) > 0.04 || (o.stagger || 0) > 0.04;
      if (flinch) {
        const f = Math.sin(this.time * 24) * 2;
        this.drawLimb(ctx, 0, -7.5, -3 - f, -12, 6.6, armC, armHi);
        this.drawLimb(ctx, -3 - f, -12, -9 - f, -14, 5.4, armC, armHi);
        this.drawLimb(ctx, 0, 7.5, -3 + f, 12, 6.6, armC, armHi);
        this.drawLimb(ctx, -3 + f, 12, -9 + f, 14, 5.4, armC, armHi);
        ctx.save(); ctx.translate(-2, 2); ctx.rotate(-0.7); this.drawWeapon(ctx, weapon); ctx.restore();
        this.drawHand(ctx, -9 - f, -14, 3.5, -2.8, armC, armHi, -1);
        this.drawHand(ctx, -9 + f, 14, 3.5, 2.8, armC, armHi, 1);
      } else {
        ctx.save();
        const kickB = muzzle > 0 ? -4 : 0;
        const recoil = kickB - (o.recoil || 0) * 22;
        this.drawLimb(ctx, -1, 7.5, 4 + recoil * 0.45, 12, 6.4, armC, armHi);
        this.drawLimb(ctx, 4 + recoil * 0.45, 12, 10 + recoil, 4, 5.2, armC, armHi);
        this.drawLimb(ctx, -2, -7.5, 4 + recoil * 0.3, -12, 6.4, armC, armHi);
        this.drawLimb(ctx, 4 + recoil * 0.3, -12, 13 + recoil, 1, 5.2, armC, armHi);
        ctx.translate(9 + recoil, 3);
        this.drawWeapon(ctx, weapon);
        ctx.restore();
        this.drawHand(ctx, 10 + recoil, 4, 3.6, -0.5, armC, armHi, 1);
        this.drawHand(ctx, 13 + recoil, 1, 3.4, 0.25, armC, armHi, -1);
      }
    } else if (o.hurt && o.hurt > 0.04 || o.stagger && o.stagger > 0.04) {
      const f = Math.sin(this.time * 20) * 2;
      this.drawLimb(ctx, 0, -7.5, -2 - f, -12, 6.6, armC, armHi);
      this.drawLimb(ctx, -2 - f, -12, -8 - f, -13, 5.4, armC, armHi);
      this.drawLimb(ctx, 0, 7.5, -2 + f, 12, 6.6, armC, armHi);
      this.drawLimb(ctx, -2 + f, 12, -8 + f, 13, 5.4, armC, armHi);
      this.drawHand(ctx, -9 - f, -13, 3.5, -2.8, armC, armHi, -1);
      this.drawHand(ctx, -9 + f, 13, 3.5, 2.8, armC, armHi, 1);
    } else if (weapon) {
      // The free arm guards the upper body while the weapon arm swings.
      this.drawLimb(ctx, 0, -7.5, 4, -12, 6.2, armC, armHi);
      this.drawLimb(ctx, 4, -12, 9, -11, 5.2, armC, armHi);
      this.drawHand(ctx, 9, -11, 3.6, 0.4, armC, armHi, -1, true);
      const sw = o.swing;
      let swing: number;
      if (sw) {
        const u = Math.min(1, sw.t / sw.dur);
        const eased = 1 - Math.pow(1 - u, 3);
        const cur = sw.from + (sw.to - sw.from) * eased;
        if (sw.t <= sw.dur) swing = cur;
        else swing = sw.to + angDiff(sw.to, 0.6) * Math.min(1, (sw.t - sw.dur) / 0.18);
        const fade = sw.t <= sw.dur ? 1 : Math.max(0, 1 - (sw.t - sw.dur) / 0.14);
        if (fade > 0) {
          const head = sw.t <= sw.dur ? cur : sw.to;
          const blade = sw.kind === 'blade';
          const len = WLEN[weapon] || 28;
          const r0 = blade ? 15 : 11, r1 = 12 + len;
          const dir = Math.sign(sw.to - sw.from);
          const total = Math.min(Math.abs(head - sw.from), sw.spin ? 3.6 : 2.7);
          const N = 12;
          ctx.save();
          ctx.translate(0, 8.2);
          for (let k = 0; k < N; k++) {
            const a0 = head - dir * total * (k / N), a1 = head - dir * total * ((k + 1) / N);
            const al = (1 - k / N) * fade;
          ctx.fillStyle = blade ? `rgba(116,124,137,${al * 0.28})` : `rgba(151,153,160,${al * 0.24})`;
            ctx.beginPath();
            ctx.arc(0, 0, r1, a0, a1, dir > 0);
            ctx.arc(0, 0, r0, a1, a0, dir < 0);
            ctx.closePath();
            ctx.fill();
          }
          if (blade) {
            ctx.strokeStyle = `rgba(255,255,255,${0.95 * fade})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(0, 0, r1 - 2, head, head - dir * total * 0.75, dir > 0); ctx.stroke();
            ctx.strokeStyle = `rgba(224,20,30,${0.8 * fade})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.arc(0, 0, r1 + 0.5, head, head - dir * total * 0.5, dir > 0); ctx.stroke();
          } else {
            ctx.strokeStyle = `rgba(133,139,148,${0.35 * fade})`;
            ctx.lineWidth = 0.8;
            for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(0, 0, r1 + 3 + j * 3, head, head - dir * total * (0.5 - j * 0.12), dir > 0); ctx.stroke(); }
          }
          ctx.restore();
        }
      } else {
        const prog = attackAnim > 0 ? 1 - attackAnim / 0.2 : 0;
        swing = -1.1 + prog * 2.4;
        if (windup > 0) swing = -1.6;
        if (!attackAnim && !windup) swing = 0.6;
      }
      ctx.save();
      ctx.translate(0, 8.2);
      ctx.rotate(swing);
      this.drawLimb(ctx, -1, 0, 5, -2, 6.2, armC, armHi);
      this.drawLimb(ctx, 5, -2, 10, 0, 5.2, armC, armHi);
      ctx.save(); ctx.translate(10, 0); this.drawWeapon(ctx, weapon); ctx.restore();
      this.drawHand(ctx, 10, 0, 3.7, 0, armC, armHi, 1, true);
      ctx.restore();
      if (!sw && attackAnim > 0.05) {
        ctx.strokeStyle = 'rgba(146,149,156,0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 8.2, 34, -1.1, swing); ctx.stroke();
      }
    } else {
      // fists: alternating jab/cross
      const dur = o.fistDur || 0.2;
      const pr = attackAnim > 0 ? Math.sin((1 - attackAnim / dur) * Math.PI) : 0;
      const punch = pr * 15;
      const wl = windup > 0 ? -4 : 0;
      const side = o.side || 1;
      ctx.fillStyle = armC;
      const r1 = side > 0 ? punch : 0, r2 = side < 0 ? punch : 0;
      this.drawLimb(ctx, 0, 7.5, 5 + r1 * 0.3, 12, 6.4, armC, armHi);
      this.drawLimb(ctx, 5 + r1 * 0.3, 12, 9 + r1 + wl, 11 - r1 * 0.3, 5.2, armC, armHi);
      this.drawLimb(ctx, 0, -7.5, 5 + r2 * 0.3, -12, 6.4, armC, armHi);
      this.drawLimb(ctx, 5 + r2 * 0.3, -12, 9 + r2 + wl, -11 + r2 * 0.3, 5.2, armC, armHi);
      this.drawHand(ctx, 9 + r1 + wl, 11 - r1 * 0.3, 3.8, -0.15, armC, armHi, 1, true);
      this.drawHand(ctx, 9 + r2 + wl, -11 + r2 * 0.3, 3.8, 0.15, armC, armHi, -1, true);
      if (punch > 8) {
        ctx.strokeStyle = 'rgba(206,174,174,0.45)';
        ctx.lineWidth = 0.8;
        const yy = side > 0 ? 11 : -11;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(2, yy + i * 2.5); ctx.lineTo(6 + punch * 0.6, yy + i * 2.5); ctx.stroke(); }
      }
    }

    // crystalline body
    const pts = humanTorsoPoints(facets);
    const n = pts.length;
    const flash = (o.flash || 0) > 0;
    const g = ctx.createLinearGradient(-8, -13, 8, 13);
    if (flash) { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ffe3df'); }
    else if (enemy) { g.addColorStop(0, '#ff998d'); g.addColorStop(0.32, '#f45c5b'); g.addColorStop(0.72, '#dd3945'); g.addColorStop(1, '#ac2939'); }
    else { g.addColorStop(0, '#4a4a4a'); g.addColorStop(0.5, '#1d1d1d'); g.addColorStop(1, '#050505'); }
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.save();
    ctx.shadowColor = enemy ? 'rgba(156,34,48,0.18)' : 'rgba(20,20,24,0.18)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.5;
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < n; i += 2) {
      const a = pts[i], b = pts[(i + 1) % n];
      ctx.fillStyle = enemy ? 'rgba(126,18,37,0.12)' : 'rgba(255,255,255,0.055)';
      ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill();
    }
    // moving specular sheen (superhot glass look)
    if (enemy && !flash) {
      const sh = ((this.time * 0.6 + x * 0.01) % 2) - 0.5;
      ctx.save();
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.moveTo(-10 + sh * 18, -14); ctx.lineTo(-5 + sh * 18, -14); ctx.lineTo(3 + sh * 18, 14); ctx.lineTo(-2 + sh * 18, 14); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,245,238,0.2)';
      ctx.beginPath(); ctx.ellipse(2, -5, 2.4, 5.2, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Soft reflected planes add crystal depth without a dark cartoon contour.
    if (enemy && !flash) {
      ctx.fillStyle = 'rgba(255,215,203,0.16)';
      ctx.beginPath(); ctx.moveTo(-7, -1); ctx.lineTo(-2, -9); ctx.lineTo(1, -2); ctx.lineTo(-2, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(134,12,31,0.09)';
      ctx.beginPath(); ctx.moveTo(1, -2); ctx.lineTo(7, -5); ctx.lineTo(6, 5); ctx.lineTo(1, 8); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = flash ? '#fff' : enemy ? '#ff7b71' : '#222327';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const r = 5.8 * (1 + (facets[i] - 1) * 0.4);
      i ? ctx.lineTo(1 + Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(1 + Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = enemy ? 'rgba(255,238,230,0.62)' : 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(3, -3); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawDowned(e: Enemy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(e.x, e.y);
    const speed = Math.hypot(e.vx, e.vy);
    const air = e.launched ? Math.min(15, speed / 45) : 0;
    const shadow = Math.max(0.035, 0.095 - air * 0.0035);
    const floorShadow = ctx.createRadialGradient(4 + air * 0.6, 5 + air, 2, 4 + air * 0.6, 5 + air, 25 + air);
    floorShadow.addColorStop(0, `rgba(70,58,69,${shadow})`);
    floorShadow.addColorStop(1, 'rgba(70,58,69,0)');
    ctx.fillStyle = floorShadow;
    ctx.beginPath(); ctx.ellipse(3 + air * 0.6, 5 + air, 22 + air, 12 + air * 0.45, e.downAngle, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -air);
    ctx.rotate(e.downAngle);
    const wig = e.executing ? Math.sin(this.time * 40) * 2 : Math.sin(this.time * 13 + e.id) * (e.launched ? 2.4 : 0.8);
    const dark = e.hitFlash > 0 ? '#fff' : '#d94750', mid = e.hitFlash > 0 ? '#fff' : '#ef5a60', light = e.hitFlash > 0 ? '#fff' : '#ff9b8e';
    // Limbs stay articulated, but flop independently like a small crystal ragdoll.
    this.drawLimb(ctx, -7, -4, -12 + wig * 0.35, -9, 5.2, dark, light);
    this.drawLimb(ctx, -12 + wig * 0.35, -9, -18 + wig, -13, 4.4, mid, light);
    this.drawLimb(ctx, -7, 4, -12 - wig * 0.3, 9, 5.2, dark, light);
    this.drawLimb(ctx, -12 - wig * 0.3, 9, -18 - wig, 14, 4.4, mid, light);
    this.drawLimb(ctx, 4, -5, 0 - wig * 0.4, -12, 4.8, dark, light);
    this.drawLimb(ctx, 0 - wig * 0.4, -12, -6 - wig, -14, 5.2, mid, light);
    this.drawLimb(ctx, 4, 5, 0 + wig * 0.4, 12, 4.8, dark, light);
    this.drawLimb(ctx, 0 + wig * 0.4, 12, -6 + wig, 14, 5.2, mid, light);
    this.drawHand(ctx, -6 - wig, -14, 3.6, -2.6, mid, light, -1);
    this.drawHand(ctx, -6 + wig, 14, 3.6, 2.6, mid, light, 1);

    const g = ctx.createLinearGradient(-14, -9, 12, 10);
    if (e.hitFlash > 0) { g.addColorStop(0, '#fff'); g.addColorStop(1, '#ffe1dc'); }
    else { g.addColorStop(0, '#ff9488'); g.addColorStop(0.38, '#ef555c'); g.addColorStop(0.76, '#d93746'); g.addColorStop(1, '#ae2b3b'); }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, -5); ctx.lineTo(-4, -8); ctx.lineTo(6, -7); ctx.lineTo(10, -3); ctx.lineTo(9, 4); ctx.lineTo(3, 8); ctx.lineTo(-7, 7); ctx.lineTo(-11, 2); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-3, -7); ctx.lineTo(2, -2); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(153,22,40,0.1)';
    ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(7, -4); ctx.lineTo(8, 3); ctx.lineTo(2, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,238,0.2)';
    ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(7, -4); ctx.lineTo(3, -1); ctx.closePath(); ctx.fill();
    // angular crystal head, with a bright visor facet
    const hg = ctx.createLinearGradient(11, -5, 21, 6);
    hg.addColorStop(0, e.hitFlash > 0 ? '#fff' : '#ffaea0');
    hg.addColorStop(1, e.hitFlash > 0 ? '#ffe4dd' : '#df4752');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.moveTo(10, -5); ctx.lineTo(16, -7); ctx.lineTo(21, -2); ctx.lineTo(20, 4); ctx.lineTo(15, 7); ctx.lineTo(10, 3); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.46)';
    ctx.beginPath(); ctx.moveTo(11, -4); ctx.lineTo(16, -6); ctx.lineTo(14, -1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(177,47,57,0.88)';
    ctx.beginPath(); ctx.ellipse(-18 + wig, -13, 4.2, 2.1, -0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-18 - wig, 14, 4.2, 2.1, 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    const { cw, ch } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#cdd0d6';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    ctx.translate(cw / 2 + sx, ch / 2 + sy);
    ctx.rotate(this.cam.rot);
    const zoomPunch = 1 + Math.min(0.06, this.whiteFlash * 0.05) + (1 - this.worldScale) * 0.04;
    this.zp = zoomPunch;
    ctx.scale(this.cam.zoom * zoomPunch, this.cam.zoom * zoomPunch);
    ctx.translate(-this.cam.x - this.camKick.x, -this.cam.y - this.camKick.y);

    const W = this.w * T, H = this.h * T;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.floorC, 0, 0, W, H);
    ctx.drawImage(this.decalC, 0, 0, W, H);

    // dynamic lights (multiply tint on white world)
    if (this.lights.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      for (const l of this.lights) {
        const a = l.life / l.max;
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        g.addColorStop(0, `rgba(${l.color},${0.85 * a})`);
        g.addColorStop(1, `rgba(${l.color},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      }
      ctx.restore();
    }

    // exit marker
    if (this.state === 'cleared' || this.state === 'complete') {
      const ex = this.exitX * T, ey = this.exitY * T;
      const pulse = 0.5 + Math.sin(this.time * 6) * 0.5;
      ctx.fillStyle = `rgba(230,20,30,${0.15 + pulse * 0.25})`;
      ctx.fillRect(ex - 4, ey - 4, T + 8, T + 8);
      ctx.strokeStyle = '#e0141e';
      ctx.lineWidth = 2;
      ctx.strokeRect(ex + 2, ey + 2, T - 4, T - 4);
      ctx.fillStyle = '#e0141e';
      ctx.font = '10px Anton, Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', ex + T / 2, ey + T / 2 + 4);
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.exitX * T + 3, this.exitY * T + 3, T - 6, T - 6);
    }

    // lingering bullet trails (superhot)
    for (const t of this.trails) {
      const a = t.life / t.max;
      const dx = t.x2 - t.x1, dy = t.y2 - t.y1;
      this.drawTaperedStreak(ctx, t.x2, t.y2, Math.atan2(dy, dx), Math.hypot(dx, dy), t.w * 1.05, t.enemy ? '230,25,20' : '20,20,20', a * 0.32);
    }

    // casings in flight
    for (const c of this.casings) {
      ctx.fillStyle = 'rgba(30,30,50,0.15)';
      ctx.fillRect(c.x - 2, c.y - 1, 4, 2);
      this.drawCasing(ctx, c);
    }

    // pickups
    for (const pk of this.pickups) {
      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.fillStyle = 'rgba(30,30,50,0.15)';
      ctx.beginPath(); ctx.ellipse(2, 3, 12, 5, pk.angle, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(pk.angle);
      ctx.translate(-10, 0);
      this.drawWeapon(ctx, pk.type);
      ctx.restore();
    }
    const p = this.player;
    if (p.alive && !p.weapon) {
      for (const pk of this.pickups) {
        if (!pk.thrown && Math.hypot(pk.x - p.x, pk.y - p.y) < 34) {
          ctx.strokeStyle = `rgba(0,0,0,${0.4 + Math.sin(this.time * 8) * 0.3})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(pk.x, pk.y, 14, 0, Math.PI * 2); ctx.stroke();
          break;
        }
      }
    }

    // afterimages (dash + flying bodies)
    for (const g of this.ghosts) {
      const a = g.life / 0.3;
      ctx.save();
      ctx.translate(g.x, g.y);
      if (g.angle <= -999) {
        ctx.rotate(-(g.angle + 999));
        ctx.fillStyle = `rgba(240,34,26,${a * 0.35})`;
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.rotate(g.angle);
        ctx.fillStyle = `rgba(15,15,15,${a * 0.4})`;
        ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(1, 0, 6.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    for (const h of this.halves) this.drawHalf(ctx, h, true);
    for (const e of this.enemies) if (e.state === 'down') this.drawDowned(e);
    // sniper laser sight
    if (p.alive && p.weapon === 'sniper' && !p.exec) {
      const c = Math.cos(p.angle), sn = Math.sin(p.angle);
      let lx = p.x + c * 30, ly = p.y + sn * 30;
      const sx0 = lx, sy0 = ly;
      for (let d = 0; d < 1400; d += 4) {
        lx += c * 4; ly += sn * 4;
        if (this.tile(Math.floor(lx / T), Math.floor(ly / T)) === '#') break;
      }
      const lg = ctx.createLinearGradient(sx0, sy0, lx, ly);
      lg.addColorStop(0, 'rgba(230,20,30,0.7)');
      lg.addColorStop(1, 'rgba(230,20,30,0.15)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(lx, ly); ctx.stroke();
      ctx.fillStyle = '#e0141e';
      ctx.beginPath(); ctx.arc(lx, ly, 2 + Math.sin(this.time * 12), 0, Math.PI * 2); ctx.fill();
    }
    if (p.alive && !p.exec) {
      let nearby: Enemy | null = null;
      let nearD = 42;
      let action = 'HOSTAGE';
      for (const e of this.enemies) {
        if (e === this.hostage || e.state === 'hostage' || e.launched) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        const available = e.state === 'down' ? 34 : 42;
        if (d < Math.min(nearD, available)) { nearby = e; nearD = d; action = e.state === 'down' ? 'FINISH' : 'HOSTAGE'; }
      }
      if (nearby) {
        ctx.fillStyle = '#111';
        ctx.font = '9px Anton, Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`[SPACE] ${action}`, nearby.x, nearby.y - 18);
      }
    }

    for (const e of this.enemies) {
      if (e.state === 'down' || e === this.hostage) continue;
      this.drawHuman(e.x, e.y, e.angle, true, e.weapon, e.walkT, e.attackAnim, e.facets, e.windup, e.muzzle, { flash: e.hitFlash, stagger: e.stagger, moveSpeed: e.moveSpeed, boss: e.boss });
      if (e.boss) {
        ctx.save();
        const tagY = e.y - 36;
        ctx.fillStyle = 'rgba(17, 20, 24, 0.92)';
        ctx.fillRect(e.x - 32, tagY - 11, 64, 16);
        ctx.strokeStyle = '#e51d2e';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(e.x - 32, tagY - 11, 64, 16);

        ctx.font = '10px Anton, Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('BIG BOSS', e.x, tagY + 1);

        const miniW = 40, miniH = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(e.x - miniW / 2, tagY + 7, miniW, miniH);
        ctx.fillStyle = '#e51d2e';
        ctx.fillRect(e.x - miniW / 2, tagY + 7, miniW * (Math.max(0, e.hp) / 11), miniH);
        ctx.restore();
      }
      if (e.alertFlash > 0) {
        ctx.fillStyle = '#e0141e';
        ctx.font = 'bold 16px Anton, Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(e.state === 'alert' ? '!' : '?', e.x, e.y - 20);
      }
      if (e.stagger > 0 && e.hits > 0) {
        for (let i = 0; i < e.hits; i++) {
          ctx.fillStyle = '#111';
          ctx.fillRect(e.x - 8 + i * 6, e.y - 22, 4, 3);
        }
      }
    }
    if (p.alive) {
      this.drawHuman(p.x, p.y, p.angle, false, p.weapon, p.walkT, p.attackAnim, [1, 1.04, 0.95, 1.05, 1, 0.96, 1.06, 0.97, 1.02], 0, p.muzzle,
        { kick: p.kickAnim, side: p.punchSide, fistDur: 0.13, recoil: p.recoil, swing: p.swing, flash: p.hurtT > 0.3 ? 1 : 0, hurt: p.hurtT, moveSpeed: p.moveSpeed });
      if (p.dashCd > 0) {
        ctx.strokeStyle = 'rgba(17,17,17,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 18, -Math.PI / 2, -Math.PI / 2 + (1 - p.dashCd / 0.58) * Math.PI * 2); ctx.stroke();
      }
    }
    if (p.alive && this.hostage) {
      const h = this.hostage;
      this.drawHuman(h.x, h.y, h.angle, true, null, h.walkT, 0, h.facets, 0, 0, { held: true, moveSpeed: h.moveSpeed });
      ctx.strokeStyle = `rgba(224,20,30,${0.55 + Math.sin(this.time * 8) * 0.18})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 19, 22, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '9px Anton, Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#111';
      ctx.fillText('SHIELD', h.x, h.y - 23);
    }

    // Bullets are a bright needle with a fine, pointed tail.
    for (const b of this.bullets) {
      const length = b.pierce ? 52 : b.owner === 0 ? 27 : 33;
      const col = b.owner === 0 ? '24,24,26' : '235,24,20';
      this.drawTaperedStreak(ctx, b.x, b.y, Math.atan2(b.vy, b.vx), length, b.pierce ? 1.55 : 1.05, col, 0.9);
      ctx.fillStyle = b.owner === 0 ? '#111' : '#f21e14';
      ctx.beginPath(); ctx.arc(b.x, b.y, 1.15, 0, Math.PI * 2); ctx.fill();
    }

    ctx.drawImage(this.wallC, 0, -EXTR - 2, W, H + EXTR + 2);

    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.tiles[y][x] !== 'G') continue;
      const gx = x * T, gy = y * T;
      const hz = this.tile(x - 1, y) === 'G' || this.tile(x + 1, y) === 'G' || this.tile(x - 1, y) === '#' || this.tile(x + 1, y) === '#';
      ctx.fillStyle = 'rgba(175,215,238,0.45)';
      if (hz) ctx.fillRect(gx, gy + T / 2 - 4, T, 8); else ctx.fillRect(gx + T / 2 - 4, gy, 8, T);
      ctx.strokeStyle = 'rgba(110,160,195,0.8)';
      ctx.lineWidth = 1;
      if (hz) ctx.strokeRect(gx, gy + T / 2 - 4, T, 8); else ctx.strokeRect(gx + T / 2 - 4, gy, 8, T);
      const sh = ((this.time * 0.5 + (x + y) * 0.13) % 1.6) * T;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      if (hz) { ctx.moveTo(gx + sh % T, gy + T / 2 + 3); ctx.lineTo(gx + (sh % T) + 5, gy + T / 2 - 3); }
      else { ctx.moveTo(gx + T / 2 - 3, gy + sh % T); ctx.lineTo(gx + T / 2 + 3, gy + (sh % T) + 5); }
      ctx.stroke();
    }

    for (const d of this.doors) {
      const ex = d.hx + Math.cos(d.angle) * T, ey = d.hy + Math.sin(d.angle) * T;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(30,30,50,0.15)';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(d.hx + 3, d.hy + 4); ctx.lineTo(ex + 3, ey + 4); ctx.stroke();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(d.hx, d.hy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#5a5a5a';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(d.hx, d.hy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(d.hx, d.hy, 3, 0, Math.PI * 2); ctx.fill();
    }

    for (const s of this.shards) this.drawShard(ctx, s, true);

    for (const q of this.particles) {
      const a = Math.max(0, q.life / q.max);
      if (q.kind === 'spark') {
        ctx.strokeStyle = q.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = q.size;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); ctx.stroke();
      } else if (q.kind === 'flash') {
        ctx.globalAlpha = a;
        ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.6 + a * 0.4), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * 0.45, 0, Math.PI * 2); ctx.fill();
      } else if (q.kind === 'cone') {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(q.x, q.y);
        ctx.rotate(q.angle || 0);
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const spikes = 7;
        for (let i = 0; i <= spikes; i++) {
          const t = -0.45 + (i / spikes) * 0.9;
          const r = q.size * (i % 2 ? 0.55 : 1) * rand(0.8, 1.15);
          ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(q.size * 0.55, 0); ctx.lineTo(0, 2.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (q.kind === 'star') {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(q.x, q.y);
        ctx.rotate((q.angle || 0) + Math.PI / 8);
        const r = q.size * (1.2 - a * 0.4);
        ctx.fillStyle = q.color;
        ctx.strokeStyle = 'rgba(157,109,112,0.32)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const rr = i % 2 ? r * 0.3 : r * (i % 4 === 0 ? 1 : 0.65);
          const t = (i / 16) * Math.PI * 2;
          i ? ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr) : ctx.moveTo(Math.cos(t) * rr, Math.sin(t) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (q.kind === 'slash') {
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.angle || 0);
        const len = q.size * (1.3 - a * 0.3);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(0, -3.5 * a - 0.5); ctx.lineTo(len / 2, 0); ctx.lineTo(0, 3.5 * a + 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-len / 2 + 6, 0); ctx.lineTo(0, -1.6 * a); ctx.lineTo(len / 2 - 6, 0); ctx.lineTo(0, 1.6 * a); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (q.kind === 'smoke') {
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(${q.color},${a * 0.22})`;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.8 - a * 0.8), 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.strokeStyle = q.color;
        ctx.lineWidth = 1.7 * a + 0.25;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1 - a) + 6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      const pop = 1 + Math.max(0, t.life - (t.life > 1 ? 1.1 : 0.6)) * 2;
      ctx.font = `${t.size * pop}px Anton, Impact, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText(t.text, t.x + 1, t.y + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    this.renderHUD();
  }

  hudText(txt: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', shadow = '#e0141e', rot = 0) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = `${size}px Anton, Impact, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    if (shadow) { ctx.fillStyle = shadow; ctx.fillText(txt, size * 0.06, size * 0.06); }
    ctx.fillStyle = color;
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  renderHUD() {
    const ctx = this.ctx;
    const { cw, ch } = this;
    const mobile = this.touch.enabled;
    const t = this.time;
    const lvl = LEVELS[this.levelIndex];
    // vignette
    const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(40,40,55,0.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, cw, ch);

    if (this.redFlash > 0) {
      ctx.fillStyle = `rgba(230,20,30,${this.redFlash * 0.35})`;
      ctx.fillRect(0, 0, cw, ch);
    }
    if (this.whiteFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.45, this.whiteFlash * 0.6)})`;
      ctx.fillRect(0, 0, cw, ch);
    }
    // time-freeze look: cold edges + scan lines when time is slowed
    const frozen = 1 - this.worldScale;
    if (frozen > 0.05 && this.state !== 'complete') {
      const eg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.3, cw / 2, ch / 2, Math.max(cw, ch) * 0.7);
      eg.addColorStop(0, 'rgba(255,255,255,0)');
      eg.addColorStop(1, `rgba(${this.state === 'dead' ? '120,0,10' : '20,24,40'},${frozen * 0.35})`);
      ctx.fillStyle = eg;
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = `rgba(0,0,0,${frozen * 0.05})`;
      for (let y = (this.time * 40) % 4; y < ch; y += 4) ctx.fillRect(0, y, cw, 1);
      // chromatic edge bars
      ctx.fillStyle = `rgba(224,20,30,${frozen * 0.5})`;
      ctx.fillRect(0, 0, cw, 4 * frozen);
      ctx.fillRect(0, ch - 4 * frozen, cw, 4 * frozen);
    }

    const pl = this.player;
    // BIG BOSS health bar at top of screen
    const boss = this.enemies.find((e) => e.boss && e.state !== 'down');
    if (boss && (this.state === 'play' || this.state === 'intro')) {
      const bhw = Math.min(290, cw * 0.46);
      const bhx = cw / 2 - bhw / 2;
      const bhy = mobile ? 22 : 28;

      ctx.save();
      // Background bar container
      ctx.fillStyle = 'rgba(15, 18, 22, 0.90)';
      ctx.fillRect(bhx - 8, bhy - 18, bhw + 16, 32);
      ctx.strokeStyle = '#e51d2e';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(bhx - 8, bhy - 18, bhw + 16, 32);

      // Label: BIG BOSS
      ctx.font = '12px Anton, Impact, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('BIG BOSS', bhx, bhy - 4);

      // HP text
      const hpVal = Math.max(0, Math.ceil(boss.hp));
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = 'right';
      ctx.fillStyle = hpVal <= 3 ? '#ff3b4a' : '#deded8';
      ctx.fillText(`${hpVal}/11 HP`, bhx + bhw, bhy - 4);

      // 11 Segmented health blocks
      const totalPips = 11;
      const pipGap = 2;
      const pipW = (bhw - pipGap * (totalPips - 1)) / totalPips;
      const pipH = 8;
      for (let p = 0; p < totalPips; p++) {
        const px = bhx + p * (pipW + pipGap);
        ctx.fillStyle = p < hpVal ? (hpVal <= 3 ? '#ff2a3b' : '#e51d2e') : '#2a2e33';
        ctx.fillRect(px, bhy, pipW, pipH);
      }
      ctx.restore();
    }

    {
      const bw = mobile ? 112 : 180, bx = mobile ? 20 : 30, by = mobile ? 73 : 110;
      if (this.noSlowMo) {
        ctx.font = '13px Anton, Impact, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#111';
        ctx.fillText('NO SLOW-MO [N]', bx, by + 9);
      } else {
        ctx.fillStyle = 'rgba(17,17,17,0.15)';
        ctx.fillRect(bx, by, bw, 8);
        ctx.fillStyle = this.focusActive ? '#e0141e' : this.focus > 0.99 ? '#111' : '#444';
        ctx.fillRect(bx, by, bw * this.focus, 8);
        ctx.font = '11px Anton, Impact, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#111';
        ctx.fillText(this.focusActive ? 'FOCUS — SLOW MOTION' : mobile ? 'FOCUS / TAHAN' : 'FOCUS [RODA MOUSE / C]', bx, by + 22);
      }
    }
    if (this.focusActive) {
      ctx.fillStyle = 'rgba(224,20,30,0.06)';
      ctx.fillRect(0, 0, cw, ch);
      const fl = Math.sin(t * 8) > 0 ? 1 : 0.6;
      ctx.globalAlpha = fl;
      this.hudText('SLOW MOTION', cw / 2, mobile ? 94 : 130, mobile ? 16 : 26, '#e0141e', 'center', '#111');
      ctx.globalAlpha = 1;
    }
    if (pl.hitCount > 1 && this.state !== 'dead') {
      const sc = 1 + Math.max(0, pl.hitCountT - 1.25) * 3;
      this.hudText(`${pl.hitCount} HITS`, mobile ? cw * 0.73 : cw / 2, mobile ? 117 : ch * 0.22, (mobile ? 24 : 44) * sc, '#111', 'center', '#e0141e', Math.sin(t * 4) * 0.04);
    }
    if (this.superTime && !this.noSlowMo) {
      const on = this.worldScale < 0.5;
      this.hudText(on ? 'TIME STOPPED' : 'TIME MOVES', cw / 2, mobile ? 115 : ch - 70, mobile ? 13 : 22, on ? '#e0141e' : '#111', 'center', '');
      this.hudText('SUPERHOT MODE [T]', cw / 2, mobile ? 132 : ch - 50, mobile ? 9 : 12, '#111', 'center', '');
    }
    if (this.hostage && this.state === 'play') {
      this.hudText(mobile ? 'SANDERA / AKSI UNTUK LEMPAR' : 'SHIELD ACTIVE — SPACE TO THROW', cw / 2, mobile ? 111 : 134, mobile ? 12 : 17, '#e0141e', 'center', '#111');
    }

    const wob = Math.sin(t * 2) * 0.03;
    this.hudText(lvl.name, mobile ? 20 : 28, mobile ? 33 : 62, mobile ? 24 : 44, '#111', 'left', '#e0141e', wob);
    this.hudText(`${this.score} PTS`, mobile ? 20 : 30, mobile ? 56 : 96, mobile ? 16 : 24, '#111', 'left', 'rgba(224,20,30,0.7)', -wob * 0.5);
    if (this.combo > 1) {
      const sc = 1 + Math.max(0, this.comboT - 3.2) * 0.8;
      this.hudText(`${this.combo}X COMBO`, mobile ? cw * 0.73 : cw - 28, mobile ? 92 : 62, (mobile ? 16 : 38) * sc, '#e0141e', mobile ? 'center' : 'right', '#111', -wob);
      ctx.fillStyle = '#111';
      if (!mobile) ctx.fillRect(cw - 28 - 160 * (this.comboT / 3.6), 74, 160 * (this.comboT / 3.6), 4);
    }
    // weapon
    const p = this.player;
    const wname = p.weapon ? WEAPONS[p.weapon].name : 'UNARMED';
    const ammo = p.weapon && !WEAPONS[p.weapon].melee ? `${p.ammo} / ${WEAPONS[p.weapon].ammo}` : p.weapon ? 'MELEE' : 'FISTS';
    this.hudText(wname, mobile ? cw / 2 : 28, mobile ? 32 : ch - 58, mobile ? 18 : 34, '#111', mobile ? 'center' : 'left', '#e0141e', wob * 0.7);
    this.hudText(ammo, mobile ? cw / 2 : 30, mobile ? 52 : ch - 26, mobile ? 12 : 22, p.weapon && !WEAPONS[p.weapon].melee && p.ammo === 0 ? '#e0141e' : '#111', mobile ? 'center' : 'left', '');
    this.hudText(`${this.enemies.length} / ${this.totalEnemies}`, mobile ? cw - 126 : cw - 28, mobile ? 34 : ch - 58, mobile ? 22 : 34, '#e0141e', 'right', '#111', -wob * 0.7);
    this.hudText('ENEMIES LEFT', mobile ? cw - 126 : cw - 30, mobile ? 51 : ch - 30, mobile ? 9 : 16, '#111', 'right', '');
    const mm = Math.floor(this.levelTime / 60), ss = Math.floor(this.levelTime % 60);
    this.hudText(`${mm}:${ss.toString().padStart(2, '0')}`, mobile ? cw / 2 : cw - 28, mobile ? 71 : 96, mobile ? 10 : 20, '#111', mobile ? 'center' : 'right', '');

    // hint
    if (this.hintT > 0 && !mobile && this.state !== 'dead' && this.state !== 'complete') {
      ctx.globalAlpha = Math.min(1, this.hintT);
      ctx.font = '600 15px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      const w = ctx.measureText(this.hint).width + 30;
      ctx.fillStyle = 'rgba(17,17,17,0.85)';
      ctx.fillRect(cw / 2 - w / 2, ch - 130, w, 30);
      ctx.fillStyle = '#fff';
      ctx.fillText(this.hint, cw / 2, ch - 110);
      ctx.globalAlpha = 1;
    }

    // exit arrow
    if (this.state === 'cleared') {
      this.hudText('GO TO EXIT', cw / 2, (mobile ? 114 : 70) + Math.sin(t * 6) * 3, mobile ? 22 : 40, '#e0141e', 'center', '#111');
      const ex = this.exitX * T + T / 2, ey = this.exitY * T + T / 2;
      const a = Math.atan2(ey - p.y, ex - p.x) + this.cam.rot;
      const r = Math.min(cw, ch) * 0.38;
      const ax = cw / 2 + Math.cos(a) * r, ay = ch / 2 + Math.sin(a) * r;
      if (Math.hypot(ex - p.x, ey - p.y) > 150) {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(a);
        ctx.fillStyle = '#e0141e';
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }

    // intro
    if (this.state === 'intro' || (this.state === 'paused' && this.prevState === 'intro')) {
      const a = Math.max(0, 1 - Math.max(0, this.stateT - 0.9) / 0.7);
      ctx.fillStyle = `rgba(245,245,247,${a * 0.85})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = a;
      this.hudText(`LEVEL ${this.levelIndex + 1}`, cw / 2, ch / 2 - 60, 26, '#111', 'center', '');
      this.hudText(lvl.name, cw / 2, ch / 2 + 20, mobile ? Math.min(82, ch * 0.23) : 110, '#e0141e', 'center', '#111', Math.sin(t * 3) * 0.02);
      this.hudText(lvl.sub, cw / 2, ch / 2 + 60, 22, '#111', 'center', '');
      ctx.globalAlpha = 1;
    }

    if (this.state === 'dead' && !this.cb.onUIChange) {
      ctx.fillStyle = 'rgba(245,245,247,0.55)';
      ctx.fillRect(0, 0, cw, ch);
      const j = Math.sin(t * 20) * 2;
      this.hudText("YOU'RE DEAD", cw / 2 + j, ch / 2, 96, '#111', 'center', '#e0141e', Math.sin(t * 2) * 0.03);
      this.hudText('[R] ATAU KLIK UNTUK RESTART', cw / 2, ch / 2 + 50, 24, '#e0141e', 'center', '');
      this.hudText('[ESC] MENU', cw / 2, ch / 2 + 80, 16, '#111', 'center', '');
    }

    if (this.state === 'paused' && !this.cb.onUIChange) {
      ctx.fillStyle = 'rgba(245,245,247,0.8)';
      ctx.fillRect(0, 0, cw, ch);
      this.hudText('PAUSED', cw / 2, ch / 2, 90, '#111', 'center', '#e0141e');
      this.hudText('[ESC] LANJUT    [Q] KELUAR KE MENU    [M] MUSIK', cw / 2, ch / 2 + 50, 20, '#111', 'center', '');
    }

    if (this.state === 'complete') {
      const st = this.stateT;
      if (st < 3) {
        const idx = Math.floor(st / 0.5);
        const word = idx % 2 === 0 ? 'SUPER' : 'HOT';
        const local = (st % 0.5) / 0.5;
        // High contrast rhythmic pulsing background (Superhot signature style)
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(15, 17, 20, 0.96)' : 'rgba(224, 20, 30, 0.96)';
        ctx.fillRect(0, 0, cw, ch);
        const size = Math.min(cw * 0.32, 280) * (1.18 - local * 0.18);
        ctx.save();
        ctx.translate(cw / 2, ch / 2 + size * 0.35);
        ctx.font = `${size}px Anton, Impact, sans-serif`;
        ctx.textAlign = 'center';
        // Glitch echo shadow trail
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = idx % 2 === 0 ? `rgba(224,20,30,${0.35 - i * 0.08})` : `rgba(255,255,255,${0.35 - i * 0.08})`;
          ctx.fillText(word, (i + 1) * 8 * (1 - local), (i + 1) * 2);
        }
        ctx.fillStyle = idx % 2 === 0 ? '#e0141e' : '#fff';
        ctx.fillText(word, 0, 0);

        // Floor status tag
        ctx.font = "bold 13px 'Space Grotesk', sans-serif";
        ctx.fillStyle = idx % 2 === 0 ? '#9ca3af' : 'rgba(255,255,255,0.85)';
        ctx.fillText(`FLOOR ${String(this.levelIndex + 1).padStart(2, '0')} // CLEARED`, 0, size * 0.32);
        ctx.restore();
      } else if (!this.cb.onUIChange) {
        ctx.fillStyle = 'rgba(245,245,247,0.94)';
        ctx.fillRect(0, 0, cw, ch);
        const grade = this.grade();
        this.hudText('LEVEL COMPLETE', cw / 2, ch / 2 - 150, 34, '#111', 'center', '');
        this.hudText(LEVELS[this.levelIndex].name, cw / 2, ch / 2 - 80, 72, '#e0141e', 'center', '#111');
        const mm2 = Math.floor(this.levelTime / 60), ss2 = Math.floor(this.levelTime % 60);
        const rows = [
          ['SCORE', `${this.score}`],
          ['TIME', `${mm2}:${ss2.toString().padStart(2, '0')}`],
          ['KILLS', `${this.kills}`],
          ['MAX COMBO', `${this.maxCombo}X`],
        ];
        rows.forEach(([k, v], i) => {
          this.hudText(k, cw / 2 - 30, ch / 2 - 20 + i * 36, 26, '#111', 'right', '');
          this.hudText(v, cw / 2 + 30, ch / 2 - 20 + i * 36, 26, '#e0141e', 'left', '');
        });
        this.hudText(grade, cw / 2 + 220, ch / 2 + 60, 160, '#e0141e', 'center', '#111', -0.12 + Math.sin(t * 2) * 0.03);
        const blink = Math.sin(t * 5) > -0.3;
        if (blink && st > 3.2) this.hudText(this.levelIndex + 1 < LEVELS.length ? 'KLIK / ENTER — LEVEL BERIKUTNYA' : 'KLIK / ENTER — SELESAI', cw / 2, ch / 2 + 150, 24, '#111', 'center', '#e0141e');
      }
    }

    // ---- off-screen enemy markers ----
    if (this.state === 'play' || this.state === 'intro' || this.state === 'cleared' || this.state === 'paused') {
      const m = 34;
      for (const e of this.enemies) {
        if (e === this.hostage) continue;
        const sp = this.worldToScreen(e.x, e.y);
        if (sp.x > -6 && sp.x < cw + 6 && sp.y > -6 && sp.y < ch + 6) continue;
        const dx = sp.x - cw / 2, dy = sp.y - ch / 2;
        const k = Math.min((cw / 2 - m) / Math.max(1e-6, Math.abs(dx)), (ch / 2 - m) / Math.max(1e-6, Math.abs(dy)));
        const ix = cw / 2 + dx * k, iy = ch / 2 + dy * k;
        const a = Math.atan2(dy, dx);
        const dist = Math.hypot(e.x - pl.x, e.y - pl.y);
        const alert = e.state === 'alert';
        const down = e.state === 'down';
        const size = Math.max(8, 16 - dist / 90) * (alert ? 1 + Math.sin(t * 14) * 0.18 : 1);
        ctx.save();
        ctx.translate(ix, iy);
        ctx.globalAlpha = Math.max(0.45, 1 - dist / 1400);
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(size, 0); ctx.lineTo(-size * 0.7, -size * 0.8); ctx.lineTo(-size * 0.35, 0); ctx.lineTo(-size * 0.7, size * 0.8); ctx.closePath();
        if (down) { ctx.strokeStyle = '#e0141e'; ctx.lineWidth = 2; ctx.stroke(); }
        else { ctx.fillStyle = alert ? '#e0141e' : '#b3121b'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2; ctx.stroke(); }
        ctx.restore();
        ctx.font = '11px Anton, Impact, sans-serif';
        ctx.textAlign = 'center';
        const lx = -Math.cos(a) * (size + 10), ly = -Math.sin(a) * (size + 10) + 4;
        ctx.fillStyle = '#111';
        ctx.fillText(alert ? '!' : e.weapon && !WEAPONS[e.weapon].melee ? '•' : '', lx, ly - 10);
        ctx.fillText(e.boss ? 'BOSS' : `${Math.round(dist / T)}M`, lx, ly + 2);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // HP pips
    {
      ctx.textAlign = 'left';
      ctx.font = '14px Anton, Impact, sans-serif';
      ctx.fillStyle = '#111';
      const hpY = mobile ? 113 : ch - 96;
      ctx.fillText('HP', mobile ? 20 : 30, hpY);
      for (let i = 0; i < 3; i++) {
        const filled = pl.hp > i + 0.01;
        ctx.fillStyle = filled ? (pl.hp < 2 ? '#e0141e' : '#111') : 'rgba(17,17,17,0.18)';
        ctx.fillRect((mobile ? 46 : 56) + i * 16, hpY - 12, 12, 12);
      }
      if (pl.hp < 3 && pl.alive) {
        ctx.fillStyle = `rgba(224,20,30,${(3 - pl.hp) * 0.08 + Math.sin(t * 6) * 0.03})`;
        ctx.fillRect(0, 0, cw, 10); ctx.fillRect(0, ch - 10, cw, 10); ctx.fillRect(0, 0, 10, ch); ctx.fillRect(cw - 10, 0, 10, ch);
      }
    }

    // Touch uses a directional aim stick; hide the idle mouse crosshair.
    if (mobile && this.aimSource === 'touch' && !this.touch.aiming) return;
    // cursor
    const mx = this.mouse.x, my = this.mouse.y;
    if (pl.alive && pl.weapon === 'pistol' && this.headUnderCursor()) {
      const r = 7 + Math.sin(t * 20) * 1.5;
      ctx.strokeStyle = '#e0141e';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 3; ctx.moveTo(mx + Math.cos(a) * (r + 3), my + Math.sin(a) * (r + 3)); ctx.lineTo(mx + Math.cos(a) * (r + 10), my + Math.sin(a) * (r + 10)); }
      ctx.stroke();
      ctx.fillStyle = '#e0141e';
      ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '11px Anton, Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HEADSHOT', mx, my - r - 14);
      return;
    }
    const pulse = 9 + Math.sin(t * 10) * 2;
    ctx.strokeStyle = '#e0141e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mx, my, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx - pulse - 6, my); ctx.lineTo(mx - pulse + 3, my);
    ctx.moveTo(mx + pulse - 3, my); ctx.lineTo(mx + pulse + 6, my);
    ctx.moveTo(mx, my - pulse - 6); ctx.lineTo(mx, my - pulse + 3);
    ctx.moveTo(mx, my + pulse - 3); ctx.lineTo(mx, my + pulse + 6);
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
  }

  grade() {
    const perEnemy = this.score / Math.max(1, this.totalEnemies);
    const timeFactor = Math.max(0.6, 1.4 - this.levelTime / 150);
    const v = perEnemy * timeFactor;
    if (v > 2600) return 'S';
    if (v > 1600) return 'A';
    if (v > 1000) return 'B';
    if (v > 600) return 'C';
    return 'D';
  }
}
