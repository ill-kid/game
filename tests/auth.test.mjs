import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_MARKER,
  getSafeNextPage,
  isUnlocked,
  lock,
  unlock,
  verifyPassword
} from '../auth.mjs';

function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key)
  };
}

test('only the configured password is accepted', async () => {
  const configuredPassword = Buffer.from('MTQ3NzU5', 'base64').toString('utf8');
  assert.equal(await verifyPassword(configuredPassword), true);
  assert.equal(await verifyPassword('147758'), false);
  assert.equal(await verifyPassword(''), false);
});

test('unlock state can be saved and cleared', () => {
  const storage = fakeStorage();
  assert.equal(isUnlocked(storage), false);
  unlock(storage);
  assert.equal(storage.getItem('flight_chess_access_v1'), AUTH_MARKER);
  assert.equal(isUnlocked(storage), true);
  lock(storage);
  assert.equal(isUnlocked(storage), false);
});

test('login redirect only accepts local game pages', () => {
  assert.equal(getSafeNextPage('game.html?version=love'), 'game.html?version=love');
  assert.equal(getSafeNextPage('settings.html'), 'settings.html');
  assert.equal(getSafeNextPage('https://example.com'), 'index.html');
  assert.equal(getSafeNextPage('//example.com'), 'index.html');
});
