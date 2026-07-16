import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWeatherHandler } from './weather.js';

const NOW = new Date('2026-07-15T15:00:00.000Z');
const BODY = Object.freeze({
  tripId: 'trip-weather',
  latitude: -34.6037,
  longitude: -58.3816,
  timezone: 'America/Argentina/Buenos_Aires',
  localDate: '2026-07-15',
});
const TRIP = Object.freeze({
  _id: BODY.tripId,
  status: 'active',
  startDateTime: '2026-07-14',
  endDateTime: '2026-07-18',
  destination: Object.freeze({
    cityId: 'ba',
    latitude: BODY.latitude,
    longitude: BODY.longitude,
    timezone: BODY.timezone,
  }),
});

function responseRecorder() {
  const headers = new Map();
  return {
    statusCode: null,
    payload: null,
    ended: false,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    getHeader(name) { return headers.get(name.toLowerCase()); },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    end() { this.ended = true; return this; },
  };
}

function normalizedSnapshot(overrides = {}) {
  return {
    value: {
      condition: 'clear', temperatureC: 18, precipitationProbability: 0,
      isRaining: false, isStorm: false, isSnow: false,
      sunrise: null, sunset: null,
      effectiveAt: { localDateTime: '2026-07-15T12:00', timezone: BODY.timezone },
      expiresAt: '2026-07-15T15:15:00.000Z', confidence: 'unknown',
    },
    fetchedAt: '2026-07-15T15:00:00.000Z',
    source: 'open-meteo',
    ...overrides,
  };
}

function enabledConfig(environment = 'development') {
  return { app: { environment }, flags: { enableWeatherProvider: true } };
}

function authorized(overrides = {}) {
  const calls = [];
  const dependencies = {
    requireUser: async () => { calls.push('auth'); return { userId: 'user-1' }; },
    requireTripMember: async (_req, _res, tripId) => {
      calls.push(`member:${tripId}`);
      return { user: { userId: 'user-1' }, trip: TRIP, role: 'owner' };
    },
    getPlatformConfig: () => enabledConfig(),
    getWeatherSnapshot: async ({ input }) => { calls.push(`weather:${input.localDate}`); return normalizedSnapshot(); },
    now: () => new Date(NOW),
    ...overrides,
  };
  return { handler: createWeatherHandler(dependencies), calls };
}

test('weather route aplica CORS y metodo antes de autenticacion', async (t) => {
  await t.test('preflight', async () => {
    let authCalls = 0;
    const handler = createWeatherHandler({ requireUser: async () => { authCalls += 1; return null; } });
    const res = responseRecorder();
    await handler({ method: 'OPTIONS', headers: {} }, res);
    assert.equal(res.statusCode, 204);
    assert.equal(res.ended, true);
    assert.equal(authCalls, 0);
  });
  await t.test('GET', async () => {
    let authCalls = 0;
    const handler = createWeatherHandler({ requireUser: async () => { authCalls += 1; return null; } });
    const res = responseRecorder();
    await handler({ method: 'GET', headers: {} }, res);
    assert.equal(res.statusCode, 405);
    assert.deepEqual(res.getHeader('allow'), ['POST']);
    assert.equal(authCalls, 0);
  });
});

