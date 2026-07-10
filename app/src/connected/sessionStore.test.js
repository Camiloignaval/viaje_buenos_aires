import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionStore, SessionStatus } from './sessionStore.js';
import { PlatformApiError } from './platformApi.js';

function fakeApi(overrides = {}) {
  return {
    requestCode: async () => ({ ok: true }),
    verifyCode: async () => ({ user: { id: '1', email: 'kari@example.com' } }),
    getSession: async () => ({ user: null }),
    logout: async () => ({ ok: true }),
    ...overrides,
  };
}

test('arranca en checking sin user', () => {
  const store = createSessionStore(fakeApi());
  assert.deepEqual(store.getState(), { status: SessionStatus.CHECKING, user: null });
});

test('getSession sin sesión pasa a anonymous', async () => {
  const store = createSessionStore(fakeApi({ getSession: async () => ({ user: null }) }));
  const state = await store.getSession();
  assert.deepEqual(state, { status: SessionStatus.ANONYMOUS, user: null });
});

test('getSession con sesión pasa a authenticated con el user', async () => {
  const user = { id: '1', email: 'kari@example.com' };
  const store = createSessionStore(fakeApi({ getSession: async () => ({ user }) }));
  const state = await store.getSession();
  assert.deepEqual(state, { status: SessionStatus.AUTHENTICATED, user });
});

test('getSession que lanza PlatformApiError (ej. 404 sin backend en npm run dev) pasa a anonymous', async () => {
  const store = createSessionStore(
    fakeApi({ getSession: async () => { throw new PlatformApiError('Error de la plataforma.', 404); } })
  );
  const state = await store.getSession();
  assert.deepEqual(state, { status: SessionStatus.ANONYMOUS, user: null });
});

test('getSession que lanza cualquier otro error (sin red, backend caído) también pasa a anonymous', async () => {
  const store = createSessionStore(fakeApi({ getSession: async () => { throw new Error('sin conexión'); } }));
  const state = await store.getSession();
  assert.deepEqual(state, { status: SessionStatus.ANONYMOUS, user: null });
});

test('getSession nunca deja el estado en checking, ni siquiera tras un error', async () => {
  const store = createSessionStore(fakeApi({ getSession: async () => { throw new Error('falla'); } }));
  await store.getSession();
  assert.notEqual(store.getState().status, SessionStatus.CHECKING);
});

test('verifyCode pasa a authenticated y devuelve el user', async () => {
  const user = { id: '1', email: 'kari@example.com' };
  const store = createSessionStore(fakeApi({ verifyCode: async () => ({ user }) }));
  const result = await store.verifyCode('kari@example.com', '123456');
  assert.deepEqual(result, user);
  assert.deepEqual(store.getState(), { status: SessionStatus.AUTHENTICATED, user });
});

test('logout vuelve a anonymous y limpia el user', async () => {
  const user = { id: '1', email: 'kari@example.com' };
  const store = createSessionStore(fakeApi({ verifyCode: async () => ({ user }) }));
  await store.verifyCode('kari@example.com', '123456');
  await store.logout();
  assert.deepEqual(store.getState(), { status: SessionStatus.ANONYMOUS, user: null });
});

test('requestCode delega en la api sin tocar el estado', async () => {
  let called = false;
  const store = createSessionStore(fakeApi({ requestCode: async (email) => { called = email; return { ok: true }; } }));
  const before = store.getState();
  const result = await store.requestCode('kari@example.com');
  assert.equal(called, 'kari@example.com');
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(store.getState(), before);
});

test('subscribe notifica en cada cambio de estado y unsubscribe corta la notificación', async () => {
  const store = createSessionStore(fakeApi());
  const seen = [];
  const unsubscribe = store.subscribe((state) => seen.push(state.status));

  await store.getSession();
  unsubscribe();
  await store.logout();

  assert.deepEqual(seen, [SessionStatus.ANONYMOUS]);
});
