import { applyCors } from '../../lib/cors.js';
import { requireUser } from '../../lib/platformAuth.js';
import { sendPlatformError, ValidationError } from '../../lib/platformErrors.js';
import { getWeatherSnapshot } from '../../lib/context/weatherCache.js';
import { isWeatherRequestInput } from '../../lib/context/weatherProvider.js';

function readBody(rawBody) {
  if (typeof rawBody !== 'string') return rawBody;
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new ValidationError('El cuerpo Weather no es JSON válido.');
  }
}

export function parseWeatherRequest(rawBody) {
  const body = readBody(rawBody);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('El cuerpo Weather es inválido.');
  }
  if (!isWeatherRequestInput(body)) {
    throw new ValidationError('Los datos Weather son inválidos.');
  }
  return Object.freeze({
    latitude: body.latitude,
    longitude: body.longitude,
    timezone: body.timezone,
    localDate: body.localDate,
  });
}

export function createWeatherHandler({
  applyCors: cors = applyCors,
  requireUser: authenticate = requireUser,
  getWeatherSnapshot: resolveWeather = getWeatherSnapshot,
} = {}) {
  return async function weatherHandler(req, res) {
    if (cors(req, res)) return;
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const session = await authenticate(req, res);
    if (!session) return;

    let input;
    try {
      input = parseWeatherRequest(req.body);
    } catch (error) {
      return sendPlatformError(res, error);
    }

    try {
      const snapshot = await resolveWeather({ input });
      return res.status(200).json(snapshot);
    } catch (error) {
      return sendPlatformError(res, error, {
        fallbackMessage: 'No se pudo obtener el clima.',
      });
    }
  };
}

export default createWeatherHandler();
