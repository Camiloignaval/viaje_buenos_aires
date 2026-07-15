import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearWeatherMemoryCache,
  createWeatherCacheKey,
  getWeatherSnapshot,
} from './weatherCache.js';
import { WeatherProviderError } from './weatherProvider.js';

const INPUT = Object.freeze({
  latitude: -34.6037,
  longitude: -58.3816,
  timezone: 'America/Argentina/Buenos_Aires',
  localDate: '2026-07-15',
});

function snapshot(fetchedAt = '2026-07-15T15:00:00.000Z', source = 'open-meteo') {
  return {
    value: {
      condition: 'clear',
      temperatureC: 17,
      precipitationProbability: 5,
      isRaining: false,
      isStorm: false,
      isSnow: false,
      sunrise: null,
      sunset: null,
      effectiveAt: { localDateTime: '2026-07-15T12:00', timezone: INPUT.timezone },
      expiresAt: new Date(Date.parse(fetchedAt) + 15 * 60 * 1000).toISOString(),
      confidence: 'unknown',
    },
    fetchedAt,
    source,
  };
}

beforeEach(clearWeatherMemoryCache);

test('getWeatherSnapshot deduplica concurrentes y reutiliza el éxito antes de 15 minutos', async () => {
  let calls = 0;
  let release;
  const fetchWeather = () => {
    calls += 1;
    return new Promise((resolve) => {
      release = () => resolve(snapshot());
    });
  };
  let now = Date.parse('2026-07-15T15:00:00.000Z');

  const first = getWeatherSnapshot({ input: INPUT, fetchWeather, now: () => now });
  const second = getWeatherSnapshot({ input: { ...INPUT }, fetchWeather, now: () => now });
  await Promise.resolve();
  release();
  const [firstResult, secondResult] = await Promise.all([first, second]);
  const cached = await getWeatherSnapshot({ input: INPUT, fetchWeather, now: () => now + 899_999 });

  assert.equal(calls, 1);
  assert.deepEqual(firstResult, secondResult);
  assert.deepEqual(cached, firstResult);
});

test('getWeatherSnapshot expira exactamente a los 15 minutos y acepta un provider alternativo', async () => {
  let calls = 0;
  let now = Date.parse('2026-07-15T15:00:00.000Z');
  const alternateProvider = async () => {
    calls += 1;
    return snapshot(new Date(now).toISOString(), 'alternate-weather');
  };

  const first = await getWeatherSnapshot({ input: INPUT, fetchWeather: alternateProvider, now: () => now });
  now += 900_000;
  const refreshed = await getWeatherSnapshot({ input: INPUT, fetchWeather: alternateProvider, now: () => now });

  assert.equal(calls, 2);
  assert.equal(first.source, 'alternate-weather');
  assert.equal(refreshed.fetchedAt, '2026-07-15T15:15:00.000Z');
});

test('getWeatherSnapshot no cachea fallas ni snapshots inválidos y limpia in-flight', async () => {
  let calls = 0;
  const now = () => Date.parse('2026-07-15T15:00:00.000Z');
  const fetchWeather = async () => {
    calls += 1;
    if (calls === 1) throw new WeatherProviderError('weather_timeout');
    if (calls === 2) return { source: 'partial' };
    return snapshot();
  };

  await assert.rejects(() => getWeatherSnapshot({ input: INPUT, fetchWeather, now }));
  await assert.rejects(() => getWeatherSnapshot({ input: INPUT, fetchWeather, now }));
  const result = await getWeatherSnapshot({ input: INPUT, fetchWeather, now });

  assert.equal(calls, 3);
  assert.equal(result.value.condition, 'clear');
});

test('createWeatherCacheKey es estable y no expone coordenadas ni timezone', () => {
  const first = createWeatherCacheKey(INPUT);
  const equivalent = createWeatherCacheKey({ ...INPUT, latitude: -34.6037000 });
  const otherLocation = createWeatherCacheKey({ ...INPUT, latitude: -33.4489 });

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, equivalent);
  assert.notEqual(first, otherLocation);
  assert.equal(first.includes(String(INPUT.latitude)), false);
  assert.equal(first.includes(INPUT.timezone), false);
});
