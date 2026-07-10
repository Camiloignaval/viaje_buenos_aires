import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConnectedMediaStore, ConnectedMediaStatus } from './connectedMediaStore.js';
import { TripContextStatus } from './connectedContext.js';
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
  const store = createConnectedMediaStore(context, { getTripMedia: async () => { called = true; } });
  assert.deepEqual(store.getState(), { status: ConnectedMediaStatus.LOCAL, media: [], error: null });
  assert.equal(called, false);
});

test('modo conectado carga la media del tripId', async () => {
  const context = fakeContext({ status: TripContextStatus.LOADING, tripId: 'trip-1', trip: null, error: null });
  const media = [{ id: '1', type: 'image', url: 'https://example.com/a.jpg' }];
  const store = createConnectedMediaStore(context, { getTripMedia: async () => ({ media }) });

  context.emit({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1' }, error: null });
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(store.getState(), { status: ConnectedMediaStatus.SUCCESS, media, error: null });
});

test('empty state: el viaje no tiene media todavía', async () => {
  const context = fakeContext({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const store = createConnectedMediaStore(context, { getTripMedia: async () => ({ media: [] }) });

  context.emit({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1' }, error: null });
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(store.getState(), { status: ConnectedMediaStatus.EMPTY, media: [], error: null });
});

test('error state: connectedContext no pudo resolver el viaje', () => {
  const context = fakeContext({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const store = createConnectedMediaStore(context, { getTripMedia: async () => {} });

  context.emit({ status: TripContextStatus.NOT_FOUND, tripId: 'trip-ajeno', trip: null, error: null });
  assert.equal(store.getState().status, ConnectedMediaStatus.ERROR);
});

test('error state: la API de media falla con un error genérico', async () => {
  const context = fakeContext({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const store = createConnectedMediaStore(context, { getTripMedia: async () => { throw new Error('sin conexión'); } });

  context.emit({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1' }, error: null });
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(store.getState(), { status: ConnectedMediaStatus.ERROR, media: [], error: 'sin conexión' });
});

test('un 404 de la API se trata como empty, no como error', async () => {
  const context = fakeContext({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const store = createConnectedMediaStore(context, {
    getTripMedia: async () => { throw new PlatformApiError('No encontrado', 404); },
  });

  context.emit({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1' }, error: null });
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(store.getState(), { status: ConnectedMediaStatus.EMPTY, media: [], error: null });
});

test('no bloquea: el store arranca sincrónico en local sin awaits pendientes', () => {
  const context = fakeContext({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const store = createConnectedMediaStore(context, { getTripMedia: async () => ({ media: [] }) });
  assert.equal(store.getState().status, ConnectedMediaStatus.LOCAL);
});
