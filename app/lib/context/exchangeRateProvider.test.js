import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLatestRates } from './exchangeRateProvider.js';
import { ExternalServiceUnavailableError } from '../platformErrors.js';

function stubFetch(impl) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = impl;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test('fetchLatestRates normaliza el array de registros {base,quote,rate,date} del proveedor', async () => {
  const restore = stubFetch(async () => ({
    ok: true,
    text: async () =>
      JSON.stringify([
        { date: '2026-07-14', base: 'ARS', quote: 'CLP', rate: 0.6261 },
        { date: '2026-07-14', base: 'ARS', quote: 'USD', rate: '0.00068' },
      ]),
  }));
  try {
    const result = await fetchLatestRates({ base: 'ARS', symbols: ['CLP', 'USD'] });
    assert.deepEqual(result, {
      base: 'ARS',
      date: '2026-07-14',
      rates: { CLP: 0.6261, USD: 0.00068 },
      provider: 'frankfurter',
    });
  } finally {
    restore();
  }
});

test('fetchLatestRates descarta registros con tasa no numérica, cero o negativa', async () => {
  const restore = stubFetch(async () => ({
    ok: true,
    text: async () =>
      JSON.stringify([
        { date: '2026-07-14', base: 'ARS', quote: 'CLP', rate: 0.6261 },
        { date: '2026-07-14', base: 'ARS', quote: 'BAD', rate: 'nope' },
        { date: '2026-07-14', base: 'ARS', quote: 'NEG', rate: -1 },
        { date: '2026-07-14', base: 'ARS', quote: 'ZERO', rate: 0 },
      ]),
  }));
  try {
    const result = await fetchLatestRates({ base: 'ARS', symbols: ['CLP'] });
    assert.deepEqual(result.rates, { CLP: 0.6261 });
  } finally {
    restore();
  }
});

test('fetchLatestRates lanza ExternalServiceUnavailableError si el array no trae ninguna tasa utilizable', async () => {
  const restore = stubFetch(async () => ({ ok: true, text: async () => JSON.stringify([]) }));
  try {
    await assert.rejects(
      () => fetchLatestRates({ base: 'ARS', symbols: ['CLP'] }),
      ExternalServiceUnavailableError,
    );
  } finally {
    restore();
  }
});

test('fetchLatestRates envuelve errores de red en ExternalServiceUnavailableError', async () => {
  const restore = stubFetch(async () => {
    throw new Error('network down');
  });
  try {
    await assert.rejects(
      () => fetchLatestRates({ base: 'ARS', symbols: ['CLP'] }),
      ExternalServiceUnavailableError,
    );
  } finally {
    restore();
  }
});

test('fetchLatestRates envuelve respuestas HTTP no-ok (422 moneda inválida, 5xx, etc.) en ExternalServiceUnavailableError', async () => {
  const restore = stubFetch(async () => ({ ok: false, status: 422 }));
  try {
    await assert.rejects(
      () => fetchLatestRates({ base: 'ARS', symbols: ['CLP'] }),
      ExternalServiceUnavailableError,
    );
  } finally {
    restore();
  }
});

test('fetchLatestRates rechaza payload que no es un array', async () => {
  const restore = stubFetch(async () => ({ ok: true, text: async () => JSON.stringify({ nope: true }) }));
  try {
    await assert.rejects(
      () => fetchLatestRates({ base: 'ARS', symbols: ['CLP'] }),
      ExternalServiceUnavailableError,
    );
  } finally {
    restore();
  }
});

test('fetchLatestRates rechaza JSON inválido', async () => {
  const restore = stubFetch(async () => ({ ok: true, text: async () => 'no es json' }));
  try {
    await assert.rejects(
      () => fetchLatestRates({ base: 'ARS', symbols: ['CLP'] }),
      ExternalServiceUnavailableError,
    );
  } finally {
    restore();
  }
});

test('fetchLatestRates envía quotes (no symbols) como query param al proveedor v2', async () => {
  let capturedUrl;
  const restore = stubFetch(async (url) => {
    capturedUrl = url;
    return { ok: true, text: async () => JSON.stringify([{ date: '2026-07-14', base: 'ARS', quote: 'CLP', rate: 0.6261 }]) };
  });
  try {
    await fetchLatestRates({ base: 'ARS', symbols: ['CLP', 'USD'] });
    const parsed = new URL(capturedUrl);
    assert.equal(parsed.pathname, '/v2/rates');
    assert.equal(parsed.searchParams.get('quotes'), 'CLP,USD');
    assert.equal(parsed.searchParams.get('symbols'), null);
  } finally {
    restore();
  }
});
