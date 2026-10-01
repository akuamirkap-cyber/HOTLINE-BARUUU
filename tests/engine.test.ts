import assert from 'node:assert/strict';
import test from 'node:test';
import { Game, T } from '../src/game/engine';
import { LEVELS } from '../src/game/levels';
import { isTouchDevice } from '../src/game/mobile';
import { sfx } from '../src/game/audio';

// Physics tests don't need a browser or an audio device. Audio is tested in
// the browser smoke checks; all production combat methods still run here.
for (const key of Object.keys(sfx) as (keyof typeof sfx)[]) Object.assign(sfx, { [key]: () => {} });

function canvasContext() {
  const calls: { name: string; args: unknown[] }[] = [];
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, {
    get(_, name) {
      if (String(name).startsWith('create') && String(name).endsWith('Gradient')) return () => gradient;
      return (...args: unknown[]) => { calls.push({ name: String(name), args }); };
    },
    set() { return true; },
  }) as CanvasRenderingContext2D;
  return { context, calls };
}

function fixture() {
  const game = Object.create(Game.prototype) as Game;
  const ctx = canvasContext().context;
  const width = 24, height = 14;
  Object.assign(game, {
    ctx, decalX: ctx, levelIndex: 0, nextId: 1, w: width, h: height,
    tiles: Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : '.')),
    enemies: [], pickups: [], particles: [], shards: [], texts: [], bullets: [], trails: [], ghosts: [], halves: [], casings: [], doors: [], lights: [],
    keys: new Set(), mouse: { x: 620, y: 300, down: false, pressed: false, right: false },
    touch: { enabled: false, moveX: 0, moveY: 0, aimX: 0, aimY: 0, aiming: false, angle: 0, focus: false },
    state: 'play', prevState: 'play', stateT: 0, totalEnemies: 2, time: 0,
    score: 0, combo: 0, comboT: 0, kills: 0, maxCombo: 0, focus: 1, focusActive: false, focusHeld: false,
    shake: 0, hitstop: 0, slowmo: 0, whiteFlash: 0, redFlash: 0, hostage: null,
    spacePressed: false, kickPressed: false, kickBuffer: 0, suspended: false,
    cam: { x: 160, y: 160, zoom: 2, rot: 0 }, camKick: { x: 0, y: 0 }, zp: 1, cw: 800, ch: 600,
    cb: { onQuit() {}, onLevelComplete() {} },
  });
  game.player = {
    x: 160, y: 160, angle: 0, r: 11, vx: 0, vy: 0, moveSpeed: 0,
    weapon: 'bat', ammo: 0, cd: 0, alive: true, attackAnim: 0, walkT: 0, muzzle: 0, exec: null,
    dashT: 0, dashCd: 0, dashX: 0, dashY: 0, ghostT: 0, comboStep: 0, comboWin: 0, punchSide: 1, hitCount: 0, hitCountT: 0,
    kickCd: 0, kickAnim: 0, lungeT: 0, lungeX: 0, lungeY: 0, recoil: 0,
    hp: 3, hpT: 0, hurtT: 0, swing: null, meleeStep: 0, meleeWin: 0,
  };
  return game;
}

function enemy(game: Game, x = 200, y = 160) {
  const target = game.makeEnemy(x, y, Math.PI, 'bat', 'idle');
  game.enemies.push(target);
  return target;
}

test('first baseball hit launches only the struck enemy and is non-lethal', () => {
  const game = fixture();
  const target = enemy(game);
  const next = enemy(game, 270);
  game.playerMelee();
  assert.ok(game.enemies.includes(target));
  assert.equal(target.state, 'down');
  assert.equal(target.batHits, 1);
  assert.equal(target.launched, true);
  assert.equal(target.doomed, false);
  assert.equal(next.state, 'idle');
  game.updateLaunched(target, 1 / 60);
  assert.equal(next.state, 'idle', 'no instant collateral hit when the bat swings');
  for (let frame = 0; frame < 12; frame++) game.updateLaunched(target, 1 / 60);
  assert.equal(next.state, 'down', 'the travelling body eventually contacts the other enemy');
  assert.equal(next.launched, true);
  assert.equal(target.launchHits.has(next.id), true);
  assert.equal(next.batHits, 0, 'a body collision is not a second baseball strike');
});

