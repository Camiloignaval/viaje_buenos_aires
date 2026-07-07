// POST /api/upload
// Recibe { image: "data:image/jpeg;base64,...", password } (ya comprimida en el navegador)
// y la sube a Cloudinary. Devuelve { imageUrl, cloudinaryPublicId }.
//
// Si existe la variable de entorno UPLOAD_PASSWORD, se exige que `password`
// coincida — así no cualquiera que tenga el link puede subir fotos. Si la
// variable no está configurada, no se pide contraseña (útil mientras se prueba).
//
// Nota: las funciones serverless de Vercel tienen un límite de ~4.5MB por
// request. Por eso el frontend comprime la imagen (ver src/image.js) antes
// de mandarla — una foto de celular normal, comprimida, pesa unos cientos de KB.

import cloudinary from "../lib/cloudinary.js";
import { applyCors } from "../lib/cors.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { image, password } = req.body || {};

    const requiredPassword = process.env.UPLOAD_PASSWORD;
    if (requiredPassword && password !== requiredPassword) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return res.status(400).json({ error: "Imagen inválida o faltante" });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: "ba-trip-2026",
      resource_type: "image",
    });

    return res.status(200).json({
      imageUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
    });
  } catch (err) {
    console.error("api/upload error:", err);
    return res.status(500).json({ error: "No se pudo subir la imagen", detail: err.message });
  }
}
