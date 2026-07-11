// Cloudinary para las fotos de Alaia (Épica 5). Reutiliza la MISMA cuenta que
// el prototipo viejo (`CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` — ya existen
// si el prototipo viejo está desplegado) — no hace falta una cuenta nueva,
// las fotos de Alaia simplemente van a su propia carpeta (`alaia/<storyId>`),
// sin mezclarse con las del prototipo viejo (`ba-trip-2026`).
//
// A diferencia de `lib/cloudinary.js`, acá NUNCA se lanza un error al importar
// el módulo — Alaia tiene que poder arrancar sin backend configurado.

import { v2 as cloudinary } from 'cloudinary';

export function isCloudinaryConfigured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
}

let configured = false;

/** Devuelve el cliente de Cloudinary ya configurado, o null si faltan credenciales. */
export function getCloudinary() {
  if (!isCloudinaryConfigured()) {
    return null;
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}
