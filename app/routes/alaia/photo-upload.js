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
  if (!isAlaiaBackendConfigured() || !isCloudinaryConfigured()) {
    return res.status(503).json({ error: 'Alaia no tiene backend de fotos configurado.' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { storyId, accessToken, image } = req.body || {};
    if (!storyId || !accessToken) {
      return res.status(400).json({ error: "Faltan 'storyId' y/o 'accessToken'." });
    }
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Imagen inválida o faltante.' });
    }

    const storiesCol = await getStoryPackagesCollection();
    const story = await storiesCol.findOne({ storyId, accessToken });
    if (!story) {
      return res.status(403).json({ error: 'accessToken inválido para esta historia.' });
    }

    const cloudinary = getCloudinary();
    const result = await cloudinary.uploader.upload(image, {
      folder: `alaia/${storyId}`,
      resource_type: 'image',
    });

    return res.status(200).json({ url: result.secure_url });
  } catch (err) {
    console.error('api/alaia/photo-upload error:', err);
    return res.status(500).json({ error: 'No se pudo subir la imagen', detail: err.message });
  }
}
