import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getExchangeRates, clearExchangeRateMemoryCache } from './exchangeRateCache.js';
import { ExternalServiceUnavailableError } from '../platformErrors.js';

function fakeCollection(initialDocs = []) {
  const docs = [...initialDocs];
  let updateCalls = 0;
  return {
    docs,
    updateCallCount: () => updateCalls,
    find(query) {
      const matches = docs
        .filter((doc) => doc.base === query.base && doc.provider === query.provider)
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      return {
        sort() {
          return this;
        },
        limit() {
          return this;
        },
        async next() {
          return matches[0] ?? null;
        },
      };
    },
    async updateOne(filter, { $set }) {
      updateCalls += 1;
      const index = docs.findIndex(
        (doc) => doc.base === filter.base && doc.provider === filter.provider && doc.date === filter.date,
      );
      if (index >= 0) {
        docs[index] = { ...docs[index], ...$set };
      } else {
        docs.push({ ...$set });
      }
    },
  };
}

function stubbedFetch(result, { rejectsWith } = {}) {
  let calls = 0;
  return {
    callCount: () => calls,
    fetchLatestRates: async (args) => {
      calls += 1;
      if (rejectsWith) throw rejectsWith;
      return typeof result === 'function' ? result(args) : result;
    },
  };
}

beforeEach(() => {
  clearExchangeRateMemoryCache();
});

test('getExchangeRates consulta al proveedor y persiste el resultado en Mongo', async () => {
  const collection = fakeCollection();
  const stub = stubbedFetch({ base: 'ARS', date: '2026-07-14', rates: { CLP: 0.75 } });

  const result = await getExchangeRates({ base: 'ARS', collection, fetchLatestRates: stub.fetchLatestRates });

  assert.equal(result.stale, false);
  assert.deepEqual(result.rates, { CLP: 0.75 });
  assert.equal(collection.updateCallCount(), 1);
});

test('getExchangeRates usa el cache de memoria y no vuelve a llamar al proveedor', async () => {
  const collection = fakeCollection();
  const stub = stubbedFetch({ base: 'ARS', date: '2026-07-14', rates: { CLP: 0.75 } });

  await getExchangeRates({ base: 'ARS', collection, fetchLatestRates: stub.fetchLatestRates });
  await getExchangeRates({ base: 'ARS', collection, fetchLatestRates: stub.fetchLatestRates });

  assert.equal(stub.callCount(), 1);
});

test('getExchangeRates deduplica refrescos concurrentes de la misma base', async () => {
  const collection = fakeCollection();
  let resolveProvider;
  const stub = {
    callCount: 0,
    fetchLatestRates: (args) => {
      stub.callCount += 1;
      return new Promise((resolve) => {
        resolveProvider = () => resolve({ base: args.base, date: '2026-07-14', rates: { CLP: 0.75 } });
      });
    },
  };

  const first = getExchangeRates({ base: 'ARS', collection, fetchLatestRates: stub.fetchLatestRates });
  const second = getExchangeRates({ base: 'ARS', collection, fetchLatestRates: stub.fetchLatestRates });
  resolveProvider();
  await Promise.all([first, second]);

  assert.equal(stub.callCount, 1);
});

test('getExchangeRates cae a la última tasa de Mongo (stale) si el proveedor falla', async () => {
  const collection = fakeCollection([
    {
      base: 'ARS',
      provider: 'frankfurter',
      date: '2026-07-10',
      rates: { CLP: 0.7 },
      fetchedAt: '2026-07-10T12:00:00.000Z',
      expiresAt: '2026-07-11T12:00:00.000Z',
    },
  ]);
  const stub = stubbedFetch(null, { rejectsWith: new ExternalServiceUnavailableError('caído') });

  const result = await getExchangeRates({ base: 'ARS', collection, fetchLatestRates: stub.fetchLatestRates });

  assert.equal(result.stale, true);
  assert.deepEqual(result.rates, { CLP: 0.7 });
});

test('getExchangeRates devuelve null (sin lanzar) si el proveedor falla y nunca hubo una tasa previa', async () => {
  const collection = fakeCollection();
  const stub = stubbedFetch(null, { rejectsWith: new ExternalServiceUnavailableError('caído') });

  const result = await getExchangeRates({ base: 'ARS', collection, fetchLatestRates: stub.fetchLatestRates });

  assert.equal(result, null);
});

test('getExchangeRates propaga errores que no son del proveedor externo (bug real, no debe ocultarse)', async () => {
  const collection = fakeCollection();
  const stub = stubbedFetch(null, { rejectsWith: new TypeError('bug de programación') });

  await assert.rejects(
    () => getExchangeRates({ base: 'ARS', collection, fetchLatestRates: stub.fetchLatestRates }),
    TypeError,
  );
});
