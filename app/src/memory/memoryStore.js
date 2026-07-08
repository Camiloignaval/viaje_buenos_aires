// Crea, lee, marca favorita y archiva Memorias (modelo unificado, sin campo `type`),
// namespaced por storyId, en un storage inyectable (por defecto, localStorage).
// No conoce Story Package, Story Engine ni Presentation — ver README.md.

export function memoriesKey(storyId) {
  return `aurora:memories:${storyId}`;
}

function getDefaultStorage() {
  return window.localStorage;
}

function loadRaw(storyId, storage) {
  const raw = storage.getItem(memoriesKey(storyId));
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Guarda las Memorias. Si el storage no acepta la escritura (privado, cuota llena), falla en silencio. */
function saveRaw(storyId, memories, storage) {
  try {
    storage.setItem(memoriesKey(storyId), JSON.stringify(memories));
  } catch {
    // Nunca romper la experiencia por un storage que no acepta escrituras.
  }
}

/**
 * Crea una Memoria con nota y, opcionalmente, fotos ya guardadas en `photoStore.js`
 * (`photos` es un array de ids — la primera es la principal). `videos` queda
 * reservado (vacío) para cuando exista esa fase — no representa un "tipo".
 *
 * `options.photos`/`options.storage` van en un objeto (no posicionales) para no
 * romper por confusión de orden a quien ya llama esta función con 4 argumentos.
 */
export function createNoteMemory(storyId, chapterId, activityId, note, { photos = [], storage = getDefaultStorage() } = {}) {
  const memories = loadRaw(storyId, storage);
  const now = new Date().toISOString();
  const memory = {
    id: crypto.randomUUID(),
    storyId,
    chapterId,
    activityId: activityId ?? null,
    note,
    photos,
    videos: [],
    favorite: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  memories.push(memory);
  saveRaw(storyId, memories, storage);
  return memory;
}

/** Devuelve las Memorias de una historia. Oculta las archivadas salvo que se pida lo contrario. */
export function loadMemories(storyId, storage = getDefaultStorage(), { includeArchived = false } = {}) {
  const memories = loadRaw(storyId, storage);
  return includeArchived ? memories : memories.filter((memory) => !memory.archived);
}

/** Invierte el estado de favorita. Devuelve la Memoria actualizada, o null si no existe. */
export function toggleFavorite(storyId, memoryId, storage = getDefaultStorage()) {
  const memories = loadRaw(storyId, storage);
  const updated = memories.map((memory) =>
    memory.id === memoryId ? { ...memory, favorite: !memory.favorite, updatedAt: new Date().toISOString() } : memory
  );
  saveRaw(storyId, updated, storage);
  return updated.find((memory) => memory.id === memoryId) ?? null;
}

/** Marca una Memoria como archivada — nunca la elimina del storage. */
export function archiveMemory(storyId, memoryId, storage = getDefaultStorage()) {
  const memories = loadRaw(storyId, storage);
  const updated = memories.map((memory) =>
    memory.id === memoryId ? { ...memory, archived: true, updatedAt: new Date().toISOString() } : memory
  );
  saveRaw(storyId, updated, storage);
  return updated.find((memory) => memory.id === memoryId) ?? null;
}

/**
 * Reemplaza el id local de una foto (IndexedDB) por su URL remota definitiva
 * una vez subida a Cloudinary (Épica 5 — sync). No es una edición real del
 * recuerdo — no toca `updatedAt`, para no ganarle de más a otro dispositivo
 * en una futura fusión por "más reciente".
 */
export function promotePhotoUrl(storyId, memoryId, localId, remoteUrl, storage = getDefaultStorage()) {
  const memories = loadRaw(storyId, storage);
  const updated = memories.map((memory) =>
    memory.id === memoryId
      ? { ...memory, photos: (memory.photos ?? []).map((id) => (id === localId ? remoteUrl : id)) }
      : memory
  );
  saveRaw(storyId, updated, storage);
}

/**
 * Sobreescribe todas las Memorias de una historia con el resultado ya fusionado
 * que devuelve el servidor de sync (Épica 5) — el cliente nunca decide el
 * resultado de la fusión, solo lo aplica.
 */
export function replaceAllMemories(storyId, memories, storage = getDefaultStorage()) {
  saveRaw(storyId, memories, storage);
}
