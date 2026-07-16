import assert from 'node:assert/strict';
import test from 'node:test';
import { createSemanticMemoriesHandler } from './semantic-memories.js';

function response() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    end() { return this; },
  };
}

function accepted({ ownerUserId = 'user-1', tripId = 'trip-1', storyId = 'story-1', type = 'trip_started' } = {}) {
  const lastDay = type === 'trip_last_day';
  const kind = lastDay ? 'trip_last_day' : 'trip_start_today';
  const decisionId = `decision:${kind}:${tripId}`;
  return {
    outcome: 'accepted', lifecycle: 'accepted', type, origin: 'companion_editorial',
    occurredAt: '2026-10-03T15:00:00.000Z',
    scope: { ownerUserId, tripId, storyId },
    decisionRef: { id: decisionId, kind },
    editorialRef: { catalogVersion: 'editorial-v1', variantId: lastDay ? 'last-day-01' : 'today-01' },
    evidence: [{ kind: 'companion_action', ref: decisionId }],
    meaning: { code: type, text: lastDay ? 'Hoy es el último día de este viaje.' : 'Hoy comienza una nueva historia.' },
    retention: { reason: 'trip_milestone', explanation: 'travel_milestone_worth_recalling' },
    dedupe: { version: 'memory-key-v1', sourceSlot: decisionId },
  };
}

function setup(overrides = {}) {
  const calls = [];
  const repository = {
    async persistOnce(value) {
      calls.push(['persistOnce', value]);
      return { state: 'persisted', type: value.type };
    },
    async getLatestAndRemember(scope) {
      calls.push(['getLatestAndRemember', scope]);
      return {
        type: 'trip_started', meaning: { text: 'Hoy comienza una nueva historia.' }, state: 'remembered',
      };
    },
  };
  const dependencies = {
    applyCors: () => false,
    requireUser: async () => {
      calls.push(['requireUser']);
      return { userId: 'user-1' };
    },
    requireTripMember: async (_req, _res, tripId) => {
      calls.push(['requireTripMember', tripId]);
      return { user: { userId: 'user-1' }, trip: { _id: tripId, baseStoryId: 'base-story-1' }, role: 'owner' };
    },
    getBaseStory: async (baseStoryId) => {
      calls.push(['getBaseStory', baseStoryId]);
      return { storyId: baseStoryId, packageStoryId: 'story-1' };
    },
    createSemanticMemoryRepository: (...args) => {
      calls.push(['repository', ...args]);
      return repository;
    },
    ...overrides,
  };
  return { calls, repository, handler: createSemanticMemoriesHandler(dependencies) };
}

test('semantic memories aplica CORS/métodos y exige sesión antes de membresía/repositorio', async () => {
  const preflight = createSemanticMemoriesHandler({ applyCors: (_req, res) => { res.status(204).end(); return true; } });
  const preflightResponse = response();
  await preflight({ method: 'OPTIONS' }, preflightResponse);
  assert.equal(preflightResponse.statusCode, 204);

  const { handler, calls } = setup({ requireUser: async () => { calls.push(['requireUser']); return null; } });
  const methodResponse = response();
  await handler({ method: 'DELETE', query: { tripId: 'trip-1' } }, methodResponse);
  assert.equal(methodResponse.statusCode, 405);
  assert.deepEqual(methodResponse.headers.Allow, ['GET', 'POST']);

  const deniedResponse = response();
  await handler({ method: 'GET', query: { tripId: 'trip-1', storyId: 'story-1' } }, deniedResponse);
  assert.deepEqual(calls, [['requireUser']]);
});

test('POST valida sesión, membership y lineage exacto antes de persistir y proyecta respuesta mínima', async () => {
  const { handler, calls } = setup();
  const res = response();
  const body = accepted();

  await handler({ method: 'POST', query: { tripId: 'trip-1' }, body }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: 'persisted', type: 'trip_started' });
  assert.deepEqual(calls.slice(0, 2), [['requireUser'], ['requireTripMember', 'trip-1']]);
  assert.deepEqual(calls.at(-1), ['persistOnce', body]);
  assert.equal(JSON.stringify(res.body).includes('memoryKey'), false);
});

