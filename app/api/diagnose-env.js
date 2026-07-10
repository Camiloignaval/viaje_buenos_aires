// DIAGNÓSTICO TEMPORAL — borrar este archivo una vez confirmada la causa de
// "MONGODB_URI needs to be configured" (Etapa 4). Nunca expone valores de
// variables, solo si existen y su longitud. Ver conversación: hay dos
// .env.local distintos (raíz del repo y app/.env.local) y dos proyectos
// Vercel vinculados distintos (.vercel/project.json en cada carpeta) — este
// endpoint confirma cuál cwd/.env.local está leyendo realmente `vercel dev`.
// AURORA_MONGODB_URI/AURORA_JWT_SECRET/AURORA_AUTH_CODE_SECRET fueron
// unificadas a un solo MONGODB_URI compartido con el prototipo viejo.
import { applyCors } from '../lib/cors.js';

function describe(name) {
  const value = process.env[name];
  return { present: Boolean(value), length: value ? value.length : 0 };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  return res.status(200).json({
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    MONGODB_URI: describe('MONGODB_URI'),
    AURORA_JWT_SECRET: describe('AURORA_JWT_SECRET'),
    AURORA_AUTH_CODE_SECRET: describe('AURORA_AUTH_CODE_SECRET'),
  });
}