test('weather route exige tripId, usuario y membresia antes de inspeccionar coordenadas', async (t) => {
  await t.test('sin tripId', async () => {
    const { tripId: _tripId, ...body } = BODY;
    let weatherCalls = 0;
    const handler = createWeatherHandler({ getWeatherSnapshot: async () => { weatherCalls += 1; } });
    const res = responseRecorder();
    await handler({ method: 'POST', headers: {}, body }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(weatherCalls, 0);
  });
  await t.test('sin sesion', async () => {
    let memberCalls = 0;
    let weatherCalls = 0;
    const handler = createWeatherHandler({
      requireUser: async (_req, res) => { res.status(401).json({ error: 'No autenticado.' }); return null; },
      requireTripMember: async () => { memberCalls += 1; },
      getWeatherSnapshot: async () => { weatherCalls += 1; },
    });
    const res = responseRecorder();
    await handler({ method: 'POST', headers: {}, body: BODY }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(memberCalls, 0);
    assert.equal(weatherCalls, 0);
  });
  await t.test('no miembro', async () => {
    let weatherCalls = 0;
    const handler = createWeatherHandler({
      requireUser: async () => ({ userId: 'other-user' }),
      requireTripMember: async (_req, res) => { res.status(403).json({ error: 'Sin acceso.' }); return null; },
      getWeatherSnapshot: async () => { weatherCalls += 1; },
    });
    const res = responseRecorder();
    await handler({ method: 'POST', headers: {}, body: { ...BODY, latitude: Infinity } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(weatherCalls, 0);
  });
});

test('weather gate default, invalido y produccion responden unavailable con cero cache/provider', async (t) => {
  const cases = [
    ['default off', () => ({ app: { environment: 'development' }, flags: { enableWeatherProvider: false } })],
    ['invalid config', () => { throw new Error('ENABLE_WEATHER_PROVIDER invalid secret'); }],
    ['production', () => enabledConfig('production')],
  ];
  for (const [name, getPlatformConfig] of cases) {
    await t.test(name, async () => {
      let weatherCalls = 0;
      const { handler, calls } = authorized({
        getPlatformConfig,
        getWeatherSnapshot: async () => { weatherCalls += 1; },
      });
      const res = responseRecorder();
      await handler({ method: 'POST', headers: {}, body: BODY }, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.payload, { available: false });
      assert.equal(weatherCalls, 0);
      assert.deepEqual(calls, ['auth', `member:${BODY.tripId}`]);
      assert.equal(JSON.stringify(res.payload).includes('ENABLE_WEATHER_PROVIDER'), false);
    });
  }
});

test('weather route falla cerrado ante trip, ciudad, timezone o fecha incompatibles', async (t) => {
  const cases = [
    ['trip', { memberTrip: { ...TRIP, _id: 'other-trip' }, body: BODY }],
    ['city coordinates', { body: { ...BODY, latitude: -33.45 } }],
    ['timezone', { body: { ...BODY, timezone: 'America/Santiago' } }],
    ['local date', { body: { ...BODY, localDate: '2026-07-16' } }],
    ['trip window', { memberTrip: { ...TRIP, startDateTime: '2026-07-16' }, body: BODY }],
  ];
  for (const [name, fixture] of cases) {
    await t.test(name, async () => {
      let weatherCalls = 0;
      const { handler } = authorized({
        requireTripMember: async () => ({ user: { userId: 'user-1' }, trip: fixture.memberTrip ?? TRIP, role: 'owner' }),
        getWeatherSnapshot: async () => { weatherCalls += 1; },
      });
      const res = responseRecorder();
      await handler({ method: 'POST', headers: {}, body: fixture.body }, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.payload, { available: false });
      assert.equal(weatherCalls, 0);
    });
  }
});

test('weather route valida body exacto despues de membership y antes de cache', async (t) => {
  const invalidBodies = [
    { ...BODY, latitude: Infinity },
    { ...BODY, longitude: 181 },
    { ...BODY, localDate: '2026-02-30' },
    { ...BODY, extra: 'not-allowed' },
  ];
  for (const body of invalidBodies) {
    await t.test(JSON.stringify(body), async () => {
      const { handler, calls } = authorized();
      const res = responseRecorder();
      await handler({ method: 'POST', headers: {}, body }, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.payload.code, 'VALIDATION_ERROR');
      assert.deepEqual(calls, ['auth', `member:${BODY.tripId}`]);
    });
  }
});

test('weather route habilitada omite provider, source y coordenadas de respuesta', async () => {
  let capturedInput;
  const { handler, calls } = authorized({
    getWeatherSnapshot: async ({ input }) => { capturedInput = input; calls.push('weather'); return normalizedSnapshot(); },
  });
  const res = responseRecorder();
  await handler({ method: 'POST', headers: {}, body: BODY }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.getHeader('cache-control'), 'private, no-store');
  assert.deepEqual(capturedInput, {
    latitude: BODY.latitude, longitude: BODY.longitude, timezone: BODY.timezone, localDate: BODY.localDate,
  });
  assert.deepEqual(res.payload, {
    available: true, value: normalizedSnapshot().value, fetchedAt: normalizedSnapshot().fetchedAt,
  });
  assert.equal(JSON.stringify(res.payload).includes('open-meteo'), false);
  assert.equal(JSON.stringify(res.payload).includes(String(BODY.latitude)), false);
  assert.deepEqual(calls, ['auth', `member:${BODY.tripId}`, 'weather']);
});

test('weather provider error, timeout o payload invalido degradan a unavailable sanitizado', async (t) => {
  const failures = [
    ['error', async () => { throw new Error(`timeout lat=${BODY.latitude} token=secret`); }],
    ['invalid', async () => ({ value: { condition: 'clear' }, source: 'private-provider' })],
  ];
  for (const [name, getWeatherSnapshot] of failures) {
    await t.test(name, async () => {
      const { handler } = authorized({ getWeatherSnapshot });
      const res = responseRecorder();
      await handler({ method: 'POST', headers: {}, body: BODY }, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.payload, { available: false });
      assert.equal(JSON.stringify(res.payload).includes('secret'), false);
      assert.equal(JSON.stringify(res.payload).includes(String(BODY.latitude)), false);
    });
  }
});
