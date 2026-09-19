import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  resolveMove,
  resolveReceiver,
  rollDice
} from '../game-engine.mjs';
import { buildAnimationPositions } from '../game-ui.mjs';
import { getBoard } from '../game-data.mjs';

test('后退格只在最终停留后生效', () => {
  const board = {
    key: 'test',
    name: '测试',
    cells: [
      { text: '起点', type: 'start' },
      { text: '普通格', type: 'normal' },
      { text: '后进2格', type: 'special', backSteps: 2, jumpTo: null },
      { text: '普通格', type: 'normal' },
      { text: '终点', type: 'end' }
    ]
  };
  const state = createInitialState({ versionKey: 'test' });
  const result = resolveMove(state, 'player', 2, board);
  assert.equal(result.event.landedPosition, 2);
  assert.equal(result.event.finalPosition, 0);
  assert.equal(result.state.players[0].position, 0);
});

test('女仆版和SM版由player接收，男仆版由player2接收', () => {
  assert.equal(resolveReceiver('maid', 'player2'), 'player');
  assert.equal(resolveReceiver('sm', 'player'), 'player');
  assert.equal(resolveReceiver('butler', 'player'), 'player2');
});

test('掷骰结果始终在1到6之间', () => {
  const values = [0, 0.2, 0.5, 0.99].map(value => rollDice(() => value));
  assert.deepEqual(values, [1, 2, 4, 6]);
});

test('普通格会切换回合并保留事件文本', () => {
  const board = getBoard('love');
  const state = createInitialState({ versionKey: 'love' });
  const result = resolveMove(state, 'player', 1, board);
  assert.equal(result.state.players[0].position, 1);
  assert.equal(result.state.turn, 'player2');
  assert.equal(result.event.eventText, board.cells[1].text);
  assert.equal(result.event.status, 'playing');
});

test('到达终点后停止继续轮流', () => {
  const board = {
    key: 'test',
    name: '测试',
    cells: [{ text: '起点', type: 'start' }, { text: '终点', type: 'end' }]
  };
  const state = createInitialState({ versionKey: 'test' });
  const result = resolveMove(state, 'player', 6, board);
  assert.equal(result.state.status, 'finished');
  assert.equal(result.state.winner, 'player');
  assert.equal(result.state.turn, 'player');
  assert.equal(result.event.finalPosition, 1);
});

test('关闭后退规则时不会改变最终位置', () => {
  const board = {
    key: 'test',
    name: '测试',
    cells: [
      { text: '起点', type: 'start' },
      { text: '后进2格', type: 'special', backSteps: 2, jumpTo: null },
      { text: '终点', type: 'end' }
    ]
  };
  const state = createInitialState({
    versionKey: 'test',
    settings: { allowBackSteps: false }
  });
  const result = resolveMove(state, 'player', 1, board);
  assert.equal(result.event.finalPosition, 1);
  assert.equal(result.state.players[0].position, 1);
});

test('逐格动画包含前进到落点和特殊格后的每一步', () => {
  assert.deepEqual(buildAnimationPositions({ startPosition: 2, landedPosition: 5, finalPosition: 3 }), [3, 4, 5, 4, 3]);
});
