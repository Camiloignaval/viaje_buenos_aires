import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStoryContentStore, StoryContentStatus } from './storyContentStore.js';
import { createConnectedContextStore, TripContextStatus } from './connectedContext.js';
import { PlatformApiError } from './platformApi.js';

function fakeContext(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(next) {
      state = next;
      listeners.forEach((listener) => listener(state));
    },
  };
}

test('modo local no llama a la API', () => {
  let called = false;
  const context = fakeContext({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const store = createStoryContentStore(context, { getStory: async () => { called = true; } });
  assert.deepEqual(store.getState(), { status: StoryContentStatus.LOCAL, story: null, error: null });
  assert.equal(called, false);
});

test('modo conectado carga la story del baseStoryId del viaje', async () => {
  const context = fakeContext({ status: TripContextStatus.LOADING, tripId: 'trip-1', trip: null, error: null });
  const story = { storyId: 'ba-2026', title: 'Buenos Aires' };
  const store = createStoryContentStore(context, { getStory: async () => ({ story }) });

  context.emit({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1', baseStoryId: 'ba-2026' }, error: null });
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(store.getState(), { status: StoryContentStatus.SUCCESS, story, error: null });
});

test('empty state: el viaje no tiene baseStoryId', async () => {
  const context = fakeContext({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  let called = false;
  const store = createStoryContentStore(context, { getStory: async () => { called = true; } });

  context.emit({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1', baseStoryId: null }, error: null });
  await Promise.resolve();

  assert.deepEqual(store.getState(), { status: StoryContentStatus.EMPTY, story: null, error: null });
  assert.equal(called, false);
});

test('empty state: la API responde 404 para el baseStoryId', async () => {
  const context = fakeContext({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const store = createStoryContentStore(context, {
    getStory: async () => { throw new PlatformApiError('Story base no encontrada.', 404); },
  });

  context.emit({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1', baseStoryId: 'inexistente' }, error: null });
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(store.getState(), { status: StoryContentStatus.EMPTY, story: null, error: null });
});

test('error state: connectedContext no pudo resolver el viaje', () => {
  const context = fakeContext({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const store = createStoryContentStore(context, { getStory: async () => {} });

  context.emit({ status: TripContextStatus.NOT_FOUND, tripId: 'trip-ajeno', trip: null, error: null });
  assert.equal(store.getState().status, StoryContentStatus.ERROR);
});

test('error state: la API de story falla con un error genérico', async () => {
  const context = fakeContext({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const store = createStoryContentStore(context, { getStory: async () => { throw new Error('sin conexión'); } });

  context.emit({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1', baseStoryId: 'ba-2026' }, error: null });
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(store.getState(), { status: StoryContentStatus.ERROR, story: null, error: 'sin conexión' });
});

test('no rompe connectedContext: connectedContext sigue resolviendo su propio estado con normalidad', async () => {
  const trip = { id: 'trip-1', baseStoryId: 'ba-2026' };
  const context = createConnectedContextStore({ getTrip: async () => ({ trip }) });
  const story = { storyId: 'ba-2026', title: 'Buenos Aires' };
  const storyStore = createStoryContentStore(context, { getStory: async () => ({ story }) });

  const contextState = await context.resolve({ search: '?tripId=trip-1' });
  assert.deepEqual(contextState, { status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip, error: null });

  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(storyStore.getState(), { status: StoryContentStatus.SUCCESS, story, error: null });
});
