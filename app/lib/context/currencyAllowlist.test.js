import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSupportedCurrency, SUPPORTED_CURRENCIES } from './currencyAllowlist.js';

test('isSupportedCurrency acepta las monedas del allowlist en mayúsculas o minúsculas', () => {
  assert.equal(isSupportedCurrency('ARS'), true);
  assert.equal(isSupportedCurrency('ars'), true);
  assert.equal(isSupportedCurrency('clp'), true);
});

test('isSupportedCurrency rechaza monedas fuera del allowlist', () => {
  assert.equal(isSupportedCurrency('XYZ'), false);
  assert.equal(isSupportedCurrency('BTC'), false);
});

test('isSupportedCurrency rechaza valores mal formados sin explotar', () => {
  assert.equal(isSupportedCurrency(''), false);
  assert.equal(isSupportedCurrency(undefined), false);
  assert.equal(isSupportedCurrency(123), false);
  assert.equal(isSupportedCurrency('demasiado-largo'), false);
});

test('SUPPORTED_CURRENCIES incluye las 11 monedas requeridas por el Context Engine', () => {
  for (const code of ['ARS', 'CLP', 'BRL', 'USD', 'EUR', 'JPY', 'MXN', 'GBP', 'UYU', 'PEN', 'COP']) {
    assert.ok(SUPPORTED_CURRENCIES.includes(code), `falta ${code}`);
  }
});
