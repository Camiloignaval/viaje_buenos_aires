// PATCH  /api/memories/:id  → actualiza o crea un recuerdo legacy
// DELETE /api/memories/:id  → borra un recuerdo legacy

import { getMemoriesCollection } from "../../lib/mongodb.js";
import { applyCors } from "../../lib/cors.js";
import {
  isSemanticMemoryDocument,
  isSemanticMemoryWrite,
  nonSemanticMemoryFilter,
} from "../../lib/platformSync.js";

export function createMemoryByIdHandler(dependencies = {}) {
  const collectionFor = dependencies.getMemoriesCollection ?? getMemoriesCollection;
  const cors = dependencies.applyCors ?? applyCors;
  const now = dependencies.now ?? (() => new Date().toISOString());

  return async function handler(req, res) {
    if (cors(req, res)) return;
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Falta 'id' en la URL" });
    if (isSemanticMemoryDocument({ legacyId: id })) {
      return res.status(404).json({ error: "No encontrado" });
    }

    try {
      const col = await collectionFor();

      if (req.method === "PATCH") {
        const patch = { ...(req.body || {}) };
        if (isSemanticMemoryWrite(patch)) {
          return res.status(400).json({ error: "Campos reservados" });
        }
        delete patch.id;
        patch.updatedAt = now();

        await col.updateOne(
          nonSemanticMemoryFilter({ id }),
          {
            $set: patch,
            $setOnInsert: { id, createdAt: now() },
          },
          { upsert: true },
        );

        const saved = await col.findOne(nonSemanticMemoryFilter({ id }), { projection: { _id: 0 } });
        return res.status(200).json(saved);
      }

      if (req.method === "DELETE") {
        await col.deleteOne(nonSemanticMemoryFilter({ id }));
        return res.status(204).end();
      }

      res.setHeader("Allow", ["PATCH", "DELETE"]);
      return res.status(405).json({ error: "Método no permitido" });
    } catch (err) {
      console.error("api/memories/[id] error:", err);
      return res.status(500).json({ error: "Error de servidor", detail: err.message });
    }
  };
}

export default createMemoryByIdHandler();
