// Guarda y lee los bytes reales de las fotos de una Memoria, en IndexedDB — el
// único storage local con capacidad real para binarios de este tamaño.
// memoryStore.ts guarda solo metadata (nota, favoritos, id de cada foto); acá
// viven únicamente los Blob. Port TS 1:1 de memory/photoStore.js.
//
// Por qué IndexedDB y no localStorage: localStorage es síncrono, solo strings y
// ~5-10MB de cuota total. IndexedDB es asíncrono, guarda Blob nativos (sin la
// expansión ~33% de base64) y el cupo real es muchísimo mayor.

const DB_NAME = "aurora-photos";
const DB_VERSION = 1;
const STORE_NAME = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Guarda un Blob y devuelve el id generado para referenciarlo desde `photos[]` de una Memoria. */
export async function savePhotoBlob(blob: Blob): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

/** Devuelve el Blob guardado para ese id, o null si no existe. */
export async function loadPhotoBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}
