import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SESSION_COOKIE_NAME,
  AuthError,
  createSessionToken,
  parseCookies,
  serializeCookie,
  verifySessionToken,
} from './platformAuth.js';

const SECRET = 'test-secret';
const NOW = new Date('2026-07-09T12:00:00Z').getTime();

test('createSessionToken y verifySessionToken hacen round-trip de usuario', () => {
  const token = createSessionToken({ id: 'user-1', email: 'KARI@EXAMPLE.COM' }, { secret: SECRET, now: NOW });
  const session = verifySessionToken(token, { secret: SECRET, now: NOW + 1000 });

  assert.equal(session.userId, 'user-1');
  assert.equal(session.email, 'kari@example.com');
  assert.equal(session.expiresAt, '2026-08-08T12:00:00.000Z');
});

test('verifySessionToken rechaza tokens expirados', () => {
  const token = createSessionToken({ id: 'user-1', email: 'kari@example.com' }, { secret: SECRET, now: NOW, ttlSeconds: 10 });

  assert.throws(
    () => verifySessionToken(token, { secret: SECRET, now: NOW + 11_000 }),
    (error) => error instanceof AuthError && error.statusCode === 401 && error.message === 'Sesión expirada.'
  );
});

test('verifySessionToken rechaza firmas inválidas', () => {
  const token = createSessionToken({ id: 'user-1', email: 'kari@example.com' }, { secret: SECRET, now: NOW });

  assert.throws(
    () => verifySessionToken(`${token.slice(0, -1)}x`, { secret: SECRET, now: NOW }),
    (error) => error instanceof AuthError && error.statusCode === 401
  );
});

test('parseCookies lee cookies codificadas', () => {
  const parsed = parseCookies(`${SESSION_COOKIE_NAME}=abc.def; email=kari%40example.com`);

  assert.equal(parsed[SESSION_COOKIE_NAME], 'abc.def');
  assert.equal(parsed.email, 'kari@example.com');
});

test('serializeCookie crea cookie httpOnly segura para sesión', () => {
  const cookie = serializeCookie(SESSION_COOKIE_NAME, 'token', { maxAge: 60, secure: true });

  assert.equal(cookie, 'alaia_session=token; Path=/; SameSite=Lax; HttpOnly; Secure; Max-Age=60');
});
