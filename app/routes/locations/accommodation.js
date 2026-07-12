import { applyCors } from '../../lib/cors.js';
import { requireUser } from '../../lib/platformAuth.js';
import { sendPlatformError } from '../../lib/platformErrors.js';
import { searchPlaces } from '../../lib/platformGeo.js';

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
    const city = String(req.query.city ?? '').trim();
    const q = String(req.query.q ?? '').trim();

    if (q.length < 2) {
      return res.status(200).json({ places: [] });
    }

    const places = await searchPlaces({ countryCode: country || undefined, cityName: city, query: q, limit: 8 });
    return res.status(200).json({ places });
  } catch (error) {
    return sendPlatformError(res, error, { fallbackMessage: 'No se pudo buscar el alojamiento.' });
  }
}
