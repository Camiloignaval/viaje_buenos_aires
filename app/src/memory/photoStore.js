// Guarda y lee los bytes reales de las fotos de una Memoria, en IndexedDB — el
// único storage local con capacidad real para binarios de este tamaño.
// `memoryStore.js` sigue guardando solo metadata (nota, favoritos, y el id de
// cada foto); acá viven únicamente los Blob. No conoce Story Package, Story
// Engine ni Presentation — ver README.md.
//
// Por qué IndexedDB y no localStorage: localStorage es síncrono, solo guarda
// strings y tiene ~5-10MB de cuota total para todo el origen — una sola foto
// de celular en base64 puede ocupar varios MB. IndexedDB es asíncrono (no
// bloquea la UI), guarda Blob nativos (sin la expansión ~33% de base64) y
// el cupo real es muchísimo mayor. Los Blob URLs (`URL.createObjectURL`) no
// sirven como storage — son referencias de memoria que no sobreviven un
// reload; se usan solo para pintar, nunca para persistir.

const DB_NAME = 'aurora-photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function openDb() {
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
export async function savePhotoBlob(blob) {
  const db = await openDb();
  const id = crypto.randomUUID();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

/** Devuelve el Blob guardado para ese id, o null si no existe. */
export async function loadPhotoBlob(id) {
  const db = await openDb();
  const blob = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}
