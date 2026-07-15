import { ExternalServiceUnavailableError } from '../platformErrors.js';

const PROVIDER_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const PROVIDER_NAME = 'open-meteo';
export const WEATHER_TTL_MS = 15 * 60 * 1000;
export const WEATHER_REQUEST_TIMEOUT_MS = 5000;
export const WEATHER_MAX_RESPONSE_BYTES = 64 * 1024;

const CONDITIONS = new Set([
  'clear',
  'cloudy',
  'fog',
  'rain',
  'storm',
  'snow',
  'freezing',
  'unknown',
]);

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

export class WeatherProviderError extends ExternalServiceUnavailableError {
  constructor(reason = 'weather_failed') {
    super('El servicio de clima no está disponible en este momento.', {
      provider: 'weather',
      reason,
    });
    this.reason = reason;
  }
}

function providerError(reason) {
  return new WeatherProviderError(reason);
}

function isFiniteInRange(value, minimum, maximum) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isValidIsoInstant(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isValidLocalDate(value) {
  if (typeof value !== 'string' || !LOCAL_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidLocalDateTime(value) {
  if (typeof value !== 'string' || !LOCAL_DATE_TIME_PATTERN.test(value)) return false;
  const [date, time] = value.split('T');
  if (!isValidLocalDate(date)) return false;
  const [hour, minute, second = 0] = time.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}

function isValidTimeZone(value) {
  if (typeof value !== 'string' || !value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function hasExactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === [...expected].sort()[index]);
}

export function isWeatherRequestInput(input) {
  return (
    hasExactKeys(input, ['latitude', 'longitude', 'timezone', 'localDate']) &&
    isFiniteInRange(input.latitude, -90, 90) &&
    isFiniteInRange(input.longitude, -180, 180) &&
    isValidTimeZone(input.timezone) &&
    isValidLocalDate(input.localDate)
  );
}

function isLocalDateTime(value) {
  return (
    hasExactKeys(value, ['localDateTime', 'timezone']) &&
    isValidLocalDateTime(value.localDateTime) &&
    isValidTimeZone(value.timezone)
  );
}

export function isWeatherProviderSnapshot(snapshot) {
  if (!hasExactKeys(snapshot, ['value', 'fetchedAt', 'source'])) return false;
  if (!isValidIsoInstant(snapshot.fetchedAt) || typeof snapshot.source !== 'string' || !snapshot.source) {
    return false;
  }
  const value = snapshot.value;
  if (
    !hasExactKeys(value, [
      'condition',
      'temperatureC',
      'precipitationProbability',
      'isRaining',
      'isStorm',
      'isSnow',
      'sunrise',
      'sunset',
      'effectiveAt',
      'expiresAt',
      'confidence',
    ]) ||
    !CONDITIONS.has(value.condition) ||
    !isFiniteInRange(value.temperatureC, -100, 70) ||
    !(
      value.precipitationProbability === null ||
      isFiniteInRange(value.precipitationProbability, 0, 100)
    ) ||
    typeof value.isRaining !== 'boolean' ||
    typeof value.isStorm !== 'boolean' ||
    typeof value.isSnow !== 'boolean' ||
    !(value.sunrise === null || isLocalDateTime(value.sunrise)) ||
    !(value.sunset === null || isLocalDateTime(value.sunset)) ||
    !isLocalDateTime(value.effectiveAt) ||
    !isValidIsoInstant(value.expiresAt) ||
    Date.parse(value.expiresAt) - Date.parse(snapshot.fetchedAt) !== WEATHER_TTL_MS ||
    value.confidence !== 'unknown'
  ) {
    return false;
  }
  return true;
}

function mapWeatherCode(code) {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ([56, 57, 66, 67].includes(code)) return 'freezing';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95 && code <= 99) return 'storm';
  if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) return 'rain';
  return 'unknown';
}

function validateUnits(payload) {
  const current = payload.current_units;
  const daily = payload.daily_units;
  return (
    current?.temperature_2m === '°C' &&
    current?.weather_code === 'wmo code' &&
    current?.precipitation === 'mm' &&
    current?.rain === 'mm' &&
    current?.showers === 'mm' &&
    current?.snowfall === 'cm' &&
    daily?.time === 'iso8601' &&
    daily?.sunrise === 'iso8601' &&
    daily?.sunset === 'iso8601' &&
    daily?.precipitation_probability_max === '%'
  );
}

function firstDailyValue(payload, field, index) {
  const values = payload.daily?.[field];
  return Array.isArray(values) ? values[index] : undefined;
}

function normalizePayload(payload, input, fetchedAt) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw providerError('weather_invalid_response');
  }
  if (payload.timezone !== input.timezone || !validateUnits(payload)) {
    throw providerError('weather_invalid_response');
  }

  const current = payload.current;
  const dailyTimes = payload.daily?.time;
  const dailyIndex = Array.isArray(dailyTimes) ? dailyTimes.indexOf(input.localDate) : -1;
  const sunrise = firstDailyValue(payload, 'sunrise', dailyIndex);
  const sunset = firstDailyValue(payload, 'sunset', dailyIndex);
  const probability = firstDailyValue(payload, 'precipitation_probability_max', dailyIndex);
  const code = current?.weather_code;
  if (
    dailyIndex < 0 ||
    !isValidLocalDateTime(current?.time) ||
    !current.time.startsWith(`${input.localDate}T`) ||
    !Number.isInteger(code) ||
    code < 0 ||
    code > 99 ||
    !isFiniteInRange(current?.temperature_2m, -100, 70) ||
    !isFiniteInRange(current?.precipitation, 0, 1000) ||
    !isFiniteInRange(current?.rain, 0, 1000) ||
    !isFiniteInRange(current?.showers, 0, 1000) ||
    !isFiniteInRange(current?.snowfall, 0, 1000) ||
    !isValidLocalDateTime(sunrise) ||
    !isValidLocalDateTime(sunset) ||
    !isFiniteInRange(probability, 0, 100)
  ) {
    throw providerError('weather_invalid_response');
  }

  const condition = mapWeatherCode(code);
  const value = {
    condition,
    temperatureC: current.temperature_2m,
    precipitationProbability: probability,
    isRaining:
      condition === 'rain' ||
      condition === 'storm' ||
      condition === 'freezing' ||
      current.rain > 0 ||
      current.showers > 0,
    isStorm: condition === 'storm',
    isSnow: condition === 'snow' || current.snowfall > 0,
    sunrise: { localDateTime: sunrise, timezone: input.timezone },
    sunset: { localDateTime: sunset, timezone: input.timezone },
    effectiveAt: { localDateTime: current.time, timezone: input.timezone },
    expiresAt: new Date(Date.parse(fetchedAt) + WEATHER_TTL_MS).toISOString(),
    confidence: 'unknown',
  };
  const snapshot = { value, fetchedAt, source: PROVIDER_NAME };
  if (!isWeatherProviderSnapshot(snapshot)) throw providerError('weather_invalid_response');
  return snapshot;
}

