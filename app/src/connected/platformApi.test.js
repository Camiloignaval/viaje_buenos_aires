import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestCode, verifyCode, getSession, logout, listTrips, createTrip, PlatformApiError } from './platformApi.js';

function fakeFetch(status, body) {
  const calls = [];
  const fetchImpl = async (path, options) => {
    calls.push({ path, options });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

test('requestCode postea el email y devuelve el body', async () => {
  const fetchImpl = fakeFetch(200, { ok: true });
  const result = await requestCode('kari@example.com', { fetchImpl });
  assert.deepEqual(result, { ok: true });
  assert.equal(fetchImpl.calls[0].path, '/api/auth/request-code');
  assert.equal(fetchImpl.calls[0].options.method, 'POST');
  assert.equal(fetchImpl.calls[0].options.credentials, 'include');
  assert.deepEqual(JSON.parse(fetchImpl.calls[0].options.body), { email: 'kari@example.com' });
});

test('verifyCode postea email y code', async () => {
  const fetchImpl = fakeFetch(200, { user: { id: '1', email: 'kari@example.com' } });
  const result = await verifyCode('kari@example.com', '123456', { fetchImpl });
  assert.deepEqual(result.user, { id: '1', email: 'kari@example.com' });
  assert.deepEqual(JSON.parse(fetchImpl.calls[0].options.body), { email: 'kari@example.com', code: '123456' });
});

test('getSession hace GET sin body', async () => {
  const fetchImpl = fakeFetch(200, { user: null });
  const result = await getSession({ fetchImpl });
  assert.deepEqual(result, { user: null });
  assert.equal(fetchImpl.calls[0].options.method, 'GET');
  assert.equal(fetchImpl.calls[0].options.body, undefined);
});

test('logout postea sin body', async () => {
  const fetchImpl = fakeFetch(200, { ok: true });
  await logout({ fetchImpl });
  assert.equal(fetchImpl.calls[0].path, '/api/auth/logout');
  assert.equal(fetchImpl.calls[0].options.method, 'POST');
});

test('listTrips hace GET sin body', async () => {
  const fetchImpl = fakeFetch(200, { trips: [{ id: '1', title: 'Buenos Aires' }] });
  const result = await listTrips({ fetchImpl });
  assert.deepEqual(result.trips, [{ id: '1', title: 'Buenos Aires' }]);
  assert.equal(fetchImpl.calls[0].path, '/api/trips');
  assert.equal(fetchImpl.calls[0].options.method, 'GET');
});

test('createTrip postea title y destination', async () => {
  const fetchImpl = fakeFetch(201, { trip: { id: '1', title: 'Buenos Aires', destination: 'CABA' } });
  const result = await createTrip({ title: 'Buenos Aires', destination: 'CABA' }, { fetchImpl });
  assert.deepEqual(result.trip, { id: '1', title: 'Buenos Aires', destination: 'CABA' });
  assert.equal(fetchImpl.calls[0].path, '/api/trips');
  assert.equal(fetchImpl.calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(fetchImpl.calls[0].options.body), { title: 'Buenos Aires', destination: 'CABA' });
});

test('respuesta no-ok lanza PlatformApiError con el mensaje del server', async () => {
  const fetchImpl = fakeFetch(401, { error: 'Código expirado o inválido.' });
  await assert.rejects(
    () => verifyCode('kari@example.com', '000000', { fetchImpl }),
    (error) => {
      assert.ok(error instanceof PlatformApiError);
      assert.equal(error.message, 'Código expirado o inválido.');
      assert.equal(error.status, 401);
      return true;
    }
  );
});