test('POST proyecta duplicate y rechaza owner/trip/story, tipos legacy y claves desconocidas sin persistir', async () => {
  const fixtures = [
    accepted({ ownerUserId: 'other-user' }),
    accepted({ tripId: 'other-trip' }),
    accepted({ storyId: 'other-story' }),
    { ...accepted(), type: 'favorite_marked' },
    { ...accepted(), unknown: 'private' },
  ];
  for (const body of fixtures) {
    const { handler, calls } = setup();
    const res = response();
    await handler({ method: 'POST', query: { tripId: 'trip-1' }, body }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(calls.some(([name]) => name === 'persistOnce'), false);
  }

  const { handler } = setup({
    createSemanticMemoryRepository: () => ({
      persistOnce: async () => ({ outcome: 'discard', reason: 'duplicate', type: 'trip_last_day' }),
    }),
  });
  const duplicateResponse = response();
  await handler({ method: 'POST', query: { tripId: 'trip-1' }, body: accepted({ type: 'trip_last_day' }) }, duplicateResponse);
  assert.deepEqual(duplicateResponse.body, { status: 'duplicate', type: 'trip_last_day' });
});

test('GET usa scope autenticado exacto, recuerda el último hito y devuelve solo type/text o null', async () => {
  const { handler, calls } = setup();
  const res = response();
  await handler({ method: 'GET', query: { tripId: 'trip-1', storyId: 'story-1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { memory: { type: 'trip_started', text: 'Hoy comienza una nueva historia.' } });
  assert.deepEqual(calls.at(-1), ['getLatestAndRemember', {
    ownerUserId: 'user-1', tripId: 'trip-1', storyId: 'story-1',
  }]);
  assert.doesNotMatch(JSON.stringify(res.body), /id|hash|ref|evidence|state|occurredAt|createdAt/i);

  const empty = setup({
    createSemanticMemoryRepository: () => ({ getLatestAndRemember: async () => null }),
  });
  const emptyResponse = response();
  await empty.handler({ method: 'GET', query: { tripId: 'trip-1', storyId: 'story-1' } }, emptyResponse);
  assert.deepEqual(emptyResponse.body, { memory: null });
});

test('GET rechaza query inexacta y membership ajena; fallos de storage quedan sanitizados', async () => {
  const invalidQueries = [
    { tripId: 'trip-1' },
    { tripId: 'trip-1', storyId: 'story-1', ownerUserId: 'other-user' },
    { tripId: 'trip-1', storyId: 'story-1', unknown: 'private' },
  ];
  for (const query of invalidQueries) {
    const { handler, calls } = setup();
    const res = response();
    await handler({ method: 'GET', query }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(calls.some(([name]) => name === 'getLatestAndRemember'), false);
  }

  const denied = setup({ requireTripMember: async (_req, res) => { res.status(403).json({ error: 'Sin acceso.' }); return null; } });
  const deniedResponse = response();
  await denied.handler({ method: 'GET', query: { tripId: 'trip-1', storyId: 'story-1' } }, deniedResponse);
  assert.equal(deniedResponse.statusCode, 403);
  assert.equal(denied.calls.some(([name]) => name === 'repository'), false);

  for (const method of ['GET', 'POST']) {
    const failing = setup({
      createSemanticMemoryRepository: () => ({
        getLatestAndRemember: async () => { throw new Error('PRIVATE_STORAGE_ERROR'); },
        persistOnce: async () => { throw new Error('PRIVATE_STORAGE_ERROR'); },
      }),
    });
    const res = response();
    await failing.handler({
      method,
      query: method === 'GET' ? { tripId: 'trip-1', storyId: 'story-1' } : { tripId: 'trip-1' },
      body: method === 'POST' ? accepted() : undefined,
    }, res);
    assert.equal(res.statusCode, 503);
    assert.doesNotMatch(JSON.stringify(res.body), /PRIVATE_STORAGE_ERROR/);
  }
});
