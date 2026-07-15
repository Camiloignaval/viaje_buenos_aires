import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { createSemanticMemoryRepository, MemoryEngineError } from './platformMemory.js';

function accepted({ ownerUserId, tripId, sourceSlot = 'favorite:place-1' } = {}) {
  return {
    outcome: 'accepted',
    lifecycle: 'accepted',
    type: 'favorite_marked',
    origin: 'authorized_event',
    occurredAt: '2026-10-03T15:00:00.000Z',
    scope: { ownerUserId, tripId, storyId: 'story-1' },
    decisionRef: null,
    editorialRef: null,
    evidence: [{ kind: 'favorite_target', ref: 'place-1' }],
    meaning: { code: 'favorite_marked', text: null },
    retention: { reason: 'explicit_affinity', explanation: 'explicit_preference_worth_recalling' },
    dedupe: { version: 'memory-key-v1', sourceSlot },
  };
}

function fakeCollection({ failWrite = false, failRead = false } = {}) {
  const documents = new Map();
  return {
    documents,
    updateCalls: 0,
    async updateOne(filter, update, options) {
      this.updateCalls += 1;
      if (failWrite) throw new Error('PRIVATE_DATABASE_ERROR');
      assert.equal(options.upsert, true);
      const key = `${filter.tripId}:${filter.legacyId}`;
      if (documents.has(key)) return { matchedCount: 1, modifiedCount: 0, upsertedCount: 0 };
      documents.set(key, structuredClone(update.$setOnInsert));
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    },
    async findOneAndUpdate(filter, update) {
      if (failRead) throw new Error('PRIVATE_READ_ERROR');
      const key = `${filter.tripId}:${filter.legacyId}`;
      const existing = documents.get(key);
      if (!existing || existing.recordKind !== filter.recordKind || existing.owner.userId !== filter['owner.userId']) return null;
      if (filter.storyRef === null && existing.storyRef !== null) return null;
      if (filter['storyRef.storyId'] && existing.storyRef?.storyId !== filter['storyRef.storyId']) return null;
      if (!filter.state.$in.includes(existing.state)) return null;
      const next = { ...existing, ...update.$set };
      documents.set(key, next);
      return structuredClone(next);
    },
    async findOne(filter) {
      if (failRead) throw new Error('PRIVATE_READ_ERROR');
      const key = `${filter.tripId}:${filter.legacyId}`;
      const existing = documents.get(key);
      if (filter.storyRef === null && existing?.storyRef !== null) return null;
      if (filter['storyRef.storyId'] && existing?.storyRef?.storyId !== filter['storyRef.storyId']) return null;
      return existing ? structuredClone(existing) : null;
    },
  };
}

function setup({ collection = fakeCollection(), sessionUserId, tripId } = {}) {
  const resolvedTripId = tripId ?? new ObjectId();
  const resolvedUserId = sessionUserId ?? new ObjectId();
  const requireTripMember = async () => ({
    user: { userId: String(resolvedUserId) },
    trip: { _id: resolvedTripId, members: [{ userId: resolvedUserId, role: 'owner' }] },
    role: 'owner',
  });
  const repository = createSemanticMemoryRepository(
    { req: {}, tripId: String(resolvedTripId) },
    { requireTripMember, getMemoriesCollection: async () => collection, now: () => '2026-10-03T15:01:00.000Z' },
  );
  return { collection, repository, tripId: resolvedTripId, userId: resolvedUserId };
}

function codeOf(error) {
  assert.ok(error instanceof MemoryEngineError);
  return error.code;
}

test('persistOnce usa una identidad atómica y reintentos/concurrencia producen un solo record', async () => {
  const { collection, repository, tripId, userId } = setup();
  const input = accepted({ ownerUserId: String(userId), tripId: String(tripId) });

  const [first, retry, concurrentRetry] = await Promise.all([
    repository.persistOnce(input),
    repository.persistOnce(structuredClone(input)),
    repository.persistOnce(structuredClone(input)),
  ]);

  assert.equal(first.state, 'persisted');
  assert.deepEqual([retry, concurrentRetry], [
    { outcome: 'discard', reason: 'duplicate', type: 'favorite_marked' },
    { outcome: 'discard', reason: 'duplicate', type: 'favorite_marked' },
  ]);
  assert.equal(collection.documents.size, 1);
  assert.match(first.memoryKey, /^mk1_[a-f0-9]{64}$/);
  assert.equal([...collection.documents.values()][0].legacyId, `semantic-v1:${first.memoryKey}`);
});

test('persistOnce comparte el fixture SHA-256 UTF-8 versionado del core', async () => {
  const ownerId = new ObjectId('64b000000000000000000001');
  const tripId = new ObjectId('64b000000000000000000002');
  const setupResult = setup({ sessionUserId: ownerId, tripId });
  const record = await setupResult.repository.persistOnce(accepted({ ownerUserId: String(ownerId), tripId: String(tripId) }));

  assert.equal(record.memoryKey, 'mk1_1c5998bb002aa9c5c72afe1248207b638f7cd5ac8d1a8ec339a777f51e7a0c2a');
});

