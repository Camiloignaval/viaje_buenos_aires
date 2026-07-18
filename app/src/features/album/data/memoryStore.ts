// Crea, lee, marca favorita y archiva Memorias (modelo unificado, sin campo `type`),
// namespaced por storyId, en un storage inyectable (por defecto, localStorage).
// Port TS 1:1 de memory/memoryStore.js. Solo guarda metadata: los bytes de las
// fotos viven en photoStore.ts (IndexedDB).

import type { KeyValueStorage, Memory } from "./types";

export function memoriesKey(storyId: string): string {
  return `alaia:memories:${storyId}`;
}

function getDefaultStorage(): KeyValueStorage {
  return window.localStorage;
}

function loadRaw(storyId: string, storage: KeyValueStorage): Memory[] {
  const raw = storage.getItem(memoriesKey(storyId));
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Memory[]) : [];
  } catch {
    return [];
  }
}

/** Guarda las Memorias. Si el storage no acepta la escritura, falla en silencio. */
function saveRaw(
  storyId: string,
  memories: Memory[],
  storage: KeyValueStorage,
): void {
  try {
    storage.setItem(memoriesKey(storyId), JSON.stringify(memories));
  } catch {
    // Nunca romper la experiencia por un storage que no acepta escrituras.
  }
}

interface CreateNoteMemoryOptions {
  photos?: string[];
  storage?: KeyValueStorage;
}

/**
 * Crea una Memoria con nota y, opcionalmente, fotos ya guardadas en photoStore.ts
 * (`photos` es un array de ids — la primera es la principal).
 */
export function createNoteMemory(
  storyId: string,
  chapterId: string,
  activityId: string | null,
  note: string,
  { photos = [], storage = getDefaultStorage() }: CreateNoteMemoryOptions = {},
): Memory {
  const memories = loadRaw(storyId, storage);
  const now = new Date().toISOString();
  const memory: Memory = {
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
export function loadMemories(
  storyId: string,
  storage: KeyValueStorage = getDefaultStorage(),
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Memory[] {
  const memories = loadRaw(storyId, storage);
  return includeArchived
    ? memories
    : memories.filter((memory) => !memory.archived);
}

/** Invierte el estado de favorita. Devuelve la Memoria actualizada, o null si no existe. */
export function toggleFavorite(
  storyId: string,
  memoryId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): Memory | null {
  const memories = loadRaw(storyId, storage);
  const updated = memories.map((memory) =>
    memory.id === memoryId
      ? { ...memory, favorite: !memory.favorite, updatedAt: new Date().toISOString() }
      : memory,
  );
  saveRaw(storyId, updated, storage);
  return updated.find((memory) => memory.id === memoryId) ?? null;
}

/** Marca una Memoria como archivada — nunca la elimina del storage. */
export function archiveMemory(
  storyId: string,
  memoryId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): Memory | null {
  const memories = loadRaw(storyId, storage);
  const updated = memories.map((memory) =>
    memory.id === memoryId
      ? { ...memory, archived: true, updatedAt: new Date().toISOString() }
      : memory,
  );
  saveRaw(storyId, updated, storage);
  return updated.find((memory) => memory.id === memoryId) ?? null;
}

/**
 * Edita una Memoria ya guardada reusando el MISMO storage (no crea persistencia
 * nueva): permite cambiar la nota y/o la lista de fotos (agregar o quitar). La
 * primera del array sigue siendo la principal. Toca `updatedAt` porque es una
 * edición real del usuario. Devuelve la Memoria actualizada, o null si no existe.
 */
export function updateMemory(
  storyId: string,
  memoryId: string,
  patch: { note?: string; photos?: string[] },
  storage: KeyValueStorage = getDefaultStorage(),
): Memory | null {
  const memories = loadRaw(storyId, storage);
  const updated = memories.map((memory) =>
    memory.id === memoryId
      ? {
          ...memory,
          ...(patch.note !== undefined ? { note: patch.note } : {}),
          ...(patch.photos !== undefined ? { photos: patch.photos } : {}),
          updatedAt: new Date().toISOString(),
        }
      : memory,
  );
  saveRaw(storyId, updated, storage);
  return updated.find((memory) => memory.id === memoryId) ?? null;
}

/**
 * Reemplaza el id local de una foto (IndexedDB) por su URL remota definitiva una
 * vez subida a Cloudinary. No toca `updatedAt` (no es una edición real).
 */
export function promotePhotoUrl(
  storyId: string,
  memoryId: string,
  localId: string,
  remoteUrl: string,
  storage: KeyValueStorage = getDefaultStorage(),
): void {
  const memories = loadRaw(storyId, storage);
  const updated = memories.map((memory) =>
    memory.id === memoryId
      ? {
          ...memory,
          photos: (memory.photos ?? []).map((id) =>
            id === localId ? remoteUrl : id,
          ),
        }
      : memory,
  );
  saveRaw(storyId, updated, storage);
}

/**
 * Sobreescribe todas las Memorias de una historia con el resultado ya fusionado
 * que devuelve el servidor de sync — el cliente nunca decide el resultado.
 */
export function replaceAllMemories(
  storyId: string,
  memories: Memory[],
  storage: KeyValueStorage = getDefaultStorage(),
): void {
  saveRaw(storyId, memories, storage);
}
