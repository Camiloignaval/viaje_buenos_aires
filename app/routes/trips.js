import { applyCors } from '../lib/cors.js';
import { requireUser } from '../lib/platformAuth.js';
import { getTripsCollection, toObjectId } from '../lib/platformMongo.js';
import { sendPlatformError } from '../lib/platformErrors.js';
import { createTripDocument, publicTripSummary } from '../lib/platformTrips.js';

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const trips = await getTripsCollection();
    const userObjectId = toObjectId(user.userId, 'userId');

    if (req.method === 'GET') {
      const docs = await trips.find({ 'members.userId': userObjectId }).sort({ updatedAt: -1 }).toArray();
      return res.status(200).json({ trips: docs.map((trip) => publicTripSummary(trip, userObjectId)) });
    }

    if (req.method === 'POST') {
      const doc = createTripDocument(readBody(req), user.userId);
      const result = await trips.insertOne(doc);
      const trip = { ...doc, _id: result.insertedId };
      return res.status(201).json({ trip: publicTripSummary(trip, userObjectId) });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
