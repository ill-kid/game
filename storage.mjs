import { createInitialState, DEFAULT_SETTINGS } from './game-engine.mjs';

export const STORAGE_KEY = 'flight_chess_game_v2';
export const SETTINGS_KEY = 'flight_chess_settings_v2';
export const CUSTOM_EVENTS_PREFIX = 'flight_chess_custom_events_v2:';
const LEGACY_KEYS = ['flight_chess_progress', 'flight_chess_player'];

function getStorage(storage) {
  return storage || (typeof window !== 'undefined' ? window.localStorage : null);
}

function parseJson(storage, key) {
  try {
    const raw = getStorage(storage)?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeState(value) {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value.players)) {
    return createInitialState({
      ...value,
      versionKey: value.versionKey || value.version,
      players: value.players,
      settings: value.settings,
      status: value.status || (value.finished ? 'finished' : 'playing')
    });
  }
  if (value.version || Number.isInteger(value.playerPos) || Number.isInteger(value.aiPos)) {
    return createInitialState({
      versionKey: value.version,
      players: [
        { name: '玩家一', position: Number(value.playerPos) || 0, color: '#C4787A' },
        { name: '玩家二', position: Number(value.aiPos) || 0, color: '#7A9E8E' }
      ],
      turn: value.turn === 'ai' || value.turn === 'player2' ? 'player2' : 'player',
      status: value.finished ? 'finished' : 'playing',
      winner: value.winner || null,
      lastEvent: value.lastEvent || null
    });
  }
  return null;
}

export function loadGame(storage) {
  const target = getStorage(storage);
  if (!target) return null;
  const current = normalizeState(parseJson(target, STORAGE_KEY));
  if (current) return current;
  for (const key of LEGACY_KEYS) {
    const legacy = normalizeState(parseJson(target, key));
    if (legacy) return legacy;
  }
  return null;
}

export function saveGame(state, storage) {
  const target = getStorage(storage);
  if (!target) return false;
  try {
    target.setItem(STORAGE_KEY, JSON.stringify({ ...state, schemaVersion: 2, updatedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function loadSettings(storage) {
  const parsed = parseJson(getStorage(storage), SETTINGS_KEY);
  const boardFontSize = ['small', 'standard', 'large'].includes(parsed?.boardFontSize)
    ? parsed.boardFontSize
    : 'standard';
  return {
    mode: 'light',
    boardFontSize,
    handoffOverlay: typeof parsed?.handoffOverlay === 'boolean'
      ? parsed.handoffOverlay
      : false,
    players: [
      { name: parsed?.players?.[0]?.name || '玩家一', color: parsed?.players?.[0]?.color || '#C4787A' },
      { name: parsed?.players?.[1]?.name || '玩家二', color: parsed?.players?.[1]?.color || '#7A9E8E' }
    ],
    theme: parsed?.theme || 'warm',
    rules: {
      ...DEFAULT_SETTINGS,
      ...(parsed?.rules || {})
    }
  };
}

export function saveSettings(settings, storage) {
  const target = getStorage(storage);
  if (!target) return false;
  try {
    target.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function getCustomEvents(versionKey, storage) {
  const parsed = parseJson(getStorage(storage), CUSTOM_EVENTS_PREFIX + versionKey);
  return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string').slice() : [];
}

export function saveCustomEvents(versionKey, events, storage) {
  const target = getStorage(storage);
  if (!target) return false;
  try {
    const normalized = Array.isArray(events) ? events.map(item => String(item ?? '')) : [];
    target.setItem(CUSTOM_EVENTS_PREFIX + versionKey, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function resetCustomEvents(versionKey, storage) {
  const target = getStorage(storage);
  if (!target) return false;
  try {
    target.removeItem(CUSTOM_EVENTS_PREFIX + versionKey);
    return true;
  } catch {
    return false;
  }
}

export function resetGame(storage) {
  const target = getStorage(storage);
  if (!target) return false;
  try {
    target.removeItem(STORAGE_KEY);
    LEGACY_KEYS.forEach(key => target.removeItem(key));
    return true;
  } catch {
    return false;
  }
}
