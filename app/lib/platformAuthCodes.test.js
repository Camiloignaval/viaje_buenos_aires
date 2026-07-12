import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_CODE_LENGTH,
  authCodeExpiresAt,
  generateAuthCode,
  hashAuthCode,
  normalizeEmail,
  verifyAuthCodeHash,
} from './platformAuthCodes.js';

test('normalizeEmail normaliza emails válidos', () => {
  assert.equal(normalizeEmail('  Kari@Example.COM  '), 'kari@example.com');
});

test('normalizeEmail rechaza emails inválidos', () => {
  assert.throws(() => normalizeEmail('kari'), /Email inválido/);
});

test('generateAuthCode crea códigos numéricos de seis dígitos', () => {
  const code = generateAuthCode();

  assert.equal(code.length, AUTH_CODE_LENGTH);
  assert.match(code, /^\d{6}$/);
});

test('hashAuthCode y verifyAuthCodeHash validan por email y código', () => {
  const hash = hashAuthCode('kari@example.com', '123456', { secret: 'secret' });

  assert.equal(verifyAuthCodeHash('kari@example.com', '123456', hash, { secret: 'secret' }), true);
  assert.equal(verifyAuthCodeHash('kari@example.com', '000000', hash, { secret: 'secret' }), false);
  assert.equal(verifyAuthCodeHash('otro@example.com', '123456', hash, { secret: 'secret' }), false);
});

test('authCodeExpiresAt usa TTL de 10 minutos por defecto', () => {
  assert.equal(authCodeExpiresAt({ now: new Date('2026-07-09T12:00:00Z').getTime() }), '2026-07-09T12:10:00.000Z');
});
