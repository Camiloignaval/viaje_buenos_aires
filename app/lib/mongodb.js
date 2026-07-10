// Conexión a MongoDB, reutilizable entre invocaciones de funciones serverless.
// En serverless, cada función puede "enfriarse" y volver a arrancar, así que
// cacheamos la promesa de conexión en `global` para no abrir una conexión
// nueva en cada request (Mongo Atlas tiene un límite de conexiones simultáneas).
//
// El chequeo de la variable de entorno es DELIBERADAMENTE lazy (dentro de la
// función, no al importar el módulo): un throw a nivel de módulo puede tirar
// abajo todo el proceso de `vercel dev` si algo bundlea/evalúa este archivo
// antes de que el entorno esté cargado — mismo patrón que auroraMongo.js y
// platformMongo.js.

import { MongoClient } from "mongodb";

let clientPromise = null;

function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Falta la variable de entorno MONGODB_URI. Configurala en Vercel (Settings → Environment Variables) o en .env.local para desarrollo con 'vercel dev'."
    );
  }
  if (!clientPromise) {
    clientPromise = globalThis._baTripMongoClientPromise;
  }
  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
    globalThis._baTripMongoClientPromise = clientPromise;
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  // Sin nombre: usa la base indicada en el propio connection string (buenos_aires)
  return client.db();
}

export async function getMemoriesCollection() {
  const db = await getDb();
  return db.collection("memories");
}
