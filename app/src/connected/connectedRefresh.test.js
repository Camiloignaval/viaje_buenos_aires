import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshConnectedExperience } from './connectedRefresh.js';
import { createConnectedContextStore, TripContextStatus } from './connectedContext.js';
import { createStoryContentStore, StoryContentStatus } from './storyContentStore.js';
import { createConnectedMediaStore, ConnectedMediaStatus } from './connectedMediaStore.js';

function countingApi(overrides = {}) {
  const calls = { getTrip: 0, getStory: 0, getTripMedia: 0 };
  return {
    calls,
    getTrip: async (...args) => {
      calls.getTrip += 1;
      return overrides.getTrip ? overrides.getTrip(...args) : { trip: { id: 'trip-1', baseStoryId: 'ba-2026' } };
    },
    getStory: async (...args) => {
      calls.getStory += 1;
      return overrides.getStory ? overrides.getStory(...args) : { story: { storyId: 'ba-2026' } };
    },
    getTripMedia: async (...args) => {
      calls.getTripMedia += 1;
      return overrides.getTripMedia ? overrides.getTripMedia(...args) : { media: [{ id: 'm1' }] };
    },
  };
}

function wireConnectedStores(api) {
  const context = createConnectedContextStore({ getTrip: api.getTrip });
  const story = createStoryContentStore(context, { getStory: api.getStory });
  const media = createConnectedMediaStore(context, { getTripMedia: api.getTripMedia });
  return { context, story, media };
}

test('refresh en modo local no llama a la API', async () => {
  const api = countingApi();
  const { context, story, media } = wireConnectedStores(api);

  const state = await refreshConnectedExperience(context, { search: '' });

  assert.deepEqual(state, { status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  assert.equal(api.calls.getTrip, 0);
  assert.equal(api.calls.getStory, 0);
  assert.equal(api.calls.getTripMedia, 0);
  assert.equal(story.getState().status, StoryContentStatus.LOCAL);
  assert.equal(media.getState().status, ConnectedMediaStatus.LOCAL);
});

test('refresh en modo conectado recarga contexto, story y media', async () => {
  const api = countingApi();
  const { context, story, media } = wireConnectedStores(api);
  const location = { search: '?tripId=trip-1' };

  await refreshConnectedExperience(context, location);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(api.calls.getTrip, 1);
  assert.equal(api.calls.getStory, 1);
  assert.equal(api.calls.getTripMedia, 1);
  assert.equal(context.getState().status, TripContextStatus.SUCCESS);
  assert.equal(story.getState().status, StoryContentStatus.SUCCESS);
  assert.equal(media.getState().status, ConnectedMediaStatus.SUCCESS);

  await refreshConnectedExperience(context, location);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(api.calls.getTrip, 2);
  assert.equal(api.calls.getStory, 2);
  assert.equal(api.calls.getTripMedia, 2);
});

test('los errores de un refresh quedan representados en el estado de cada store', async () => {
  const api = countingApi({ getStory: async () => { throw new Error('story caída'); } });
  const { context, story, media } = wireConnectedStores(api);
  const location = { search: '?tripId=trip-1' };

  await refreshConnectedExperience(context, location);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(context.getState().status, TripContextStatus.SUCCESS);
  assert.deepEqual(story.getState(), { status: StoryContentStatus.ERROR, story: null, error: 'story caída' });
  assert.equal(media.getState().status, ConnectedMediaStatus.SUCCESS);
});

test('no rompe los stores existentes: siguen respondiendo a su propio contrato después de un refresh', async () => {
  const api = countingApi();
  const { context, story, media } = wireConnectedStores(api);
  await refreshConnectedExperience(context, { search: '?tripId=trip-1' });
  await Promise.resolve();
  await Promise.resolve();

  // connectedContext.resolve() sigue funcionando igual que antes de tener refresh.
  const direct = await context.resolve({ search: '' });
  assert.deepEqual(direct, { status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
});
