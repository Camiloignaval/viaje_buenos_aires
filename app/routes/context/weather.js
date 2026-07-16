import { applyCors } from '../../lib/cors.js';
import { requireTripMember, requireUser } from '../../lib/platformAuth.js';
import { getPlatformConfig } from '../../lib/platformConfig.js';
import { sendPlatformError, ValidationError } from '../../lib/platformErrors.js';
import { getWeatherSnapshot } from '../../lib/context/weatherCache.js';
import { isWeatherProviderSnapshot, isWeatherRequestInput } from '../../lib/context/weatherProvider.js';

const REQUEST_KEYS = ['tripId', 'latitude', 'longitude', 'timezone', 'localDate'];
const ENABLED_ENVIRONMENTS = new Set(['development', 'test']);

function readBody(rawBody) {
  if (typeof rawBody !== 'string') return rawBody;
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new ValidationError('El cuerpo Weather no es JSON valido.');
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  const actual = Object.keys(value);
  const allowed = new Set(keys);
  return actual.length === keys.length && actual.every((key) => allowed.has(key));
}

function tripIdFromBody(body) {
  if (!isRecord(body) || typeof body.tripId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(body.tripId)) {
    throw new ValidationError('El viaje Weather es invalido.');
  }
  return body.tripId;
}

export function parseWeatherRequest(rawBody) {
  const body = readBody(rawBody);
  if (!isRecord(body) || !hasExactKeys(body, REQUEST_KEYS)) {
    throw new ValidationError('El cuerpo Weather es invalido.');
  }
  const tripId = tripIdFromBody(body);
  const input = {
    latitude: body.latitude,
    longitude: body.longitude,
    timezone: body.timezone,
    localDate: body.localDate,
  };
  if (!isWeatherRequestInput(input)) {
    throw new ValidationError('Los datos Weather son invalidos.');
  }
  return Object.freeze({ tripId, input: Object.freeze(input) });
}

function localCalendarDate(now, timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const part = (type) => parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch {
    return null;
  }
}

function calendarPart(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

function matchesAuthorizedTrip(tripId, input, trip, now) {
  const destination = isRecord(trip?.destination) ? trip.destination : null;
  const start = calendarPart(trip?.startDateTime);
  const end = calendarPart(trip?.endDateTime);
  const today = destination ? localCalendarDate(now, destination.timezone) : null;
  return Boolean(
    trip
    && String(trip._id ?? trip.id ?? '') === tripId
    && trip.status === 'active'
    && destination
    && destination.latitude === input.latitude
    && destination.longitude === input.longitude
    && destination.timezone === input.timezone
    && today === input.localDate
    && start && end
    && input.localDate >= start
    && input.localDate <= end,
  );
}

function providerEnabled(readConfig) {
  try {
    const config = readConfig();
    return config?.flags?.enableWeatherProvider === true
      && ENABLED_ENVIRONMENTS.has(String(config?.app?.environment ?? '').toLowerCase());
  } catch {
    return false;
  }
}

function unavailable(res) {
  return res.status(200).json({ available: false });
}

function publicSnapshot(snapshot) {
  if (!isWeatherProviderSnapshot(snapshot)) return null;
  return Object.freeze({
    available: true,
    value: snapshot.value,
    fetchedAt: snapshot.fetchedAt,
  });
}

export function createWeatherHandler({
  applyCors: cors = applyCors,
  requireUser: authenticate = requireUser,
  requireTripMember: authorizeTrip = requireTripMember,
  getPlatformConfig: readConfig = getPlatformConfig,
  getWeatherSnapshot: resolveWeather = getWeatherSnapshot,
  now = () => new Date(),
} = {}) {
  return async function weatherHandler(req, res) {
    if (cors(req, res)) return;
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Metodo no permitido' });
    }

    let body;
    let tripId;
    try {
      body = readBody(req.body);
      tripId = tripIdFromBody(body);
    } catch (error) {
      return sendPlatformError(res, error);
    }

    const session = await authenticate(req, res);
    if (!session) return;
    const membership = await authorizeTrip(req, res, tripId);
    if (!membership) return;

    if (!providerEnabled(readConfig)) return unavailable(res);

    let parsed;
    try {
      parsed = parseWeatherRequest(body);
    } catch (error) {
      return sendPlatformError(res, error);
    }
    if (!matchesAuthorizedTrip(parsed.tripId, parsed.input, membership.trip, now())) return unavailable(res);

    try {
      const snapshot = publicSnapshot(await resolveWeather({ input: parsed.input }));
      return snapshot ? res.status(200).json(snapshot) : unavailable(res);
    } catch {
      return unavailable(res);
    }
  };
}

export default createWeatherHandler();
