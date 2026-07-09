import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTripStore, TripsStatus } from './tripStore.js';

function fakeApi(overrides = {}) {
  return {
    listTrips: async () => ({ trips: [] }),
    createTrip: async ({ title, destination }) => ({ trip: { id: 'new', title, destination, updatedAt: '2026-01-02T00:00:00.000Z' } }),
    ...overrides,
  };
}

test('arranca en loading sin viajes', () => {
  const store = createTripStore(fakeApi());
  assert.deepEqual(store.getState(), { status: TripsStatus.LOADING, trips: [], error: null });
});

test('loadTrips sin resultados pasa a empty', async () => {
  const store = createTripStore(fakeApi({ listTrips: async () => ({ trips: [] }) }));
  await store.loadTrips();
  assert.deepEqual(store.getState(), { status: TripsStatus.EMPTY, trips: [], error: null });
});

test('loadTrips con resultados pasa a success y respeta el orden de la API', async () => {
  const trips = [
    { id: '1', title: 'Roma', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: '2', title: 'Buenos Aires', updatedAt: '2026-02-01T00:00:00.000Z' },
  ];
  const store = createTripStore(fakeApi({ listTrips: async () => ({ trips }) }));
  await store.loadTrips();
  const state = store.getState();
  assert.equal(state.status, TripsStatus.SUCCESS);
  assert.deepEqual(state.trips.map((t) => t.id), ['2', '1']);
});

test('loadTrips reordena por updatedAt desc aunque la API no lo haga', async () => {
  const trips = [
    { id: 'viejo', updatedAt: '2020-01-01T00:00:00.000Z' },
    { id: 'nuevo', updatedAt: '2026-01-01T00:00:00.000Z' },
  ];
  const store = createTripStore(fakeApi({ listTrips: async () => ({ trips }) }));
  await store.loadTrips();
  assert.deepEqual(store.getState().trips.map((t) => t.id), ['nuevo', 'viejo']);
});

test('loadTrips ante un error de red pasa a error con mensaje', async () => {
  const store = createTripStore(fakeApi({ listTrips: async () => { throw new Error('sin conexión'); } }));
  await store.loadTrips();
  assert.deepEqual(store.getState(), { status: TripsStatus.ERROR, trips: [], error: 'sin conexión' });
});

test('createTrip crea y refresca la lista', async () => {
  const store = createTripStore(
    fakeApi({
      listTrips: async () => ({ trips: [{ id: 'new', title: 'Bariloche', updatedAt: '2026-01-01T00:00:00.000Z' }] }),
    })
  );
  const trip = await store.createTrip({ title: 'Bariloche', destination: 'Río Negro' });
  assert.equal(trip.title, 'Bariloche');
  assert.equal(store.getState().status, TripsStatus.SUCCESS);
  assert.deepEqual(store.getState().trips.map((t) => t.id), ['new']);
});

test('createTrip que falla no toca el estado de la lista y propaga el error', async () => {
  const store = createTripStore(
    fakeApi({ createTrip: async () => { throw new Error('El viaje necesita un título.'); } })
  );
  await assert.rejects(() => store.createTrip({ title: '', destination: 'CABA' }), /título/);
  assert.equal(store.getState().status, TripsStatus.LOADING);
});

test('subscribe notifica cada cambio de estado', async () => {
  const store = createTripStore(fakeApi());
  const seen = [];
  store.subscribe((state) => seen.push(state.status));
  await store.loadTrips();
  assert.deepEqual(seen, [TripsStatus.LOADING, TripsStatus.EMPTY]);
});
