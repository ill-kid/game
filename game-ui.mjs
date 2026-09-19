import { createInitialState, resolveMove, rollDice } from './game-engine.mjs';
import { DEFAULT_VERSION, getBoard } from './game-data.mjs';
import { loadGame, loadSettings, saveGame, getCustomEvents } from './storage.mjs';

function getQueryVersion() {
  if (typeof window === 'undefined') return DEFAULT_VERSION;
  return new URLSearchParams(window.location.search).get('version') || DEFAULT_VERSION;
}

function isNewGameRequest() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('new') === '1';
}

function getPlayer(state, id) {
  return state.players.find(player => player.id === id) || state.players[0];
}

function createElement(document, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

export function renderGameState(state, board, document, options = {}) {
  const root = document.querySelector('.game-shell');
  const path = document.getElementById('boardPath');
  const turnText = document.getElementById('turnText');
  const diceFace = document.getElementById('diceFace');
  const eventPanel = document.getElementById('eventPanel');
  if (!root || !path || !turnText || !diceFace || !eventPanel) return;

  root.dataset.mode = 'light';
  root.style.setProperty('--player-color', getPlayer(state, 'player').color);
  root.style.setProperty('--player2-color', getPlayer(state, 'player2').color);
  const boardName = document.getElementById('boardName');
  const cellCount = document.getElementById('cellCount');
  if (boardName) boardName.textContent = board.name;
  if (cellCount) cellCount.textContent = `${board.cells.length}格`;

  path.replaceChildren();
  const positions = new Map();
  state.players.forEach(player => positions.set(player.position, [...(positions.get(player.position) || []), player]));
  board.cells.forEach((cell, index) => {
    const cellElement = createElement(document, 'div', `cell ${cell.type || 'normal'}`);
    cellElement.setAttribute('aria-label', `第${index}格：${cell.text}`);
    const number = createElement(document, 'span', 'num', index);
    const label = createElement(document, 'span', '', cell.text);
    cellElement.append(number, label);
    (positions.get(index) || []).forEach(player => {
      const piece = createElement(document, 'span', `piece ${player.id}`);
      piece.title = player.name;
      piece.setAttribute('aria-label', player.name);
      cellElement.append(piece);
    });
    path.append(cellElement);
  });

  const currentPlayer = getPlayer(state, state.turn);
  const winner = state.winner ? getPlayer(state, state.winner) : null;
  turnText.replaceChildren();
  const turnLabel = createElement(document, 'span', '', state.status === 'finished' ? '本局结束' : '当前回合');
  const turnName = createElement(document, 'strong', '', winner ? `${winner.name} 获胜` : currentPlayer.name);
  turnText.append(turnLabel, turnName);
  diceFace.textContent = state.lastDice || '-';

  const playerPills = document.getElementById('playerPills');
  if (playerPills) {
    playerPills.replaceChildren();
    state.players.forEach(player => {
      const pill = createElement(document, 'span', 'player-pill');
      const dot = createElement(document, 'span', 'player-dot');
      dot.style.setProperty('--dot-color', player.color);
      pill.append(dot, createElement(document, 'span', '', `${player.name} · ${player.position}`));
      playerPills.append(pill);
    });
  }

  const revealed = options.revealed !== false;
  eventPanel.replaceChildren();
  if (!state.lastEvent || !revealed) {
    eventPanel.className = 'event-panel empty';
    eventPanel.append(createElement(document, 'p', '', state.status === 'finished' ? '可以重新开始下一局。' : '掷骰后，这里会显示停留格的事件。'));
  } else {
    eventPanel.className = 'event-panel';
    const event = state.lastEvent;
    const meta = createElement(document, 'div', 'event-meta');
    meta.append(
      createElement(document, 'span', '', `${getPlayer(state, event.lander).name} · ${event.landedPosition}格`),
      createElement(document, 'span', '', `由${getPlayer(state, event.receiver).name}接受`)
    );
    eventPanel.append(meta, createElement(document, 'h2', '', event.status === 'finished' ? '终点事件' : '本回合事件'), createElement(document, 'p', '', event.eventText));
    if (state.status !== 'finished') {
      const nextButton = createElement(document, 'button', 'secondary-button', '进入下一回合');
      nextButton.type = 'button';
      nextButton.dataset.action = 'next-turn';
      eventPanel.append(nextButton);
    }
  }

  const rollButton = document.getElementById('btnRoll');
  if (rollButton) rollButton.disabled = state.status === 'finished' || Boolean(options.busy);
}

export function showHandoffOverlay(document, playerName) {
  const overlay = document.getElementById('handoffOverlay');
  const text = document.getElementById('handoffText');
  if (!overlay) return;
  if (text) text.textContent = `${playerName}，准备好后继续。`;
  overlay.hidden = false;
  document.getElementById('btnHandoff')?.focus();
}

export function hideHandoffOverlay(document) {
  const overlay = document.getElementById('handoffOverlay');
  if (overlay) overlay.hidden = true;
}

export function mountGamePage({ document, storage } = {}) {
  const targetDocument = document || window.document;
  const targetStorage = storage || window.localStorage;
  const saved = isNewGameRequest() ? null : loadGame(targetStorage);
  const settings = loadSettings(targetStorage);
  let state = saved || createInitialState({
    versionKey: getQueryVersion(),
    players: settings.players,
    settings: { ...settings.rules, handoffOverlay: settings.handoffOverlay },
    customEvents: {}
  });
  const board = getBoard(state.versionKey);
  state.customEvents = { [board.key]: getCustomEvents(board.key, targetStorage) };
  let busy = false;
  let revealed = true;
  let toastTimer = null;

  const toast = message => {
    const element = targetDocument.getElementById('toast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 1800);
  };

  const render = () => {
    renderGameState(state, board, targetDocument, { busy, revealed });
    const float = window.FlightFloat;
    if (float) float.setPosText(`${getPlayer(state, 'player').position} · ${getPlayer(state, 'player2').position}`);
  };

  const advanceAfterEvent = () => {
    if (state.status === 'finished') return;
    state.lastEvent = null;
    saveGame(state, targetStorage);
    revealed = false;
    render();
    if (state.settings.handoffOverlay) {
      showHandoffOverlay(targetDocument, getPlayer(state, state.turn).name);
    } else {
      revealed = true;
      render();
    }
  };

  const onRoll = () => {
    if (busy || state.status === 'finished') return;
    busy = true;
    render();
    const current = state.turn;
    const dice = rollDice();
    const result = resolveMove(state, current, dice, board);
    state = result.state;
    saveGame(state, targetStorage);
    busy = false;
    revealed = true;
    render();
    if (result.event?.status === 'finished') toast(`${getPlayer(state, current).name} 到达终点`);
  };

  const onClick = event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'next-turn') advanceAfterEvent();
  };

  targetDocument.getElementById('btnRoll')?.addEventListener('click', onRoll);
  targetDocument.addEventListener('click', onClick);
  targetDocument.getElementById('btnHandoff')?.addEventListener('click', () => {
    hideHandoffOverlay(targetDocument);
    revealed = true;
    render();
  });
  targetDocument.getElementById('btnRestart')?.addEventListener('click', () => {
    state = createInitialState({
      versionKey: board.key,
      players: settings.players,
      settings: { ...settings.rules, handoffOverlay: settings.handoffOverlay },
      customEvents: state.customEvents
    });
    saveGame(state, targetStorage);
    revealed = true;
    render();
  });

  render();
  return { render, getState: () => state, destroy: () => clearTimeout(toastTimer) };
}
