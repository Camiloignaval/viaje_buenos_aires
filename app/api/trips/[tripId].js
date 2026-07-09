import { applyCors } from '../../lib/cors.js';
import { requireTripMember, requireTripRole } from '../../lib/platformAuth.js';
import { getTripsCollection, toObjectId } from '../../lib/platformMongo.js';
import { normalizeTripPatch, publicTripDetail } from '../../lib/platformTrips.js';

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

function tripIdFrom(req) {
  return req.query?.tripId ?? req.query?.id;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const tripId = tripIdFrom(req);

  try {
    if (req.method === 'GET') {
      const context = await requireTripMember(req, res, tripId);
      if (!context) return;
      return res.status(200).json({ trip: publicTripDetail(context.trip, context.user.userId) });
    }

    if (req.method === 'PATCH') {
      const context = await requireTripRole(req, res, tripId, ['owner']);
      if (!context) return;

      const patch = normalizeTripPatch(readBody(req));
      const now = new Date().toISOString();
      const trips = await getTripsCollection();

      await trips.updateOne(
        { _id: toObjectId(tripId, 'tripId') },
        { $set: { ...patch, updatedAt: now } }
      );

      const updated = await trips.findOne({ _id: toObjectId(tripId, 'tripId') });
      return res.status(200).json({ trip: publicTripDetail(updated, context.user.userId) });
    }

    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
