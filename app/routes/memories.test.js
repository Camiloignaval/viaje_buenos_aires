import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoriesHandler } from './memories.js';

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader() {},
  };
}

test('GET legacy aplica guard negativo y nunca devuelve records semánticos', async () => {
  let filter;
  const collection = {
    find(received) {
      filter = received;
      return { toArray: async () => [{ id: 'legacy-1', title: 'visible' }] };
    },
  };
  const handler = createMemoriesHandler({ applyCors: () => false, getMemoriesCollection: async () => collection });
  const res = response();

  await handler({ method: 'GET' }, res);

  assert.deepEqual(filter, {
    $and: [
      {},
      { recordKind: { $ne: 'alaia_memory_record_v1' } },
      { legacyId: { $not: /^semantic-v1:/ } },
    ],
  });
  assert.deepEqual(res.body, { 'legacy-1': { id: 'legacy-1', title: 'visible' } });
});

test('POST legacy rechaza el namespace semántico y conserva creación normal', async () => {
  let update;
  const collection = {
    async updateOne(filter, change, options) { update = { filter, change, options }; },
    async findOne(filter) { return { id: filter.id, title: 'normal' }; },
  };
  const handler = createMemoriesHandler({ applyCors: () => false, getMemoriesCollection: async () => collection, now: () => '2026-10-03T15:00:00.000Z' });
  const blocked = response();
  await handler({ method: 'POST', body: { id: `semantic-v1:mk1_${'a'.repeat(64)}` } }, blocked);
  assert.equal(blocked.statusCode, 400);
  assert.equal(update, undefined);

  const allowed = response();
  await handler({ method: 'POST', body: { id: 'legacy-2', title: 'normal' } }, allowed);
  assert.equal(allowed.statusCode, 201);
  assert.deepEqual(update.filter, {
    $and: [
      { id: 'legacy-2' },
      { recordKind: { $ne: 'alaia_memory_record_v1' } },
      { legacyId: { $not: /^semantic-v1:/ } },
    ],
  });
  assert.equal(update.options.upsert, true);
});
