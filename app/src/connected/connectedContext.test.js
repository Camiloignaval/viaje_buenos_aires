import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConnectedContextStore, readTripId, TripContextStatus } from './connectedContext.js';
import { PlatformApiError } from './platformApi.js';

function locationWithTripId(tripId) {
  return { search: tripId ? `?tripId=${tripId}` : '' };
}

test('readTripId lee ?tripId= de la URL', () => {
  assert.equal(readTripId(locationWithTripId('abc123')), 'abc123');
  assert.equal(readTripId(locationWithTripId(null)), null);
});

test('sin tripId en la URL arranca y resuelve a local, sin llamar a la API', async () => {
  let called = false;
  const store = createConnectedContextStore({ getTrip: async () => { called = true; } });
  assert.equal(store.getState().status, TripContextStatus.LOCAL);

  const state = await store.resolve(locationWithTripId(null));
  assert.deepEqual(state, { status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  assert.equal(called, false);
});

test('con tripId, pasa por loading y llega a success con el viaje', async () => {
  const trip = { id: 'trip-1', title: 'Buenos Aires', destination: 'CABA' };
  const seen = [];
  const store = createConnectedContextStore({ getTrip: async () => ({ trip }) });
  store.subscribe((state) => seen.push(state.status));

  const state = await store.resolve(locationWithTripId('trip-1'));
  assert.deepEqual(state, { status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip, error: null });
  assert.deepEqual(seen, [TripContextStatus.LOADING, TripContextStatus.SUCCESS]);
});

test('un viaje inexistente o sin acceso (403) resuelve a not-found', async () => {
  const store = createConnectedContextStore({
    getTrip: async () => { throw new PlatformApiError('No tenés acceso a este viaje.', 403); },
  });
  const state = await store.resolve(locationWithTripId('trip-ajeno'));
  assert.deepEqual(state, { status: TripContextStatus.NOT_FOUND, tripId: 'trip-ajeno', trip: null, error: null });
});

test('un error de red o del server resuelve a error con mensaje', async () => {
  const store = createConnectedContextStore({
    getTrip: async () => { throw new Error('sin conexión'); },
  });
  const state = await store.resolve(locationWithTripId('trip-1'));
  assert.deepEqual(state, { status: TripContextStatus.ERROR, tripId: 'trip-1', trip: null, error: 'sin conexión' });
});
