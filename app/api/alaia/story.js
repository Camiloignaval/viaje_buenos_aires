// GET  /api/alaia/story?storyId=X&token=Y  → devuelve el Story Package publicado
// POST /api/alaia/story                    → Alaia Studio: publica/actualiza un Story
//                                              Package (protegido por AURORA_ADMIN_PASSWORD)
//
// Republicar un `storyId` que ya existe actualiza su contenido pero CONSERVA el
// `accessToken` ya emitido — un link/QR ya compartido nunca se invalida por
// corregir el contenido de la historia.

import crypto from 'node:crypto';
import { isAlaiaBackendConfigured, getStoryPackagesCollection } from '../../lib/alaiaMongo.js';
import { applyCors } from '../../lib/cors.js';
import { loadStoryPackage, StoryPackageValidationError } from '../../src/story/storyPackage/storyPackage.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!isAlaiaBackendConfigured()) {
    return res.status(503).json({ error: 'Alaia no tiene backend configurado (falta MONGODB_URI).' });
  }

  try {
    const col = await getStoryPackagesCollection();

    if (req.method === 'GET') {
      const { storyId, token } = req.query || {};
      if (!storyId || !token) {
        return res.status(400).json({ error: "Faltan 'storyId' y/o 'token'." });
      }
      const doc = await col.findOne({ storyId, accessToken: token }, { projection: { _id: 0 } });
      if (!doc) {
        return res.status(404).json({ error: 'No existe esa historia con ese token.' });
      }
      return res.status(200).json({ storyPackage: doc.storyPackage, publishedAt: doc.publishedAt });
    }

    if (req.method === 'POST') {
      const requiredPassword = process.env.AURORA_ADMIN_PASSWORD;
      const { password, storyPackage: rawStoryPackage } = req.body || {};
      if (requiredPassword && password !== requiredPassword) {
        return res.status(401).json({ error: 'Contraseña incorrecta.' });
      }

      let storyPackage;
      try {
        storyPackage = loadStoryPackage(rawStoryPackage);
      } catch (err) {
        if (err instanceof StoryPackageValidationError) {
          return res.status(400).json({ error: 'Story Package inválido.', detail: err.message });
        }
        throw err;
      }

      const existing = await col.findOne({ storyId: storyPackage.storyId });
      const accessToken = existing?.accessToken ?? crypto.randomUUID();

      await col.updateOne(
        { storyId: storyPackage.storyId },
        { $set: { storyId: storyPackage.storyId, storyPackage, accessToken, publishedAt: new Date().toISOString() } },
        { upsert: true }
      );

      return res.status(200).json({ storyId: storyPackage.storyId, accessToken });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('api/alaia/story error:', err);
    return res.status(500).json({ error: 'Error de servidor', detail: err.message });
  }
}