test('baseball can hit a downed enemy a second time and shatter it', () => {
  const game = fixture();
  const target = enemy(game);
  game.playerMelee();
  game.playerMelee();
  assert.equal(target.batHits, 2);
  assert.equal(game.enemies.includes(target), false);
  assert.equal(game.kills, 1);
});

test('a first-hit victim lands alive instead of shattering when velocity decays', () => {
  const game = fixture();
  const target = enemy(game);
  game.playerMelee();
  for (let frame = 0; frame < 240 && target.launched; frame++) game.updateLaunched(target, 1 / 60);
  assert.ok(game.enemies.includes(target));
  assert.equal(target.launched, false);
  assert.equal(game.kills, 0);
});

test('real wall impact shatters a launched victim', () => {
  const game = fixture();
  game.tiles[5][9] = '#';
  const target = enemy(game);
  game.playerMelee();
  for (let frame = 0; frame < 60 && game.enemies.includes(target); frame++) game.updateLaunched(target, 1 / 60);
  assert.equal(game.enemies.includes(target), false);
  assert.equal(game.kills, 1);
});

test('furniture collision is not a lethal wall splat', () => {
  const game = fixture();
  game.tiles[5][9] = 'T';
  const target = enemy(game);
  game.playerMelee();
  for (let frame = 0; frame < 100 && target.launched; frame++) game.updateLaunched(target, 1 / 60);
  assert.ok(game.enemies.includes(target));
  assert.equal(game.kills, 0);
});

test('a launched body does not hit someone behind its travel direction', () => {
  const game = fixture();
  const target = enemy(game);
  game.playerMelee();
  const behind = enemy(game, target.x - 12);
  for (let frame = 0; frame < 4; frame++) game.updateLaunched(target, 1 / 60);
  assert.equal(behind.state, 'idle');
});

test('touch movement is analog and aim holds the last facing after release', () => {
  const game = fixture();
  game.player.weapon = null;
  game.setTouchControls(true);
  game.setTouchMove(0.5, 0);
  for (let frame = 0; frame < 45; frame++) game.updatePlayer(1 / 60);
  assert.ok(game.player.x > 190);
  assert.ok(game.player.moveSpeed < 120, 'partial stick deflection is slower than full WASD');
  game.setTouchAim(0, -1);
  game.updatePlayer(1 / 60);
  assert.equal(game.player.angle, -Math.PI / 2);
  game.setTouchAim(0, 0);
  game.updatePlayer(1 / 60);
  assert.equal(game.player.angle, -Math.PI / 2);
});

test('right joystick repeatedly fires a semi-automatic pistol without tapping', () => {
  const game = fixture();
  game.player.weapon = 'pistol'; game.player.ammo = 12;
  const shots: string[] = [];
  game.fire = (_x, _y, _angle, weapon) => { shots.push(weapon); };
  game.setTouchControls(true);
  game.setTouchAim(1, 0);
  for (let frame = 0; frame < 10; frame++) game.updatePlayer(0.1);
  assert.ok(shots.length >= 4);
  assert.equal(game.player.ammo, 12 - shots.length);
  game.setTouchAim(0, 0);
  const count = shots.length;
  game.updatePlayer(0.3);
  assert.equal(shots.length, count);
});

test('pause, rotation suspension and hiding mobile controls clear held inputs', () => {
  const game = fixture();
  game.setTouchControls(true); game.setTouchMove(1, 0); game.setTouchAim(0, 1); game.setTouchFocus(true);
  game.togglePause();
  assert.equal(game.state, 'paused');
  assert.equal(game.touch.moveX, 0); assert.equal(game.touch.aiming, false); assert.equal(game.touch.focus, false);
  game.togglePause();
  assert.equal(game.state, 'play');
  game.setSuspended(true);
  game.setTouchMove(1, 0); game.setTouchAim(1, 0); game.pressTouchAction('action');
  assert.equal(game.touch.moveX, 0); assert.equal(game.touch.aiming, false); assert.equal(game.spacePressed, false);
  game.setSuspended(false); game.setTouchMove(1, 0); game.setTouchFocus(true); game.setTouchControls(false);
  assert.equal(game.touch.moveX, 0); assert.equal(game.touch.focus, false);
});

