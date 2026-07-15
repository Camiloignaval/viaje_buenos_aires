import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWeatherHandler } from './weather.js';
import { WeatherProviderError } from '../../lib/context/weatherProvider.js';
import { createSessionToken, SESSION_COOKIE_NAME } from '../../lib/platformAuth.js';

const BODY = Object.freeze({
  latitude: -34.6037,
  longitude: -58.3816,
  timezone: 'America/Argentina/Buenos_Aires',
  localDate: '2026-07-15',
});

function responseRecorder() {
  const headers = new Map();
  return {
    statusCode: null,
    payload: null,
    ended: false,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name) {
      return headers.get(name.toLowerCase());
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

function normalizedSnapshot() {
  return {
    value: {
      condition: 'clear',
      temperatureC: 18,
      precipitationProbability: 0,
      isRaining: false,
      isStorm: false,
      isSnow: false,
      sunrise: null,
      sunset: null,
      effectiveAt: { localDateTime: '2026-07-15T12:00', timezone: BODY.timezone },
      expiresAt: '2026-07-15T15:15:00.000Z',
      confidence: 'unknown',
    },
    fetchedAt: '2026-07-15T15:00:00.000Z',
    source: 'open-meteo',
  };
}

test('weather route aplica CORS/preflight antes de auth', async () => {
  let authCalls = 0;
  const handler = createWeatherHandler({
    requireUser: async () => {
      authCalls += 1;
      return null;
    },
  });
  const res = responseRecorder();

  await handler({ method: 'OPTIONS', headers: {} }, res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.equal(res.getHeader('access-control-allow-methods'), 'GET,POST,PATCH,DELETE,OPTIONS');
  assert.equal(authCalls, 0);
});

test('weather route rechaza método antes de auth y anuncia solo POST', async () => {
  let authCalls = 0;
  const handler = createWeatherHandler({
    requireUser: async () => {
      authCalls += 1;
      return { userId: 'u1' };
    },
  });
  const res = responseRecorder();

  await handler({ method: 'GET', headers: {} }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.getHeader('allow'), ['POST']);
  assert.equal(authCalls, 0);
});

test('weather route exige sesión y no consulta el provider si falta', async () => {
  let weatherCalls = 0;
  const handler = createWeatherHandler({
    requireUser: async (_req, res) => {
      res.status(401).json({ error: 'No autenticado.' });
      return null;
    },
    getWeatherSnapshot: async () => {
      weatherCalls += 1;
    },
  });
  const res = responseRecorder();

  await handler({ method: 'POST', headers: {}, body: BODY }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(weatherCalls, 0);
});

test('weather route valida body exacto, rangos finitos, fecha y timezone IANA', async (t) => {
  const invalidBodies = [
    { ...BODY, latitude: Infinity },
    { ...BODY, longitude: 181 },
    { ...BODY, timezone: 'Buenos Aires' },
    { ...BODY, localDate: '2026-02-30' },
    { ...BODY, extra: 'not-allowed' },
  ];
  for (const body of invalidBodies) {
    await t.test(JSON.stringify(body), async () => {
      let calls = 0;
      const handler = createWeatherHandler({
        requireUser: async () => ({ userId: 'u1' }),
        getWeatherSnapshot: async () => {
          calls += 1;
        },
      });
      const res = responseRecorder();
      await handler({ method: 'POST', headers: {}, body }, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.payload.code, 'VALIDATION_ERROR');
      assert.equal(calls, 0);
    });
  }
});

test('weather route responde solo snapshot normalizado con no-store', async () => {
  let capturedInput;
  const expected = normalizedSnapshot();
  const handler = createWeatherHandler({
    requireUser: async () => ({ userId: 'u1' }),
    getWeatherSnapshot: async ({ input }) => {
      capturedInput = input;
      return expected;
    },
  });
  const res = responseRecorder();

  await handler({ method: 'POST', headers: {}, body: BODY }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.getHeader('cache-control'), 'private, no-store');
  assert.deepEqual(capturedInput, BODY);
  assert.deepEqual(res.payload, expected);
});

test('weather route usa requireUser real con la cookie de sesión de la plataforma', async () => {
  const previousSecret = process.env.ALAIA_JWT_SECRET;
  const secret = 'weather-route-test-secret';
  process.env.ALAIA_JWT_SECRET = secret;
  try {
    const token = createSessionToken(
      { id: 'user-1', email: 'kari@example.com' },
      { secret, now: Date.now() },
    );
    let calls = 0;
    const handler = createWeatherHandler({
      getWeatherSnapshot: async () => {
        calls += 1;
        return normalizedSnapshot();
      },
    });
    const res = responseRecorder();

    await handler(
      {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
        body: BODY,
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(calls, 1);
  } finally {
    if (previousSecret === undefined) delete process.env.ALAIA_JWT_SECRET;
    else process.env.ALAIA_JWT_SECRET = previousSecret;
  }
});

test('weather route sanitiza fallas del provider', async () => {
  const handler = createWeatherHandler({
    requireUser: async () => ({ userId: 'u1' }),
    getWeatherSnapshot: async () => {
      throw new WeatherProviderError('weather_timeout', new Error(`lat=${BODY.latitude}`));
    },
  });
  const res = responseRecorder();

  await handler({ method: 'POST', headers: {}, body: BODY }, res);

  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.payload, {
    error: 'No se pudo obtener el clima.',
    code: 'EXTERNAL_SERVICE_UNAVAILABLE',
  });
  assert.equal(JSON.stringify(res.payload).includes(String(BODY.latitude)), false);
});
