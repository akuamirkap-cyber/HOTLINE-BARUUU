import assert from 'node:assert/strict';
import test from 'node:test';
import { Game } from '../src/game/engine';
import { SKINS, SKIN_LIST, type SkinId, setStoredSkin, getStoredSkin } from '../src/game/skins';

test('skin catalog includes superhot and stickman skins as requested', () => {
  assert.ok('superhot' in SKINS, 'superhot skin exists');
  assert.ok('stickman' in SKINS, 'stickman skin exists');
  assert.ok('neon_shapes' in SKINS, 'neon shapes skin exists');
  assert.ok('classic' in SKINS, 'classic skin exists');
  assert.ok(SKIN_LIST.length >= 4, 'at least 4 shape skins provided');
  assert.equal(SKINS.superhot.badge, 'POLYGON');
  assert.equal(SKINS.stickman.badge, 'STICK FIGURE');

  // Verify setStoredSkin
  setStoredSkin('stickman');
  assert.equal(getStoredSkin(), 'stickman');
});

function createGameFixture() {
  const game = Object.create(Game.prototype) as Game;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(_, name) {
      if (String(name).startsWith('create') && String(name).endsWith('Gradient')) return () => gradient;
      return () => {};
    },
    set() { return true; },
  }) as CanvasRenderingContext2D;

  Object.assign(game, {
    ctx, decalX: ctx, levelIndex: 0, time: 0,
    enemies: [], player: { x: 100, y: 100, angle: 0, weapon: 'pistol', r: 11 },
    hostage: null, focus: 1, focusActive: false, noSlowMo: false,
    kills: 0, totalEnemies: 5, levelTime: 12, maxCombo: 3, score: 1000,
    state: 'play', stateT: 1,
    grade: () => 'S',
    emitUI: () => {},
    lastUIAt: 0,
    cb: { onQuit() {}, onLevelComplete() {} },
  });
  return game;
}

test('switching skin on Game instance updates active skin and snapshot', () => {
  const game = createGameFixture();

  // Change to stickman
  game.setSkin('stickman');
  assert.equal(game.skin, 'stickman');
  let snapshot = game.getSnapshot();
  assert.equal(snapshot.skin, 'stickman');

  // Change to superhot
  game.setSkin('superhot');
  assert.equal(game.skin, 'superhot');
  snapshot = game.getSnapshot();
  assert.equal(snapshot.skin, 'superhot');
});

test('drawHuman executes without throwing across all skins for player and enemies', () => {
  const game = createGameFixture();
  const testSkins: SkinId[] = ['superhot', 'stickman', 'neon_shapes', 'classic', 'cyber_bot'];

  for (const s of testSkins) {
    game.setSkin(s);
    // Draw player with pistol
    assert.doesNotThrow(() => {
      game.drawHuman(100, 100, 0, false, 'pistol', 10, 0, Array(9).fill(1));
    }, `Player drawing works with skin: ${s}`);

    // Draw enemy with bat
    assert.doesNotThrow(() => {
      game.drawHuman(150, 100, Math.PI, true, 'bat', 20, 0.1, Array(9).fill(1));
    }, `Enemy drawing works with skin: ${s}`);

    // Draw downed enemy
    assert.doesNotThrow(() => {
      game.drawDowned({
        id: 1, x: 120, y: 120, downAngle: 0.5, vx: 10, vy: 5,
        launched: false, executing: false, hitFlash: 0,
      } as any);
    }, `Downed enemy drawing works with skin: ${s}`);
  }
});
