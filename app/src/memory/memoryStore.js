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

function saveRaw(storyId, memories, storage) {
  storage.setItem(memoriesKey(storyId), JSON.stringify(memories));
}

/**
 * Crea una Memoria con nota. `photos`/`videos` quedan reservados (vacíos) para
 * cuando existan las fases de captura de archivos — no representan un "tipo".
 */
export function createNoteMemory(storyId, chapterId, activityId, note, storage = getDefaultStorage()) {
  const memories = loadRaw(storyId, storage);
  const memory = {
    id: crypto.randomUUID(),
    storyId,
    chapterId,
    activityId: activityId ?? null,
    note,
    photos: [],
    videos: [],
    favorite: false,
    archived: false,
    createdAt: new Date().toISOString(),
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
    memory.id === memoryId ? { ...memory, favorite: !memory.favorite } : memory
  );
  saveRaw(storyId, updated, storage);
  return updated.find((memory) => memory.id === memoryId) ?? null;
}

/** Marca una Memoria como archivada — nunca la elimina del storage. */
export function archiveMemory(storyId, memoryId, storage = getDefaultStorage()) {
  const memories = loadRaw(storyId, storage);
  const updated = memories.map((memory) => (memory.id === memoryId ? { ...memory, archived: true } : memory));
  saveRaw(storyId, updated, storage);
  return updated.find((memory) => memory.id === memoryId) ?? null;
}