async function readBoundedJson(response) {
  const contentLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(contentLength) && contentLength > WEATHER_MAX_RESPONSE_BYTES) {
    throw providerError('weather_response_too_large');
  }

  let text;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > WEATHER_MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw providerError('weather_response_too_large');
      }
      chunks.push(value);
    }
    text = new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  } else {
    text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > WEATHER_MAX_RESPONSE_BYTES) {
      throw providerError('weather_response_too_large');
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    throw providerError('weather_invalid_response');
  }
}

function buildProviderUrl(input) {
  const url = new URL(PROVIDER_BASE_URL);
  url.searchParams.set('latitude', String(input.latitude));
  url.searchParams.set('longitude', String(input.longitude));
  url.searchParams.set('timezone', input.timezone);
  url.searchParams.set('start_date', input.localDate);
  url.searchParams.set('end_date', input.localDate);
  url.searchParams.set(
    'current',
    'temperature_2m,weather_code,precipitation,rain,showers,snowfall',
  );
  url.searchParams.set('daily', 'sunrise,sunset,precipitation_probability_max');
  return url;
}

export async function fetchWeather(
  input,
  {
    fetchImpl = globalThis.fetch,
    now = Date.now,
    signal,
    timeoutMs = WEATHER_REQUEST_TIMEOUT_MS,
  } = {},
) {
  if (!isWeatherRequestInput(input)) throw providerError('weather_invalid_request');
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;
  let response;
  try {
    response = await fetchImpl(buildProviderUrl(input), {
      signal: combinedSignal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (timeoutController.signal.aborted || error?.name === 'TimeoutError') {
      throw providerError('weather_timeout');
    }
    throw providerError('weather_network_error');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response?.ok) throw providerError('weather_http_error');
  let payload;
  try {
    payload = await readBoundedJson(response);
  } catch (error) {
    if (error instanceof WeatherProviderError) throw error;
    throw providerError('weather_network_error');
  }
  const timestamp = now();
  if (!Number.isFinite(timestamp)) throw providerError('weather_invalid_clock');
  return normalizePayload(payload, input, new Date(timestamp).toISOString());
}

export const openMeteoWeatherProvider = Object.freeze({
  name: PROVIDER_NAME,
  fetchWeather,
});