test('only solid walls block line of sight; glass and furniture do not', () => {
  const game = fixture();
  for (const tile of ['G', 'T', '#']) {
    game.tiles[5][9] = tile;
    assert.equal(game.los(200, 176, 350, 176), tile !== '#');
  }
});

test('boss rifle bullets kill a full-health player in one hit', () => {
  const game = fixture();
  const boss = enemy(game, 350); boss.boss = true; boss.weapon = 'rifle';
  game.fire(boss.x, boss.y, Math.PI, 'rifle', boss.id, 0.35);
  assert.equal(game.bullets[0].dmg, undefined, 'rifle does not use pistol body-shot damage');
  for (let frame = 0; frame < 15 && game.player.alive; frame++) game.updateBullets(1 / 60);
  assert.equal(game.player.alive, false);
  assert.equal(game.state, 'dead');
});

test('boss fires accurate automatic bursts, but never through solid cover', () => {
  const game = fixture();
  const boss = enemy(game, 350); boss.boss = true; boss.weapon = 'rifle'; boss.state = 'alert'; boss.react = 0;
  const shots: number[] = [];
  game.fire = (_x, _y, _angle, weapon, _owner, spread) => { assert.equal(weapon, 'rifle'); shots.push(spread!); };
  for (let frame = 0; frame < 90; frame++) { boss.cd -= 1 / 60; game.updateBoss(boss, 1 / 60); }
  assert.ok(shots.length >= 6);
  assert.ok(shots.every((spread) => spread === 0.35));
  game.tiles[5][8] = '#'; game.tiles[4][8] = '#'; game.tiles[6][8] = '#';
  boss.x = 350; boss.y = 160; boss.cd = 0;
  const before = shots.length;
  game.updateBoss(boss, 1 / 60);
  assert.equal(shots.length, before);
});

test('rooftop has one boss, risky sniper, central katana, entry shotgun and reachable pickups', () => {
  const roof = LEVELS[LEVELS.length - 1];
  assert.equal(roof.environment, 'rooftop'); assert.equal(roof.starterLoadout, false);
  assert.equal(new Set(roof.map.map((row) => row.length)).size, 1);
  for (const marker of ['P', 'E', 'B', 'Z', 'K', '2']) assert.equal(roof.map.join('').split(marker).length - 1, 1, marker);
  const game = fixture(); game.tiles = roof.map.map((row) => [...row]); game.w = roof.map[0].length; game.h = roof.map.length;
  const marker = (token: string) => {
    const y = roof.map.findIndex((row) => row.includes(token));
    return { x: roof.map[y].indexOf(token) * T + T / 2, y: y * T + T / 2 };
  };
  const start = marker('P');
  for (const token of ['Z', 'K', '2', 'B', 'E']) {
    const spot = marker(token);
    assert.ok(game.findPath(start.x, start.y, spot.x, spot.y), `${token} reachable from the entry bay`);
  }
  const boss = marker('B'), sniper = marker('Z');
  assert.equal(game.los(boss.x, boss.y, sniper.x, sniper.y), true, 'sniper lies in an exposed firing lane');
  assert.equal(game.los(boss.x, boss.y, start.x, start.y), false, 'entry bay protects the spawn');
});

test('hand palms are oval and scaled to 66%, with a separate thumb and folds', () => {
  const game = fixture();
  const { context, calls } = canvasContext();
  game.drawHand(context, 0, 0, 4, 0, '#e3261d', '#ff7165');
  const ellipses = calls.filter((call) => call.name === 'ellipse');
  assert.equal(ellipses.length, 3, 'thumb, palm, soft highlight');
  assert.equal(ellipses[1].args[2], 4 * 0.66 * 1.2);
  assert.equal(ellipses[1].args[3], 4 * 0.66 * 0.78);
  assert.ok(calls.filter((call) => call.name === 'quadraticCurveTo').length >= 4, 'three knuckle folds plus thumb crease');
});

