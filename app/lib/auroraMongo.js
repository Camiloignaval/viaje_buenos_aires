// Conexión a MongoDB para Aurora (Épica 5 — Persistencia Real).
// Usa la misma `MONGODB_URI` que `mongodb.js` (el prototipo viejo) — decisión
// explícita para no depender de una variable de entorno separada; ver README.md.
//
// A diferencia de `mongodb.js`, acá NUNCA se lanza un error al importar el
// módulo si falta la variable de entorno: Aurora tiene que poder arrancar y
// funcionar 100% local sin backend configurado. Cada handler de `api/aurora/*`
// llama a `isAuroraBackendConfigured()` primero y responde 503 si falta.

import { MongoClient } from 'mongodb';

export function isAuroraBackendConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

let clientPromise = null;

function getClientPromise() {
  if (!clientPromise) {
    clientPromise = globalThis._auroraMongoClientPromise;
  }
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    clientPromise = client.connect();
    globalThis._auroraMongoClientPromise = clientPromise;
  }
  return clientPromise;
}

async function getDb() {
  const client = await getClientPromise();
  return client.db();
}

export async function getStoryPackagesCollection() {
  const db = await getDb();
  return db.collection('storyPackages');
}

export async function getStoryStateCollection() {
  const db = await getDb();
  return db.collection('storyState');
}
