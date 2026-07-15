import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { createTripSyncHandler } from './sync.js';

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader() {},
  };
}

test('trip sync excluye la partición semántica en lectura, merge, respuesta y escritura', async () => {
  const tripObjectId = new ObjectId();
  let readFilter;
  const writes = [];
  const memories = {
    find(filter) {
      readFilter = filter;
      return {
        toArray: async () => [
          { recordKind: 'alaia_memory_record_v1', legacyId: `semantic-v1:mk1_${'a'.repeat(64)}`, meaning: { text: 'PRIVADO' } },
          { legacyId: 'album-remote', note: 'visible', createdAt: '2026-10-03T12:00:00.000Z', updatedAt: '2026-10-03T12:00:00.000Z' },
        ],
      };
    },
    async updateOne(filter, update, options) { writes.push({ filter, update, options }); },
  };
  const tripStates = {
    async findOne() { return { chapterStatuses: {} }; },
    async updateOne() {},
  };
  const handler = createTripSyncHandler({
    applyCors: () => false,
    requireTripRole: async () => ({ user: { userId: String(new ObjectId()) }, trip: { _id: tripObjectId }, role: 'owner' }),
    getMemoriesCollection: async () => memories,
    getTripStatesCollection: async () => tripStates,
    ensureTripSyncIndexes: async () => {},
    toObjectId: () => tripObjectId,
    now: () => '2026-10-03T15:00:00.000Z',
  });
  const res = response();

  await handler({
    method: 'POST',
    query: { tripId: String(tripObjectId) },
    body: {
      memories: [
        { id: `semantic-v1:mk1_${'b'.repeat(64)}`, note: 'ATAQUE' },
        { id: 'album-local', note: 'queda', createdAt: '2026-10-03T13:00:00.000Z', updatedAt: '2026-10-03T13:00:00.000Z' },
      ],
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.memories.map((memory) => memory.id).sort(), ['album-local', 'album-remote']);
  assert.doesNotMatch(JSON.stringify(res.body), /PRIVADO|ATAQUE|semantic-v1/);
  assert.deepEqual(readFilter, {
    $and: [
      { tripId: tripObjectId },
      { recordKind: { $ne: 'alaia_memory_record_v1' } },
      { legacyId: { $not: /^semantic-v1:/ } },
    ],
  });
  assert.equal(writes.length, 2);
  assert.deepEqual(writes.map(({ update }) => update.$set.legacyId).sort(), ['album-local', 'album-remote']);
  for (const { filter } of writes) {
    assert.equal(filter.$and[1].recordKind.$ne, 'alaia_memory_record_v1');
    assert.match(String(filter.$and[2].legacyId.$not), /semantic-v1/);
  }
});
