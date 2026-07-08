// Persiste y recupera el progreso de capítulos de una historia (chapterId -> estado),
// namespaced por storyId, en un storage inyectable (por defecto, localStorage).
// No conoce Story Package ni Presentation — ver README.md.

import { ChapterStatus } from '../storyProgress/storyProgress.js';

export function progressKey(storyId) {
  return `aurora:progress:${storyId}`;
}

function getDefaultStorage() {
  return window.localStorage;
}

/** Devuelve el mapa de estados guardado, o {} si no hay nada o el dato es inválido. */
export function loadProgress(storyId, storage = getDefaultStorage()) {
  const raw = storage.getItem(progressKey(storyId));
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Guarda el progreso. Si el storage no acepta la escritura (privado, cuota llena), falla en silencio. */
export function saveProgress(storyId, chapterStatuses, storage = getDefaultStorage()) {
  try {
    storage.setItem(progressKey(storyId), JSON.stringify(chapterStatuses));
  } catch {
    // Nunca romper la experiencia por un storage que no acepta escrituras.
  }
}

/** Marca un capítulo como iniciado — nunca degrada uno que ya está finalizado. */
export function markChapterStarted(storyId, chapterId, storage = getDefaultStorage()) {
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
 * — simplificación aceptada para esta fase; Memory Engine endurecerá esta regla
 * cuando cerrar el epílogo dependa de haber respondido sus prompts.
 */
export function markChapterCompleted(storyId, chapterId, storage = getDefaultStorage()) {
  const current = loadProgress(storyId, storage);
  const updated = { ...current, [chapterId]: ChapterStatus.COMPLETED };
  saveProgress(storyId, updated, storage);
  return updated;
}