test('persistOnce deriva owner de sesión y rechaza owner payload o no-membership sin escribir', async () => {
  const setupResult = setup();
  const mismatched = accepted({ ownerUserId: String(new ObjectId()), tripId: String(setupResult.tripId) });

  await assert.rejects(() => setupResult.repository.persistOnce(mismatched), (error) => codeOf(error) === 'OWNERSHIP_DENIED');
  assert.equal(setupResult.collection.updateCalls, 0);

  const deniedCollection = fakeCollection();
  const denied = createSemanticMemoryRepository(
    { req: {}, tripId: String(setupResult.tripId) },
    { requireTripMember: async () => null, getMemoriesCollection: async () => deniedCollection },
  );
  await assert.rejects(() => denied.persistOnce(accepted({
    ownerUserId: String(setupResult.userId), tripId: String(setupResult.tripId),
  })), (error) => codeOf(error) === 'OWNERSHIP_DENIED');
  assert.equal(deniedCollection.updateCalls, 0);
});

test('persistOnce rechaza schema/privacidad antes del repositorio', async () => {
  const setupResult = setup();
  const invalid = {
    ...accepted({ ownerUserId: String(setupResult.userId), tripId: String(setupResult.tripId) }),
    accessToken: 'PRIVATE_TOKEN',
  };

  await assert.rejects(() => setupResult.repository.persistOnce(invalid), (error) => codeOf(error) === 'SCHEMA_REJECTED');
  assert.equal(setupResult.collection.updateCalls, 0);
});

test('un fallo de repositorio queda tipado, sin payload/error retenido ni escritura parcial', async () => {
  const setupResult = setup({ collection: fakeCollection({ failWrite: true }) });
  const input = accepted({ ownerUserId: String(setupResult.userId), tripId: String(setupResult.tripId) });

  await assert.rejects(() => setupResult.repository.persistOnce(input), (error) => {
    assert.equal(codeOf(error), 'REPOSITORY_FAILURE');
    assert.deepEqual(Object.keys(error).sort(), ['code', 'name']);
    assert.doesNotMatch(JSON.stringify(error), /PRIVATE_DATABASE_ERROR|place-1/);
    return true;
  });
  assert.equal(setupResult.collection.documents.size, 0);
});

test('getAndRemember cambia a remembered solo tras lectura confirmada y respeta ownership', async () => {
  const setupResult = setup();
  const input = accepted({ ownerUserId: String(setupResult.userId), tripId: String(setupResult.tripId) });
  const persisted = await setupResult.repository.persistOnce(input);
  const remembered = await setupResult.repository.getAndRemember(persisted.memoryKey, input.scope);

  assert.equal(remembered.state, 'remembered');
  assert.deepEqual(Object.keys(remembered), [
    'recordKind', 'memoryKey', 'identityVersion', 'type', 'origin', 'occurredAt', 'createdAt',
    'owner', 'tripRef', 'storyRef', 'decisionRef', 'editorialRef', 'evidence', 'meaning', 'state', 'retention',
  ]);
  const wrongScope = { ...input.scope, ownerUserId: String(new ObjectId()) };
  await assert.rejects(() => setupResult.repository.getAndRemember(persisted.memoryKey, wrongScope), (error) => codeOf(error) === 'OWNERSHIP_DENIED');
});

test('getAndRemember no inventa record ante ausencia ni conserva fallos del repositorio', async () => {
  const setupResult = setup();
  const scope = { ownerUserId: String(setupResult.userId), tripId: String(setupResult.tripId), storyId: 'story-1' };
  assert.equal(await setupResult.repository.getAndRemember(`mk1_${'a'.repeat(64)}`, scope), null);

  const failing = setup({ collection: fakeCollection({ failRead: true }), sessionUserId: setupResult.userId, tripId: setupResult.tripId });
  await assert.rejects(
    () => failing.repository.getAndRemember(`mk1_${'a'.repeat(64)}`, scope),
    (error) => codeOf(error) === 'REPOSITORY_FAILURE' && !JSON.stringify(error).includes('PRIVATE_READ_ERROR'),
  );
});

test('getAndRemember valida privacidad/schema antes de cambiar lifecycle', async () => {
  const setupResult = setup();
  const input = accepted({ ownerUserId: String(setupResult.userId), tripId: String(setupResult.tripId) });
  const persisted = await setupResult.repository.persistOnce(input);
  const key = `${setupResult.tripId}:semantic-v1:${persisted.memoryKey}`;
  const corrupted = setupResult.collection.documents.get(key);
  corrupted.meaning = { code: 'favorite_marked', text: 'person@example.com' };

  await assert.rejects(
    () => setupResult.repository.getAndRemember(persisted.memoryKey, input.scope),
    (error) => codeOf(error) === 'SCHEMA_REJECTED' && !JSON.stringify(error).includes('person@example.com'),
  );
  assert.equal(setupResult.collection.documents.get(key).state, 'persisted');
});

test('getAndRemember mantiene story como asociación de scope separada', async () => {
  const setupResult = setup();
  const input = accepted({ ownerUserId: String(setupResult.userId), tripId: String(setupResult.tripId) });
  const persisted = await setupResult.repository.persistOnce(input);
  const wrongStory = { ...input.scope, storyId: 'story-2' };

  assert.equal(await setupResult.repository.getAndRemember(persisted.memoryKey, wrongStory), null);
  const key = `${setupResult.tripId}:semantic-v1:${persisted.memoryKey}`;
  assert.equal(setupResult.collection.documents.get(key).state, 'persisted');
});
