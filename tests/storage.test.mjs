import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadGame,
  loadSettings,
  saveCustomEvents,
  getCustomEvents,
  resetCustomEvents,
  saveGame,
  resetGame
} from '../storage.mjs';

function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key)
  };
}

test('读取旧flight_chess_progress并转换为统一状态', () => {
  const storage = fakeStorage({
    flight_chess_progress: JSON.stringify({ version: 'maid', playerPos: 4, aiPos: 2, turn: 'ai' })
  });
  const state = loadGame(storage);
  assert.equal(state.versionKey, 'maid');
  assert.equal(state.players[0].position, 4);
  assert.equal(state.players[1].position, 2);
  assert.equal(state.turn, 'player2');
});

test('保存和清除统一存档', () => {
  const storage = fakeStorage();
  const state = { schemaVersion: 2, versionKey: 'foreplay', players: [] };
  assert.equal(saveGame(state, storage), true);
  assert.ok(storage.getItem('flight_chess_game_v2'));
  resetGame(storage);
  assert.equal(storage.getItem('flight_chess_game_v2'), null);
});

test('损坏的JSON不会阻止页面启动', () => {
  const storage = fakeStorage({ flight_chess_game_v2: '{bad json' });
  assert.equal(loadGame(storage), null);
});

test('自定义事件按版本隔离并可恢复默认', () => {
  const storage = fakeStorage();
  saveCustomEvents('maid', ['起点', '自定义事件'], storage);
  assert.deepEqual(getCustomEvents('maid', storage), ['起点', '自定义事件']);
  assert.deepEqual(getCustomEvents('foreplay', storage), []);
  resetCustomEvents('maid', storage);
  assert.deepEqual(getCustomEvents('maid', storage), []);
});

test('没有设置时返回稳定默认值', () => {
  const settings = loadSettings(fakeStorage());
  assert.equal(settings.mode, 'light');
  assert.equal(settings.handoffOverlay, false);
  assert.equal(settings.rules.hideDice, false);
  assert.equal(settings.boardFontSize, 'standard');
  assert.equal(settings.players.length, 2);
});

test('保存的棋盘字体大小可以读取', () => {
  const storage = fakeStorage({
    flight_chess_settings_v2: JSON.stringify({ boardFontSize: 'large' })
  });
  assert.equal(loadSettings(storage).boardFontSize, 'large');
});
