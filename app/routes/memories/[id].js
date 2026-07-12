// PATCH  /api/memories/:id  → actualiza (o crea) completed / note / imageUrl / etc.
// DELETE /api/memories/:id  → borra un recuerdo puntual

import { getMemoriesCollection } from "../../lib/mongodb.js";
import { applyCors } from "../../lib/cors.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Falta 'id' en la URL" });

  try {
    const col = await getMemoriesCollection();

    if (req.method === "PATCH") {
      const patch = { ...(req.body || {}) };
      delete patch.id; // el id no se reescribe
      patch.updatedAt = new Date().toISOString();

      await col.updateOne(
        { id },
        {
          $set: patch,
          $setOnInsert: { id, createdAt: new Date().toISOString() },
        },
        { upsert: true }
      );

      const saved = await col.findOne({ id }, { projection: { _id: 0 } });
      return res.status(200).json(saved);
    }

    if (req.method === "DELETE") {
      await col.deleteOne({ id });
      return res.status(204).end();
    }

    res.setHeader("Allow", ["PATCH", "DELETE"]);
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("api/memories/[id] error:", err);
    return res.status(500).json({ error: "Error de servidor", detail: err.message });
  }
}
