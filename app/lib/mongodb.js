// Conexión a MongoDB, reutilizable entre invocaciones de funciones serverless.
// En serverless, cada función puede "enfriarse" y volver a arrancar, así que
// cacheamos la promesa de conexión en `global` para no abrir una conexión
// nueva en cada request (Mongo Atlas tiene un límite de conexiones simultáneas).

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "Falta la variable de entorno MONGODB_URI. Configurala en Vercel (Settings → Environment Variables) o en .env.local para desarrollo con 'vercel dev'."
  );
}

let clientPromise = globalThis._baTripMongoClientPromise;

if (!clientPromise) {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
  globalThis._baTripMongoClientPromise = clientPromise;
}

export async function getDb() {
  const client = await clientPromise;
  // Sin nombre: usa la base indicada en el propio connection string (buenos_aires)
  return client.db();
}

export async function getMemoriesCollection() {
  const db = await getDb();
  return db.collection("memories");
}
