// Conexión a MongoDB para Alaia (Épica 5 — Persistencia Real).
// Usa la misma `MONGODB_URI` que `mongodb.js` (el prototipo viejo) — decisión
// explícita para no depender de una variable de entorno separada; ver README.md.
//
// A diferencia de `mongodb.js`, acá NUNCA se lanza un error al importar el
// módulo si falta la variable de entorno: Alaia tiene que poder arrancar y
// funcionar 100% local sin backend configurado. Cada handler de `api/alaia/*`
// llama a `isAlaiaBackendConfigured()` primero y responde 503 si falta.

import { MongoClient } from 'mongodb';

export function isAlaiaBackendConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

let clientPromise = null;

function getClientPromise() {
  if (!clientPromise) {
    clientPromise = globalThis._alaiaMongoClientPromise;
  }
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    clientPromise = client.connect();
    globalThis._alaiaMongoClientPromise = clientPromise;
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
