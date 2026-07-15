import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WeatherProviderError,
  fetchWeather,
  isWeatherProviderSnapshot,
} from './weatherProvider.js';

const INPUT = Object.freeze({
  latitude: -34.6037,
  longitude: -58.3816,
  timezone: 'America/Argentina/Buenos_Aires',
  localDate: '2026-07-15',
});

function validPayload(overrides = {}) {
  return {
    latitude: INPUT.latitude,
    longitude: INPUT.longitude,
    timezone: INPUT.timezone,
    timezone_abbreviation: '-03',
    utc_offset_seconds: -10800,
    current_units: {
      time: 'iso8601',
      interval: 'seconds',
      temperature_2m: '°C',
      weather_code: 'wmo code',
      precipitation: 'mm',
      rain: 'mm',
      showers: 'mm',
      snowfall: 'cm',
    },
    current: {
      time: '2026-07-15T12:00',
      interval: 900,
      temperature_2m: 18.5,
      weather_code: 95,
      precipitation: 1.2,
      rain: 0.7,
      showers: 0.5,
      snowfall: 0,
    },
    daily_units: {
      time: 'iso8601',
      sunrise: 'iso8601',
      sunset: 'iso8601',
      precipitation_probability_max: '%',
    },
    daily: {
      time: ['2026-07-15'],
      sunrise: ['2026-07-15T07:55'],
      sunset: ['2026-07-15T18:03'],
      precipitation_probability_max: [80],
    },
    generationtime_ms: 0.04,
    ...overrides,
  };
}

function response(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => null },
    text: async () => (typeof payload === 'string' ? payload : JSON.stringify(payload)),
  };
}

test('fetchWeather normaliza solo campos contractuales y usa timezone/fecha explícitas', async () => {
  let requestedUrl;
  const snapshot = await fetchWeather(INPUT, {
    now: () => Date.parse('2026-07-15T15:00:00.000Z'),
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return response(validPayload());
    },
  });

  assert.deepEqual(snapshot, {
    value: {
      condition: 'storm',
      temperatureC: 18.5,
      precipitationProbability: 80,
      isRaining: true,
      isStorm: true,
      isSnow: false,
      sunrise: {
        localDateTime: '2026-07-15T07:55',
        timezone: INPUT.timezone,
      },
      sunset: {
        localDateTime: '2026-07-15T18:03',
        timezone: INPUT.timezone,
      },
      effectiveAt: {
        localDateTime: '2026-07-15T12:00',
        timezone: INPUT.timezone,
      },
      expiresAt: '2026-07-15T15:15:00.000Z',
      confidence: 'unknown',
    },
    fetchedAt: '2026-07-15T15:00:00.000Z',
    source: 'open-meteo',
  });
  assert.equal(requestedUrl.searchParams.get('timezone'), INPUT.timezone);
  assert.equal(requestedUrl.searchParams.get('start_date'), INPUT.localDate);
  assert.equal(requestedUrl.searchParams.get('end_date'), INPUT.localDate);
  assert.equal(requestedUrl.searchParams.has('generationtime_ms'), false);
});

test('fetchWeather triangula WMO nieve y no inventa lluvia', async () => {
  const payload = validPayload();
  payload.current.weather_code = 75;
  payload.current.precipitation = 0.4;
  payload.current.rain = 0;
  payload.current.showers = 0;
  payload.current.snowfall = 0.4;
  payload.daily.precipitation_probability_max = [35];

  const snapshot = await fetchWeather(INPUT, {
    now: () => Date.parse('2026-07-15T15:00:00.000Z'),
    fetchImpl: async () => response(payload),
  });

  assert.equal(snapshot.value.condition, 'snow');
  assert.equal(snapshot.value.isRaining, false);
  assert.equal(snapshot.value.isSnow, true);
  assert.equal(snapshot.value.precipitationProbability, 35);
});

test('fetchWeather rechaza HTTP, payload/unidades inválidas y más de 64 KiB con error sanitizado', async (t) => {
  await t.test('HTTP', async () => {
    await assert.rejects(
      fetchWeather(INPUT, { fetchImpl: async () => response('', { ok: false, status: 503 }) }),
      (error) =>
        error instanceof WeatherProviderError &&
        error.reason === 'weather_http_error' &&
        !JSON.stringify(error).includes(String(INPUT.latitude)),
    );
  });

  await t.test('payload', async () => {
    const payload = validPayload();
    payload.current_units.temperature_2m = '°F';
    await assert.rejects(
      fetchWeather(INPUT, { fetchImpl: async () => response(payload) }),
      (error) => error instanceof WeatherProviderError && error.reason === 'weather_invalid_response',
    );
  });

  await t.test('size', async () => {
    await assert.rejects(
      fetchWeather(INPUT, { fetchImpl: async () => response('x'.repeat(64 * 1024 + 1)) }),
      (error) => error instanceof WeatherProviderError && error.reason === 'weather_response_too_large',
    );
  });

  await t.test('body read', async () => {
    await assert.rejects(
      fetchWeather(INPUT, {
        fetchImpl: async () => ({
          ok: true,
          headers: { get: () => null },
          text: async () => {
            throw new Error(`raw coords ${INPUT.latitude}`);
          },
        }),
      }),
      (error) =>
        error instanceof WeatherProviderError &&
        error.reason === 'weather_network_error' &&
        !error.message.includes(String(INPUT.latitude)),
    );
  });
});

test('fetchWeather aplica timeout y devuelve una falla tipada sin causa cruda', async () => {
  const hangingFetch = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error(`coords=${INPUT.latitude}`)), {
        once: true,
      });
    });

  await assert.rejects(
    fetchWeather(INPUT, { fetchImpl: hangingFetch, timeoutMs: 5 }),
    (error) =>
      error instanceof WeatherProviderError &&
      error.reason === 'weather_timeout' &&
      !error.message.includes(String(INPUT.latitude)),
  );
});

test('fetchWeather rechaza input geográfico inválido antes de llamar al proveedor', async () => {
  let calls = 0;
  await assert.rejects(
    fetchWeather(
      { ...INPUT, latitude: 91 },
      {
        fetchImpl: async () => {
          calls += 1;
          return response(validPayload());
        },
      },
    ),
    (error) => error instanceof WeatherProviderError && error.reason === 'weather_invalid_request',
  );
  assert.equal(calls, 0);
});

test('isWeatherProviderSnapshot rechaza snapshots parciales, vencimientos no ISO y números no finitos', () => {
  const valid = {
    value: {
      condition: 'clear',
      temperatureC: 20,
      precipitationProbability: 0,
      isRaining: false,
      isStorm: false,
      isSnow: false,
      sunrise: null,
      sunset: null,
      effectiveAt: { localDateTime: '2026-07-15T12:00', timezone: INPUT.timezone },
      expiresAt: '2026-07-15T15:15:00.000Z',
      confidence: 'unknown',
    },
    fetchedAt: '2026-07-15T15:00:00.000Z',
    source: 'alternate-weather',
  };

  assert.equal(isWeatherProviderSnapshot(valid), true);
  assert.equal(isWeatherProviderSnapshot({ ...valid, value: { ...valid.value, temperatureC: Infinity } }), false);
  assert.equal(isWeatherProviderSnapshot({ ...valid, value: { ...valid.value, expiresAt: 'soon' } }), false);
});
