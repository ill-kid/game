import { DEFAULT_VERSION, BOARDS, getBoard } from './game-data.mjs';
import {
  loadSettings,
  saveSettings,
  getCustomEvents,
  saveCustomEvents,
  resetCustomEvents
} from './storage.mjs';

function byId(document, id) {
  return document.getElementById(id);
}

function selectedVersion(document) {
  return byId(document, 'settingsVersion')?.value || DEFAULT_VERSION;
}

function renderEvents(document, versionKey, values) {
  const editor = byId(document, 'eventsEditor');
  if (!editor) return;
  editor.replaceChildren();
  const board = getBoard(versionKey);
  board.cells.forEach((cell, index) => {
    const row = document.createElement('label');
    row.className = 'event-editor-row';
    const number = document.createElement('span');
    number.textContent = index;
    const input = document.createElement('textarea');
    input.rows = 2;
    input.dataset.eventIndex = String(index);
    input.value = values[index] ?? cell.text;
    input.setAttribute('aria-label', `第${index}格事件`);
    row.append(number, input);
    editor.append(row);
  });
}

export function mountSettingsPage({ document, storage } = {}) {
  const targetDocument = document || window.document;
  const targetStorage = storage || window.localStorage;
  const settings = loadSettings(targetStorage);
  const handoff = byId(targetDocument, 'handoffOverlay');
  const playerOne = byId(targetDocument, 'playerOne');
  const playerTwo = byId(targetDocument, 'playerTwo');
  const playerOneColor = byId(targetDocument, 'playerOneColor');
  const playerTwoColor = byId(targetDocument, 'playerTwoColor');
  const allowBackSteps = byId(targetDocument, 'allowBackSteps');
  const allowJumps = byId(targetDocument, 'allowJumps');
  const allowPenaltyCells = byId(targetDocument, 'allowPenaltyCells');
  const versionSelect = byId(targetDocument, 'settingsVersion');

  if (handoff) handoff.checked = settings.handoffOverlay;
  if (playerOne) playerOne.value = settings.players[0].name;
  if (playerTwo) playerTwo.value = settings.players[1].name;
  if (playerOneColor) playerOneColor.value = settings.players[0].color;
  if (playerTwoColor) playerTwoColor.value = settings.players[1].color;
  if (allowBackSteps) allowBackSteps.checked = settings.rules.allowBackSteps;
  if (allowJumps) allowJumps.checked = settings.rules.allowJumps;
  if (allowPenaltyCells) allowPenaltyCells.checked = settings.rules.allowPenaltyCells;

  Object.entries(BOARDS).forEach(([key, board]) => {
    const option = targetDocument.createElement('option');
    option.value = key;
    option.textContent = `${board.name} · ${board.cells.length}格`;
    versionSelect?.append(option);
  });
  if (versionSelect) versionSelect.value = DEFAULT_VERSION;
  renderEvents(targetDocument, selectedVersion(targetDocument), getCustomEvents(selectedVersion(targetDocument), targetStorage));

  versionSelect?.addEventListener('change', () => {
    const version = selectedVersion(targetDocument);
    renderEvents(targetDocument, version, getCustomEvents(version, targetStorage));
  });

  const toast = message => {
    const element = byId(targetDocument, 'toast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), 1700);
  };

  byId(targetDocument, 'btnSaveSettings')?.addEventListener('click', () => {
    const nextSettings = {
      handoffOverlay: Boolean(handoff?.checked),
      players: [
        { name: playerOne?.value.trim() || '玩家一', color: playerOneColor?.value || '#C4787A' },
        { name: playerTwo?.value.trim() || '玩家二', color: playerTwoColor?.value || '#7A9E8E' }
      ],
      theme: 'warm',
      rules: {
        allowBackSteps: Boolean(allowBackSteps?.checked),
        allowJumps: Boolean(allowJumps?.checked),
        allowPenaltyCells: Boolean(allowPenaltyCells?.checked)
      }
    };
    const version = selectedVersion(targetDocument);
    const eventValues = [...targetDocument.querySelectorAll('[data-event-index]')].map(input => input.value);
    saveSettings(nextSettings, targetStorage);
    saveCustomEvents(version, eventValues, targetStorage);
    toast('设置已保存');
  });

  byId(targetDocument, 'btnResetEvents')?.addEventListener('click', () => {
    const version = selectedVersion(targetDocument);
    resetCustomEvents(version, targetStorage);
    renderEvents(targetDocument, version, []);
    toast('已恢复该版本默认事件');
  });

  byId(targetDocument, 'btnResetAll')?.addEventListener('click', () => {
    const version = selectedVersion(targetDocument);
    resetCustomEvents(version, targetStorage);
    renderEvents(targetDocument, version, []);
    toast('已恢复该版本默认事件');
  });

  return { renderEvents: () => renderEvents(targetDocument, selectedVersion(targetDocument), getCustomEvents(selectedVersion(targetDocument), targetStorage)) };
}
