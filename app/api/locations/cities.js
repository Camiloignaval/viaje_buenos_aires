import { applyCors } from '../../lib/cors.js';
import { requireUser } from '../../lib/platformAuth.js';
import { sendPlatformError } from '../../lib/platformErrors.js';
import { searchCities } from '../../lib/platformGeo.js';

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const session = await requireUser(req, res);
  if (!session) return;

  try {
    const country = String(req.query.country ?? '').trim().toUpperCase();
    const q = String(req.query.q ?? '').trim();

    if (!COUNTRY_CODE_PATTERN.test(country)) {
      return res.status(400).json({ error: 'País inválido.' });
    }
    if (q.length < 2) {
      return res.status(200).json({ cities: [] });
    }

    const cities = await searchCities({ countryCode: country, query: q, limit: 8 });
    return res.status(200).json({ cities });
  } catch (error) {
    return sendPlatformError(res, error, { fallbackMessage: 'No se pudieron buscar ciudades.' });
  }
}
