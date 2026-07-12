import { applyCors } from '../../../lib/cors.js';
import { requireTripMember } from '../../../lib/platformAuth.js';
import { getMediaAssetsCollection, toObjectId } from '../../../lib/platformMongo.js';
import { sendPlatformError } from '../../../lib/platformErrors.js';
import { publicMediaAsset } from '../../../lib/platformMedia.js';

function tripIdFrom(req) {
  return req.query?.tripId ?? req.query?.id;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const tripId = tripIdFrom(req);

  try {
    const context = await requireTripMember(req, res, tripId);
    if (!context) return;

    const mediaAssets = await getMediaAssetsCollection();
    const docs = await mediaAssets.find({ tripId: toObjectId(tripId, 'tripId') }).sort({ createdAt: -1 }).toArray();
    return res.status(200).json({ media: docs.map(publicMediaAsset) });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
