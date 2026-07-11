// Persiste y recupera el progreso de capítulos de una historia (chapterId → estado),
// namespaced por storyId, en un storage inyectable (por defecto, localStorage).
// No conoce Story Package ni Presentation. Port TS 1:1 de progressStore/progressStore.js.

import { ChapterStatus } from "./types";
import type { ChapterStatuses } from "./types";

/** Subconjunto de la Storage API que estas funciones realmente usan (inyectable en tests). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function progressKey(storyId: string): string {
  return `aurora:progress:${storyId}`;
}

function getDefaultStorage(): KeyValueStorage {
  return window.localStorage;
}

/** Devuelve el mapa de estados guardado, o {} si no hay nada o el dato es inválido. */
export function loadProgress(
  storyId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): ChapterStatuses {
  const raw = storage.getItem(progressKey(storyId));
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as ChapterStatuses)
      : {};
  } catch {
    return {};
  }
}

/** Guarda el progreso. Si el storage no acepta la escritura (privado, cuota llena), falla en silencio. */
export function saveProgress(
  storyId: string,
  chapterStatuses: ChapterStatuses,
  storage: KeyValueStorage = getDefaultStorage(),
): void {
  try {
    storage.setItem(progressKey(storyId), JSON.stringify(chapterStatuses));
  } catch {
    // Nunca romper la experiencia por un storage que no acepta escrituras.
  }
}

/** Marca un capítulo como iniciado — nunca degrada uno que ya está finalizado. */
export function markChapterStarted(
  storyId: string,
  chapterId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): ChapterStatuses {
  const current = loadProgress(storyId, storage);
  if (current[chapterId] === ChapterStatus.COMPLETED) {
    return current;
  }
  const updated = { ...current, [chapterId]: ChapterStatus.STARTED };
  saveProgress(storyId, updated, storage);
  return updated;
}

/**
 * Marca un capítulo como finalizado. Se permite incluso si nunca pasó por "iniciado"
 * — simplificación aceptada para esta fase.
 */
export function markChapterCompleted(
  storyId: string,
  chapterId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): ChapterStatuses {
  const current = loadProgress(storyId, storage);
  const updated = { ...current, [chapterId]: ChapterStatus.COMPLETED };
  saveProgress(storyId, updated, storage);
  return updated;
}
