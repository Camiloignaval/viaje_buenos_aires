// Conexión a MongoDB para Aurora (Épica 5 — Persistencia Real), separada por
// completo de `mongodb.js` (el prototipo viejo, con su propia base `buenos_aires`).
// Usa una variable de entorno propia (`AURORA_MONGODB_URI`) para que nunca haya
// ambigüedad sobre a qué base se está escribiendo — ver README.md.
//
// A diferencia de `mongodb.js`, acá NUNCA se lanza un error al importar el
// módulo si falta la variable de entorno: Aurora tiene que poder arrancar y
// funcionar 100% local sin backend configurado. Cada handler de `api/aurora/*`
// llama a `isAuroraBackendConfigured()` primero y responde 503 si falta.

import { MongoClient } from 'mongodb';

export function isAuroraBackendConfigured() {
  return Boolean(process.env.AURORA_MONGODB_URI);
}

let clientPromise = null;

function getClientPromise() {
  if (!clientPromise) {
    clientPromise = globalThis._auroraMongoClientPromise;
  }
  if (!clientPromise) {
    const client = new MongoClient(process.env.AURORA_MONGODB_URI);
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
