// GET  /api/memories  → devuelve todos los recuerdos como { [id]: Memory }
// POST /api/memories  → crea un recuerdo si no existe (upsert por id)

import { getMemoriesCollection } from "../lib/mongodb.js";
import { applyCors } from "../lib/cors.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  try {
    const col = await getMemoriesCollection();

    if (req.method === "GET") {
      const docs = await col.find({}, { projection: { _id: 0 } }).toArray();
      const map = {};
      docs.forEach((doc) => {
        map[doc.id] = doc;
      });
      return res.status(200).json(map);
    }

    if (req.method === "POST") {
      const { id, title, day, category } = req.body || {};
      if (!id) return res.status(400).json({ error: "Falta 'id'" });

      const now = new Date().toISOString();
      await col.updateOne(
        { id },
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
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      );

      const saved = await col.findOne({ id }, { projection: { _id: 0 } });
      return res.status(201).json(saved);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("api/memories error:", err);
    return res.status(500).json({ error: "Error de servidor", detail: err.message });
  }
}
