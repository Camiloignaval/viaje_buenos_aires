import { applyCors } from '../../../lib/cors.js';
import { requireTripRole } from '../../../lib/platformAuth.js';
import { getMediaAssetsCollection, toObjectId } from '../../../lib/platformMongo.js';
import { sendPlatformError } from '../../../lib/platformErrors.js';
import { getCloudinary, isCloudinaryConfigured } from '../../../lib/auroraCloudinary.js';
import {
  cloudinaryUploadOptions,
  createMediaAssetDocument,
  normalizeMediaUploadInput,
  publicMediaAsset,
} from '../../../lib/platformMedia.js';

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

function tripIdFrom(req) {
  return req.query?.tripId ?? req.query?.id;
}

async function uploadDataUrlToCloudinary({ cloudinary, tripId, input }) {
  return cloudinary.uploader.upload(input.dataUrl, cloudinaryUploadOptions({ tripId, type: input.type }));
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const tripId = tripIdFrom(req);

  try {
    const context = await requireTripRole(req, res, tripId, ['owner', 'editor']);
    if (!context) return;

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ error: 'Aurora no tiene Cloudinary configurado.' });
    }

    const input = normalizeMediaUploadInput(readBody(req));
    const tripObjectId = toObjectId(tripId, 'tripId');
    const userObjectId = toObjectId(context.user.userId, 'userId');
    const cloudinary = getCloudinary();
    const uploadResult = await uploadDataUrlToCloudinary({ cloudinary, tripId, input });
    const doc = createMediaAssetDocument({
      tripId: tripObjectId,
      userId: userObjectId,
      input,
      uploadResult,
    });

    const mediaAssets = await getMediaAssetsCollection();
    const result = await mediaAssets.insertOne(doc);
    return res.status(201).json({ mediaAsset: publicMediaAsset({ ...doc, _id: result.insertedId }) });
  } catch (error) {
    console.error('api/trips/[tripId]/media-upload error:', error);
    return sendPlatformError(res, error);
  }
}
