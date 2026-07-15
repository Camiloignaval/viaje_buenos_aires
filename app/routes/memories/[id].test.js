import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryByIdHandler } from './[id].js';

function response() {
  return {
    statusCode: 200,
    body: undefined,
    ended: false,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.ended = true; return this; },
    setHeader() {},
  };
}

test('PATCH legacy siempre filtra la partición semántica y bloquea ids reservados', async () => {
  let updateFilter;
  const collection = {
    async updateOne(filter) { updateFilter = filter; },
    async findOne(filter) { return { id: filter.id, note: 'legacy' }; },
  };
  const handler = createMemoryByIdHandler({ applyCors: () => false, getMemoriesCollection: async () => collection, now: () => '2026-10-03T15:00:00.000Z' });
  const blocked = response();
  await handler({ method: 'PATCH', query: { id: `semantic-v1:mk1_${'a'.repeat(64)}` }, body: { note: 'ataque' } }, blocked);
  assert.equal(blocked.statusCode, 404);
  assert.equal(updateFilter, undefined);

  const contractAttack = response();
  await handler({ method: 'PATCH', query: { id: 'legacy-1' }, body: { recordKind: 'alaia_memory_record_v1', memoryKey: `mk1_${'b'.repeat(64)}` } }, contractAttack);
  assert.equal(contractAttack.statusCode, 400);
  assert.equal(updateFilter, undefined);

  const allowed = response();
  await handler({ method: 'PATCH', query: { id: 'legacy-1' }, body: { note: 'queda' } }, allowed);
  assert.deepEqual(updateFilter, {
    $and: [
      { id: 'legacy-1' },
      { recordKind: { $ne: 'alaia_memory_record_v1' } },
      { legacyId: { $not: /^semantic-v1:/ } },
    ],
  });
});

test('DELETE legacy usa guard negativo y no puede borrar un record semántico', async () => {
  let deleteFilter;
  const collection = { async deleteOne(filter) { deleteFilter = filter; } };
  const handler = createMemoryByIdHandler({ applyCors: () => false, getMemoriesCollection: async () => collection });
  const res = response();

  await handler({ method: 'DELETE', query: { id: 'legacy-1' } }, res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.deepEqual(deleteFilter, {
    $and: [
      { id: 'legacy-1' },
      { recordKind: { $ne: 'alaia_memory_record_v1' } },
      { legacyId: { $not: /^semantic-v1:/ } },
    ],
  });
});
