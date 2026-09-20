const ACCESS_KEY = 'flight_chess_access_v1';
const PASSWORD_HASH = '1a24ca05bcdc02b3c36816a42966d479fd8e946fc14261b4514527ca8e646046';

export const AUTH_MARKER = PASSWORD_HASH;

function getCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前浏览器不支持密码验证。');
  }
  return globalThis.crypto;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await getCrypto().subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password) {
  return await sha256(String(password)) === PASSWORD_HASH;
}

export function isUnlocked(storage = globalThis.localStorage) {
  try {
    return storage.getItem(ACCESS_KEY) === AUTH_MARKER;
  } catch {
    return false;
  }
}

export function unlock(storage = globalThis.localStorage) {
  storage.setItem(ACCESS_KEY, AUTH_MARKER);
}

export function lock(storage = globalThis.localStorage) {
  storage.removeItem(ACCESS_KEY);
}

export function getSafeNextPage(value) {
  const next = String(value || '');
  return /^(?:index|game|settings)\.html(?:[?#].*)?$/.test(next) ? next : 'index.html';
}

export function requireAuth({ storage = globalThis.localStorage, location = globalThis.location } = {}) {
  if (isUnlocked(storage)) {
    globalThis.document?.documentElement.classList.remove('auth-pending');
    return true;
  }

  const currentPage = `${location.pathname.split('/').pop() || 'index.html'}${location.search || ''}${location.hash || ''}`;
  location.replace(`login.html?next=${encodeURIComponent(getSafeNextPage(currentPage))}`);
  return false;
}

export function bindLockButtons({ document = globalThis.document, storage = globalThis.localStorage, location = globalThis.location } = {}) {
  document.querySelectorAll('[data-lock-game]').forEach(button => {
    button.addEventListener('click', () => {
      lock(storage);
      location.href = 'login.html';
    });
  });
}
