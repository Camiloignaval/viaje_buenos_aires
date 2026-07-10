import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConnectedReadinessStore, ReadinessStatus } from './connectedReadiness.js';
import { TripContextStatus } from './connectedContext.js';

/** Fake store estricto: solo getState/subscribe, como los stores reales — si el
 *  agregador intentara llamar cualquier otro método (ej. una recarga de red),
 *  el test explotaría acá en vez de pasar en falso. */
function fakeStore(initial) {
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

test('local cuando no hay tripId', () => {
  const context = fakeStore({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const story = fakeStore({ status: 'local', story: null, error: null });
  const media = fakeStore({ status: 'local', media: [], error: null });
  const readiness = createConnectedReadinessStore(context, story, media);
  assert.deepEqual(readiness.getState(), { status: ReadinessStatus.LOCAL, error: null });
});

test('loading si el contexto todavía está cargando', () => {
  const context = fakeStore({ status: TripContextStatus.LOADING, tripId: 'trip-1', trip: null, error: null });
  const story = fakeStore({ status: 'local', story: null, error: null });
  const media = fakeStore({ status: 'local', media: [], error: null });
  const readiness = createConnectedReadinessStore(context, story, media);
  assert.equal(readiness.getState().status, ReadinessStatus.LOADING);
});

test('loading si el contexto ya resolvió pero story o media siguen cargando', () => {
  const context = fakeStore({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1' }, error: null });
  const story = fakeStore({ status: 'loading', story: null, error: null });
  const media = fakeStore({ status: 'success', media: [{ id: '1' }], error: null });
  const readiness = createConnectedReadinessStore(context, story, media);
  assert.equal(readiness.getState().status, ReadinessStatus.LOADING);
});

test('ready si contexto, story y media están todos success', () => {
  const context = fakeStore({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1' }, error: null });
  const story = fakeStore({ status: 'success', story: { storyId: 'ba-2026' }, error: null });
  const media = fakeStore({ status: 'success', media: [{ id: '1' }], error: null });
  const readiness = createConnectedReadinessStore(context, story, media);
  assert.deepEqual(readiness.getState(), { status: ReadinessStatus.READY, error: null });
});

test('partial si story está empty pero media está success (y contexto success)', () => {
  const context = fakeStore({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1' }, error: null });
  const story = fakeStore({ status: 'empty', story: null, error: null });
  const media = fakeStore({ status: 'success', media: [{ id: '1' }], error: null });
  const readiness = createConnectedReadinessStore(context, story, media);
  assert.equal(readiness.getState().status, ReadinessStatus.PARTIAL);
});

test('empty si story y media están ambos empty (y contexto success)', () => {
  const context = fakeStore({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1' }, error: null });
  const story = fakeStore({ status: 'empty', story: null, error: null });
  const media = fakeStore({ status: 'empty', media: [], error: null });
  const readiness = createConnectedReadinessStore(context, story, media);
  assert.equal(readiness.getState().status, ReadinessStatus.EMPTY);
});

test('error si el contexto falla, sin importar story/media', () => {
  const context = fakeStore({ status: TripContextStatus.NOT_FOUND, tripId: 'trip-ajeno', trip: null, error: null });
  const story = fakeStore({ status: 'success', story: { storyId: 'ba-2026' }, error: null });
  const media = fakeStore({ status: 'success', media: [{ id: '1' }], error: null });
  const readiness = createConnectedReadinessStore(context, story, media);
  assert.equal(readiness.getState().status, ReadinessStatus.ERROR);
});

test('error si story o media fallan aunque el contexto haya resuelto bien', () => {
  const context = fakeStore({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1' }, error: null });
  const story = fakeStore({ status: 'error', story: null, error: 'no se pudo cargar la historia' });
  const media = fakeStore({ status: 'success', media: [{ id: '1' }], error: null });
  const readiness = createConnectedReadinessStore(context, story, media);
  assert.deepEqual(readiness.getState(), { status: ReadinessStatus.ERROR, error: 'no se pudo cargar la historia' });
});

test('reacciona a cambios posteriores en cualquiera de los tres stores', () => {
  const context = fakeStore({ status: TripContextStatus.LOADING, tripId: 'trip-1', trip: null, error: null });
  const story = fakeStore({ status: 'local', story: null, error: null });
  const media = fakeStore({ status: 'local', media: [], error: null });
  const readiness = createConnectedReadinessStore(context, story, media);
  const seen = [];
  readiness.subscribe((state) => seen.push(state.status));

  context.emit({ status: TripContextStatus.SUCCESS, tripId: 'trip-1', trip: { id: 'trip-1' }, error: null });
  story.emit({ status: 'loading', story: null, error: null });
  media.emit({ status: 'success', media: [{ id: '1' }], error: null });
  story.emit({ status: 'success', story: { storyId: 'ba-2026' }, error: null });

  assert.deepEqual(seen, [ReadinessStatus.LOADING, ReadinessStatus.LOADING, ReadinessStatus.LOADING, ReadinessStatus.READY]);
});

test('no dispara llamadas API propias: solo usa getState/subscribe de los stores inyectados', () => {
  const context = fakeStore({ status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null });
  const story = fakeStore({ status: 'local', story: null, error: null });
  const media = fakeStore({ status: 'local', media: [], error: null });
  // Si el agregador llamara algo más que getState/subscribe, estos fakes (sin
  // ningún otro método) harían explotar la construcción con un TypeError.
  assert.doesNotThrow(() => createConnectedReadinessStore(context, story, media));
});
