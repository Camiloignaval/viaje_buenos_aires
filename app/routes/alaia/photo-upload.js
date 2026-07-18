// POST /api/alaia/photo-upload
// Recibe { storyId, accessToken, image: "data:image/jpeg;base64,..." } y la
// sube a Cloudinary, en la carpeta propia de esa historia. Devuelve { url }.
// El mismo accessToken que habilita sincronizar habilita subir fotos — no hay
// un segundo secreto separado (ver README.md de `sync/`).

import { isAlaiaBackendConfigured, getStoryPackagesCollection } from '../../lib/alaiaMongo.js';
import { getCloudinary, isCloudinaryConfigured } from '../../lib/alaiaCloudinary.js';
import { applyCors } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  // Config faltante ⇒ 503 con `code` explícito para que el cliente distinga
  // "no configurado" de un fallo real de subida (nunca se imprime el secreto).
  if (!isAlaiaBackendConfigured()) {
    return res.status(503).json({ error: 'Alaia no tiene backend configurado (falta MONGODB_URI).', code: 'backend_not_configured' });
  }
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({
      error: 'Alaia no tiene Cloudinary configurado (falta CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).',
      code: 'cloudinary_not_configured',
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido', code: 'method_not_allowed' });
  }

  try {
    const { storyId, accessToken, image } = req.body || {};
    if (!storyId || !accessToken) {
      return res.status(400).json({ error: "Faltan 'storyId' y/o 'accessToken'.", code: 'missing_fields' });
    }
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Imagen inválida o faltante.', code: 'invalid_image' });
    }

    const storiesCol = await getStoryPackagesCollection();
    const story = await storiesCol.findOne({ storyId, accessToken });
    if (!story) {
      return res.status(403).json({ error: 'accessToken inválido para esta historia.', code: 'invalid_token' });
    }

    const cloudinary = getCloudinary();
    const result = await cloudinary.uploader.upload(image, {
      folder: `alaia/${storyId}`,
      resource_type: 'image',
    });

    // Se conserva la info útil de Cloudinary (antes se descartaba public_id/asset_id):
    // el cliente solo considera "subida" una respuesta con `url` HTTPS válida.
    return res.status(200).json({
      url: result.secure_url,
      publicId: result.public_id,
      assetId: result.asset_id ?? null,
    });
  } catch (err) {
    console.error('api/alaia/photo-upload error:', err.message);
    return res.status(500).json({ error: 'No se pudo subir la imagen', code: 'upload_failed', detail: err.message });
  }
}