test('all standing poses use drawHand and legs stay under the torso', () => {
  const game = fixture();
  const hands: number[][] = [], limbs: number[][] = [];
  game.drawHand = (_ctx, x, y, r) => { hands.push([x, y, r]); };
  game.drawLimb = (_ctx, x1, y1, x2, y2, width) => { limbs.push([x1, y1, x2, y2, width]); };
  for (const pose of [
    { weapon: null, options: {} }, { weapon: 'pistol', options: {} }, { weapon: 'rifle', options: {} },
    { weapon: 'bat', options: {} }, { weapon: 'knife', options: {} }, { weapon: 'katana', options: {} },
    { weapon: null, options: { held: true } }, { weapon: null, options: { stagger: 0.2 } },
    { weapon: 'rifle', options: { hurt: 0.2 } },
  ] as const) {
    hands.length = 0; limbs.length = 0;
    game.drawHuman(100, 100, 0, true, pose.weapon, 0, 0, Array(9).fill(1), 0, 0, pose.options);
    assert.equal(hands.length, 2, `${pose.weapon || 'unarmed'} pose has two structured hands`);
    assert.equal(limbs[0][0], -1, 'hip is centered at x=-1');
    assert.equal(limbs[1][2], -6, 'standing foot ends at x=-6');
    assert.ok(limbs.some((limb) => limb[4] >= 6.2), 'athletic upper arms');
  }
});

test('leaving a completed mission persists its result once, including the final boss floor', () => {
  const game = fixture();
  game.state = 'complete'; game.stateT = 4; game.levelIndex = LEVELS.length - 1; game.score = 7500;
  let saved = 0, exited = 0;
  game.cb = { onQuit() { exited++; }, onLevelComplete(level, score) { assert.equal(level, LEVELS.length - 1); assert.equal(score, 7500); saved++; } };
  game.quit(); game.quit();
  assert.equal(saved, 1); assert.equal(exited, 2);
});

test('a baseball-launched victim still shatters on a late, slower wall impact', () => {
  const game = fixture();
  const target = enemy(game, 275, 176);
  game.tiles[5][9] = '#';
  game.knockdown(target, 1, 0, 0, 720);
  target.batHits = 1; target.vx = 100;
  for (let frame = 0; frame < 10 && game.enemies.includes(target); frame++) game.updateLaunched(target, 1 / 60);
  assert.equal(game.enemies.includes(target), false);
});

test('the first bat hit in a finisher animation is still non-lethal', () => {
  const game = fixture();
  const target = enemy(game);
  game.player.meleeWin = 0.5; game.player.meleeStep = 2;
  game.playerMelee();
  assert.equal(target.batHits, 1); assert.equal(target.doomed, false); assert.equal(target.launched, true);
  assert.ok(game.enemies.includes(target));
});

test('katana still cuts in two and a knife retains its direct lethal hit', () => {
  const swordGame = fixture(); const swordTarget = enemy(swordGame);
  swordGame.player.weapon = 'katana'; swordGame.playerMelee();
  assert.equal(swordGame.enemies.includes(swordTarget), false); assert.equal(swordGame.halves.length, 2);
  const knifeGame = fixture(); const knifeTarget = enemy(knifeGame);
  knifeGame.player.weapon = 'knife'; knifeGame.playerMelee();
  assert.equal(knifeGame.enemies.includes(knifeTarget), false); assert.equal(knifeGame.kills, 1);
});

test('a boss bullet hits solid cover rather than the player behind it', () => {
  const game = fixture();
  const boss = enemy(game, 350, 176); boss.boss = true; boss.weapon = 'rifle';
  game.player.y = 176; game.tiles[5][8] = '#';
  game.fire(boss.x, boss.y, Math.PI, 'rifle', boss.id, 0);
  for (let frame = 0; frame < 20 && game.bullets.length; frame++) game.updateBullets(1 / 60);
  assert.equal(game.bullets.length, 0); assert.equal(game.player.alive, true); assert.equal(game.player.hp, 3);
});

test('the original four-hit unarmed combo still ends in a launching kick', () => {
  const game = fixture(); const target = enemy(game);
  game.player.weapon = null;
  for (let hit = 0; hit < 3; hit++) { game.playerFist(); assert.ok(game.enemies.includes(target)); }
  game.playerFist();
  assert.equal(target.state, 'down'); assert.equal(target.launched, true); assert.equal(target.batHits, 0);
});


