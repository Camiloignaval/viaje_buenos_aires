// Notas privadas de un viaje: existen para RECORDAR, no para organizar. "Solo
// texto" — sin formato enriquecido. Pertenecen al VIAJE (namespaced por scope =
// tripId), nunca al Story Package; nunca modifican contenido curado. Privadas:
// no se comparten ni se exponen. Persistencia local (se escriben offline sin
// perder datos ni duplicarse), guardado silencioso.
//
// Cada nota apunta a un objetivo (un lugar, un momento, un día, una actividad),
// nunca global. Guarda updatedAt para dejar preparada la resolución de
// conflictos futura (sin implementar sincronización compleja todavía).

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Límite razonable: una nota, no un bloc de notas. Documentado. */
export const NOTE_MAX_LENGTH = 2000;

export interface PrivateNote {
  targetId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export type NotesMap = Record<string, PrivateNote>;

export function notesKey(scopeId: string): string {
  return `alaia:notes:${scopeId}`;
}

function getDefaultStorage(): KeyValueStorage {
  return window.localStorage;
}

export function loadNotes(
  scopeId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): NotesMap {
  const raw = storage.getItem(notesKey(scopeId));
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as NotesMap)
      : {};
  } catch {
    return {};
  }
}

function persist(scopeId: string, map: NotesMap, storage: KeyValueStorage): void {
  try {
    storage.setItem(notesKey(scopeId), JSON.stringify(map));
  } catch {
    // Nunca romper la escritura de una nota por un storage lleno o privado.
  }
}

export function getNote(
  scopeId: string,
  targetId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): PrivateNote | null {
  return loadNotes(scopeId, storage)[targetId] ?? null;
}

/**
 * Guarda (crea o actualiza) el texto de una nota. Recorta y aplica el límite.
 * Texto vacío tras recortar → elimina la nota (no deja notas fantasma).
 * Idempotente por targetId: reescribir nunca duplica.
 */
export function saveNote(
  scopeId: string,
  targetId: string,
  text: string,
  storage: KeyValueStorage = getDefaultStorage(),
): NotesMap {
  const trimmed = String(text ?? "").slice(0, NOTE_MAX_LENGTH);
  const current = loadNotes(scopeId, storage);

  if (trimmed.trim().length === 0) {
    if (!current[targetId]) return current;
    const cleared = { ...current };
    delete cleared[targetId];
    persist(scopeId, cleared, storage);
    return cleared;
  }

  const now = new Date().toISOString();
  const existing = current[targetId];
  const updated: NotesMap = {
    ...current,
    [targetId]: {
      targetId,
      text: trimmed,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
  persist(scopeId, updated, storage);
  return updated;
}

export function deleteNote(
  scopeId: string,
  targetId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): NotesMap {
  const current = loadNotes(scopeId, storage);
  if (!current[targetId]) return current;
  const updated = { ...current };
  delete updated[targetId];
  persist(scopeId, updated, storage);
  return updated;
}
