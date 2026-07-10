// POST /api/aurora/sync
// Recibe el estado local de un dispositivo ({ storyId, accessToken,
// chapterStatuses, memories }), lo fusiona con lo que ya hay guardado (si hay
// otro dispositivo que sincronizó antes) y devuelve el resultado fusionado —
// el cliente sobreescribe su estado local con la respuesta, nunca al revés.
//
// La fusión es la MISMA función pura que se prueba en `syncMerge.test.js` —
// nada de lógica de conflictos vive solo acá, sin test.

import { isAuroraBackendConfigured, getStoryPackagesCollection, getStoryStateCollection } from '../../lib/auroraMongo.js';
import { applyCors } from '../../lib/cors.js';
import { mergeChapterStatuses, mergeMemories } from '../../src/sync/syncMerge.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!isAuroraBackendConfigured()) {
    return res.status(503).json({ error: 'Aurora no tiene backend configurado (falta MONGODB_URI).' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { storyId, accessToken, chapterStatuses = {}, memories = [] } = req.body || {};
    if (!storyId || !accessToken) {
      return res.status(400).json({ error: "Faltan 'storyId' y/o 'accessToken'." });
    }

    const storiesCol = await getStoryPackagesCollection();
    const story = await storiesCol.findOne({ storyId, accessToken });
    if (!story) {
      return res.status(403).json({ error: 'accessToken inválido para esta historia.' });
    }

    const stateCol = await getStoryStateCollection();
    const remote = await stateCol.findOne({ storyId });

    const mergedChapterStatuses = mergeChapterStatuses(chapterStatuses, remote?.chapterStatuses ?? {});
    const mergedMemories = mergeMemories(memories, remote?.memories ?? []);

    await stateCol.updateOne(
      { storyId },
      { $set: { storyId, chapterStatuses: mergedChapterStatuses, memories: mergedMemories, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    return res.status(200).json({ chapterStatuses: mergedChapterStatuses, memories: mergedMemories });
  } catch (err) {
    console.error('api/aurora/sync error:', err);
    return res.status(500).json({ error: 'Error de servidor', detail: err.message });
  }
}