test('phones and desktop-UA iPads auto-enable, but mouse-first touchscreen PCs stay opt-in', () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    for (const device of [
      { points: 0, coarse: false, agent: 'Chrome Windows', platform: 'Win32', enabled: false },
      { points: 5, coarse: true, agent: 'Chrome Android Mobile', platform: 'Linux', enabled: true },
      { points: 5, coarse: false, agent: 'Safari Macintosh', platform: 'MacIntel', enabled: true },
      { points: 5, coarse: false, agent: 'Chrome Windows', platform: 'Win32', enabled: false },
    ]) {
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { maxTouchPoints: device.points, userAgent: device.agent, platform: device.platform } });
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: () => ({ matches: device.coarse }) } });
      assert.equal(isTouchDevice(), device.enabled, device.agent);
    }
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('bullets hit doors and do not penetrate closed doors', () => {
  const game = fixture();
  // Place a vertical door between player and target
  game.doors.push({ hx: 200, hy: 140, closed: Math.PI / 2, angle: Math.PI / 2, av: 0, pushT: 9, pusher: 'enemy' });
  // Fire a bullet towards x = 240
  game.bullets.push({
    x: 170, y: 155, sx: 170, sy: 155,
    vx: 1000, vy: 0, owner: 0, life: 1.0, hitIds: new Set(),
  });
  // Update bullets through the door position
  for (let frame = 0; frame < 10 && game.bullets.length; frame++) game.updateBullets(1 / 60);
  assert.equal(game.bullets.length, 0, 'bullet stopped by door');
});

test('big boss takes chip damage from regular guns but dies in 1 hit to sniper and pistol headshot', () => {
  // Test chip damage:
  const game = fixture();
  const boss = enemy(game, 220, 160);
  boss.boss = true; boss.hp = 11; boss.maxHp = 11;
  // Fire a rifle bullet at boss
  game.bullets.push({
    x: 200, y: 160, sx: 160, sy: 160,
    vx: 1000, vy: 0, owner: 0, life: 1.0, hitIds: new Set(), weapon: 'rifle',
  });
  game.updateBullets(1 / 60);
  assert.ok(game.enemies.includes(boss), 'boss survived regular shot');
  assert.ok(boss.hp < 11 && boss.hp > 8, 'boss took chip damage');

  // Test 1-shot kill with sniper:
  const game2 = fixture();
  const boss2 = enemy(game2, 220, 160);
  boss2.boss = true; boss2.hp = 11; boss2.maxHp = 11;
  game2.bullets.push({
    x: 200, y: 160, sx: 160, sy: 160,
    vx: 2000, vy: 0, owner: 0, life: 1.0, pierce: true, hitIds: new Set(), weapon: 'sniper',
  });
  game2.updateBullets(1 / 60);
  assert.ok(!game2.enemies.includes(boss2), 'boss instantly killed by 1 sniper shot');

  // Test 1-shot kill with pistol headshot:
  const game3 = fixture();
  const boss3 = enemy(game3, 220, 160);
  boss3.boss = true; boss3.hp = 11; boss3.maxHp = 11;
  game3.bullets.push({
    x: 200, y: 160, sx: 160, sy: 160,
    vx: 1000, vy: 0, owner: 0, life: 1.0, dmg: 1, head: boss3.id, hitIds: new Set(), weapon: 'pistol',
  });
  game3.updateBullets(1 / 60);
  assert.ok(!game3.enemies.includes(boss3), 'boss instantly killed by pistol headshot');
});

test('buffered combat inputs trigger smoothly when cooldown clears', () => {
  const game = fixture();
  game.player.dashCd = 0.05;
  game.dashBuffer = 0.18;
  // Update player by 0.06s so cooldown clears
  game.updatePlayer(0.06);
  assert.ok(game.player.dashT > 0, 'buffered dash triggered');
  assert.equal(game.dashBuffer, 0, 'dash buffer consumed');
});

