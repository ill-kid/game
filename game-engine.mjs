import { DEFAULT_VERSION, getBoard } from './game-data.mjs';

export const DEFAULT_SETTINGS = Object.freeze({
  handoffOverlay: false,
  hideDice: false,
  allowBackSteps: true,
  allowJumps: true,
  allowPenaltyCells: true
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createInitialState(options = {}) {
  const suppliedPlayers = Array.isArray(options.players) ? options.players : [];
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(options.settings || {})
  };
  return {
    schemaVersion: 2,
    versionKey: options.versionKey || DEFAULT_VERSION,
    mode: 'light',
    players: [
      {
        id: 'player',
        name: suppliedPlayers[0]?.name || '玩家一',
        color: suppliedPlayers[0]?.color || '#C4787A',
        position: Number.isInteger(suppliedPlayers[0]?.position) ? suppliedPlayers[0].position : 0
      },
      {
        id: 'player2',
        name: suppliedPlayers[1]?.name || '玩家二',
        color: suppliedPlayers[1]?.color || '#7A9E8E',
        position: Number.isInteger(suppliedPlayers[1]?.position) ? suppliedPlayers[1].position : 0
      }
    ],
    turn: options.turn === 'player2' ? 'player2' : 'player',
    lastDice: Number.isInteger(options.lastDice) ? options.lastDice : null,
    lastEvent: options.lastEvent || null,
    status: options.status === 'finished' ? 'finished' : 'playing',
    winner: options.winner || null,
    customEvents: options.customEvents || {},
    updatedAt: Number.isFinite(options.updatedAt) ? options.updatedAt : Date.now(),
    settings
  };
}

export function rollDice(random = Math.random) {
  const value = Number(random());
  if (!Number.isFinite(value)) return 1;
  return Math.min(6, Math.max(1, Math.floor(value * 6) + 1));
}

export function resolveReceiver(boardKey, landerId) {
  if (boardKey === 'maid' || boardKey === 'sm') return 'player';
  if (boardKey === 'butler') return 'player2';
  return landerId === 'player2' ? 'player2' : 'player';
}

function nextTurn(playerId) {
  return playerId === 'player' ? 'player2' : 'player';
}

function getEventText(state, boardKey, position, fallback) {
  const custom = state.customEvents?.[boardKey];
  if (Array.isArray(custom) && typeof custom[position] === 'string') {
    return custom[position];
  }
  return fallback;
}

export function resolveMove(inputState, playerId, dice, board = getBoard(inputState.versionKey)) {
  const state = clone(inputState);
  const safeBoard = board?.cells?.length ? board : getBoard(state.versionKey);
  const player = state.players.find(item => item.id === playerId);
  if (!player || state.status === 'finished') {
    return { state, event: null };
  }

  const max = safeBoard.cells.length - 1;
  const safeDice = Math.min(6, Math.max(1, Math.floor(Number(dice) || 1)));
  const startPosition = Math.min(max, Math.max(0, player.position));
  const landedPosition = Math.min(startPosition + safeDice, max);
  const landedCell = safeBoard.cells[landedPosition] || { text: '', type: 'normal' };
  let finalPosition = landedPosition;
  let movementNote = '';

  if (landedPosition < max && state.settings.allowJumps !== false && Number.isInteger(landedCell.jumpTo)) {
    finalPosition = Math.min(max, Math.max(0, landedCell.jumpTo));
    movementNote = `（已退回到第${finalPosition}格）`;
  } else if (landedPosition < max && state.settings.allowBackSteps !== false && landedCell.backSteps > 0) {
    finalPosition = Math.max(0, landedPosition - landedCell.backSteps);
    movementNote = `（已后退${landedCell.backSteps}格，现位于第${finalPosition}格）`;
  }

  player.position = finalPosition;
  state.lastDice = safeDice;
  state.updatedAt = Date.now();
  const eventText = getEventText(state, safeBoard.key || state.versionKey, landedPosition, landedCell.text || '本格无事件');
  const receiver = resolveReceiver(safeBoard.key || state.versionKey, playerId);
  const finished = finalPosition >= max;
  state.status = finished ? 'finished' : 'playing';
  state.winner = finished ? playerId : null;
  state.turn = finished ? playerId : nextTurn(playerId);

  const event = {
    dice: safeDice,
    startPosition,
    landedPosition,
    finalPosition,
    lander: playerId,
    receiver,
    cellText: eventText,
    eventText: `${eventText}${movementNote}`,
    roundsLeft: 2,
    status: state.status
  };
  state.lastEvent = event;
  return { state, event };
}
