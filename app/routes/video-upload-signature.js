// POST /api/video-upload-signature
// Los videos pesan más que las fotos y pueden superar el límite de ~4.5MB de
// las funciones serverless de Vercel. Por eso, para video, el navegador NO
// manda el archivo acá — en cambio:
//   1) pide acá una "firma" temporal (este endpoint),
//   2) sube el video DIRECTO a Cloudinary con esa firma (sin pasar por Vercel).
//
// Body: { password }
// Devuelve: { signature, timestamp, apiKey, cloudName, folder }

import cloudinary from "../lib/cloudinary.js";
import { applyCors } from "../lib/cors.js";

const FOLDER = "ba-trip-2026-videos";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { password } = req.body || {};
    const requiredPassword = process.env.UPLOAD_PASSWORD;
    if (requiredPassword && password !== requiredPassword) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { timestamp, folder: FOLDER };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

    return res.status(200).json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: FOLDER,
    });
  } catch (err) {
    console.error("api/video-upload-signature error:", err);
    return res.status(500).json({ error: "No se pudo generar la firma", detail: err.message });
  }
}
