// GET  /api/memories  → devuelve recuerdos legacy como { [id]: Memory }
// POST /api/memories  → crea un recuerdo legacy si no existe

import { getMemoriesCollection } from "../lib/mongodb.js";
import { applyCors } from "../lib/cors.js";
import { isSemanticMemoryDocument, nonSemanticMemoryFilter } from "../lib/platformSync.js";

export function createMemoriesHandler(dependencies = {}) {
  const collectionFor = dependencies.getMemoriesCollection ?? getMemoriesCollection;
  const cors = dependencies.applyCors ?? applyCors;
  const now = dependencies.now ?? (() => new Date().toISOString());

  return async function handler(req, res) {
    if (cors(req, res)) return;
    try {
      const col = await collectionFor();

      if (req.method === "GET") {
        const docs = await col.find(nonSemanticMemoryFilter(), { projection: { _id: 0 } }).toArray();
        const map = {};
        docs.forEach((doc) => {
          map[doc.id] = doc;
        });
        return res.status(200).json(map);
      }

      if (req.method === "POST") {
        const { id, title, day, category } = req.body || {};
        if (!id) return res.status(400).json({ error: "Falta 'id'" });
        if (isSemanticMemoryDocument({ legacyId: id })) {
          return res.status(400).json({ error: "Id reservado" });
        }

        const createdAt = now();
        await col.updateOne(
          nonSemanticMemoryFilter({ id }),
          {
            $setOnInsert: {
              id,
              title: title || "",
              day: day ?? null,
              category: category || "",
              completed: false,
              note: "",
              imageUrl: null,
              cloudinaryPublicId: null,
              createdAt,
              updatedAt: createdAt,
            },
          },
          { upsert: true },
        );

        const saved = await col.findOne(nonSemanticMemoryFilter({ id }), { projection: { _id: 0 } });
        return res.status(201).json(saved);
      }

      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).json({ error: "Método no permitido" });
    } catch (err) {
      console.error("api/memories error:", err);
      return res.status(500).json({ error: "Error de servidor", detail: err.message });
    }
  };
}

export default createMemoriesHandler();
