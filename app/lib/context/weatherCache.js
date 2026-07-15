import crypto from 'node:crypto';
import {
  isWeatherProviderSnapshot,
  openMeteoWeatherProvider,
  WEATHER_TTL_MS,
  WeatherProviderError,
} from './weatherProvider.js';

function cache() {
  return (globalThis._alaiaWeatherCache ??= new Map());
}

function inFlight() {
  return (globalThis._alaiaWeatherInFlight ??= new Map());
}

function normalizedCoordinate(value) {
  return Number(value).toFixed(6);
}

export function createWeatherCacheKey(input) {
  const identity = JSON.stringify([
    normalizedCoordinate(input.latitude),
    normalizedCoordinate(input.longitude),
    input.timezone,
    input.localDate,
  ]);
  return crypto.createHash('sha256').update(identity).digest('hex');
}

export async function getWeatherSnapshot({
  input,
  fetchWeather = openMeteoWeatherProvider.fetchWeather,
  now = Date.now,
}) {
  const key = createWeatherCacheKey(input);
  const currentTime = now();
  const cached = cache().get(key);
  if (cached && currentTime < cached.cachedUntil) return cached.snapshot;
  if (cached) cache().delete(key);

  const requests = inFlight();
  if (!requests.has(key)) {
    requests.set(
      key,
      Promise.resolve()
        .then(() => fetchWeather(input, { now }))
        .then((snapshot) => {
          if (!isWeatherProviderSnapshot(snapshot)) {
            throw new WeatherProviderError('weather_invalid_response');
          }
          const storedAt = now();
          const cachedUntil = Math.min(
            storedAt + WEATHER_TTL_MS,
            Date.parse(snapshot.value.expiresAt),
          );
          if (!Number.isFinite(storedAt) || cachedUntil <= storedAt) {
            throw new WeatherProviderError('weather_expired_response');
          }
          cache().set(key, { snapshot, cachedUntil });
          return snapshot;
        })
        .finally(() => requests.delete(key)),
    );
  }
  return requests.get(key);
}

export function clearWeatherMemoryCache() {
  cache().clear();
  inFlight().clear();
}
