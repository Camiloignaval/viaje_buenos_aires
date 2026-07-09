import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTripInput, createTripFormController } from './createTripForm.js';

function fakeTrips(overrides = {}) {
  return {
    createTrip: async ({ title, destination }) => ({ id: 'new', title, destination }),
    ...overrides,
  };
}

test('validateTripInput exige título y destino', () => {
  assert.deepEqual(validateTripInput({ title: '', destination: '' }), {
    title: 'El viaje necesita un título.',
    destination: 'El viaje necesita un destino.',
  });
  assert.deepEqual(validateTripInput({ title: '  ', destination: 'CABA' }), {
    title: 'El viaje necesita un título.',
  });
  assert.deepEqual(validateTripInput({ title: 'Buenos Aires', destination: 'CABA' }), {});
});

test('arranca cerrado', () => {
  const form = createTripFormController(fakeTrips());
  assert.equal(form.getState().open, false);
});

test('open() abre el formulario limpio', () => {
  const form = createTripFormController(fakeTrips());
  form.open();
  assert.deepEqual(form.getState(), { open: true, title: '', destination: '', errors: {}, submitting: false, submitError: null });
});

test('cancel() vuelve a cerrado y limpia todo', () => {
  const form = createTripFormController(fakeTrips());
  form.open();
  form.cancel();
  assert.equal(form.getState().open, false);
});

test('submit() con campos vacíos no crea el viaje y expone errores', async () => {
  let called = false;
  const form = createTripFormController(fakeTrips({ createTrip: async () => { called = true; } }));
  form.open();
  const result = await form.submit({ title: '', destination: '' });
  assert.equal(result, null);
  assert.equal(called, false);
  assert.deepEqual(form.getState().errors, {
    title: 'El viaje necesita un título.',
    destination: 'El viaje necesita un destino.',
  });
});

test('submit() válido crea el viaje, marca submitting durante el pedido y cierra el form al éxito', async () => {
  const seenSubmitting = [];
  const trips = fakeTrips({
    createTrip: async (input) => {
      seenSubmitting.push(form.getState().submitting);
      return { id: 'new', ...input };
    },
  });
  const form = createTripFormController(trips);
  form.open();
  const trip = await form.submit({ title: 'Buenos Aires', destination: 'CABA' });
  assert.deepEqual(trip, { id: 'new', title: 'Buenos Aires', destination: 'CABA' });
  assert.deepEqual(seenSubmitting, [true]);
  assert.equal(form.getState().open, false);
});

test('submit() que falla mantiene los valores tipeados y expone el error del server', async () => {
  const form = createTripFormController(fakeTrips({ createTrip: async () => { throw new Error('El destino no puede quedar vacío.'); } }));
  form.open();
  const result = await form.submit({ title: 'Buenos Aires', destination: 'CABA' });
  assert.equal(result, null);
  const state = form.getState();
  assert.equal(state.submitting, false);
  assert.equal(state.submitError, 'El destino no puede quedar vacío.');
  assert.equal(state.title, 'Buenos Aires');
  assert.equal(state.destination, 'CABA');
});

test('subscribe notifica cada transición de estado', async () => {
  const form = createTripFormController(fakeTrips());
  const seen = [];
  form.subscribe((state) => seen.push(state.open));
  form.open();
  await form.submit({ title: 'Buenos Aires', destination: 'CABA' });
  assert.deepEqual(seen, [true, true, false]);
});