test('nunchaku executes a 4-hit combo chain culminating in a 360 degree cyclone finisher', () => {
  const game = fixture();
  game.player.weapon = 'nunchaku';

  // Hit 0
  game.playerMelee();
  assert.equal(game.player.meleeStep, 1);
  assert.equal(game.player.swing?.spin, false);

  // Hit 1
  game.player.meleeWin = 0.5;
  game.playerMelee();
  assert.equal(game.player.meleeStep, 2);

  // Hit 2
  game.player.meleeWin = 0.5;
  game.playerMelee();
  assert.equal(game.player.meleeStep, 3);

  // Hit 3: Finisher (360 Cyclone) strikes target and launches it!
  const target = enemy(game, 195, 160);
  game.player.meleeWin = 0.5;
  game.playerMelee();
  assert.equal(game.player.meleeStep, 0); // resets chain
  assert.equal(game.player.swing?.spin, true, 'finisher is a 360 spin cyclone');
  assert.ok(target.launched, 'target is launched by cyclone');
  assert.equal(target.doomed, true);
});

test('nunchaku swing deflects incoming enemy bullets back toward crosshair', () => {
  const game = fixture();
  game.player.weapon = 'nunchaku';
  game.player.attackAnim = 0.15;
  game.player.angle = 0; // facing right

  // Enemy bullet flying left toward player
  game.bullets.push({
    x: 185, y: 160, sx: 300, sy: 160,
    vx: -900, vy: 0, owner: 2, life: 0.8,
  });

  game.updateBullets(1 / 60);

  assert.equal(game.bullets.length, 1);
  const deflected = game.bullets[0];
  assert.equal(deflected.owner, 0, 'deflected bullet now belongs to player');
  assert.ok(deflected.vx > 0, 'bullet velocity reversed away from player');
  assert.equal(deflected.dodged, true);
  assert.ok(game.score > 0, 'score awarded for successful deflection');
  assert.ok(game.particles.some((p) => p.kind === 'spark'), 'sparks generated on deflection');
});

test('thrown nunchaku flies with high spin and knocks out enemies on impact', () => {
  const game = fixture();
  const target = enemy(game, 240, 160);

  game.pickups.push({
    x: 230, y: 160, vx: 900, vy: 0,
    angle: 0, spin: 45, type: 'nunchaku', ammo: 0,
    thrown: true, hit: new Set(),
  });

  game.updatePickups(1 / 60);

  assert.equal(target.state, 'down');
  assert.equal(target.launched, true);
  assert.equal(target.doomed, true);
});

test('enemies do not know player position behind closed doors and investigate doorway with tactical caution', () => {
  const game = fixture();
  // Build a separating wall between Room A (left, cols 1-7) and Room B (right, cols 9-22)
  for (let y = 1; y < game.h - 1; y++) {
    if (y !== 5) game.tiles[y][8] = '#';
  }
  // Place closed vertical door at col 8, row 5
  const doorX = 8 * T, doorY = 5 * T + T / 2;
  game.doors.push({
    hx: doorX, hy: 5 * T, closed: Math.PI / 2, angle: Math.PI / 2, av: 0, pushT: 9, pusher: 'enemy',
  });

  // Guard in Room A
  const guard = enemy(game, 4 * T, 5 * T + T / 2);
  guard.state = 'idle';

  // Player hidden in Room B making noise
  game.player.x = 16 * T; game.player.y = 5 * T + T / 2;
  assert.equal(game.canSee(guard), false, 'closed door and wall block sight into Room B');

  game.noise(game.player.x, game.player.y, 600);

  assert.equal(guard.state, 'search');
  // Guard targets the closed doorway, NOT the hidden player's secret coordinates behind the door!
  assert.equal(guard.lastX, doorX, 'guard investigates the doorway rather than x-ray wallhacking');

  // As guard approaches closed door, guard pauses with caution before breaching
  guard.x = doorX - 25; guard.y = 5 * T + T / 2;
  game.updateEnemies(1 / 60);
  assert.ok(guard.doorPause !== undefined, 'guard tactically pauses to check door');

  // Once pause elapses, guard aggressively breaches/kicks the door ("NEKAT")
  guard.doorPause = 0;
  game.updateEnemies(1 / 60);
  const dr = game.doors[0];
  assert.ok(Math.abs(dr.av) >= 10, 'door kicked open forcefully');
});


