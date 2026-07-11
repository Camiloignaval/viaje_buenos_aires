// Fusiona el estado local con el estado remoto de una historia (Épica 5 —
// Persistencia Real). Funciones puras: mismo input, mismo output siempre. No
// tocan red ni storage — las usan tanto `syncClient.js` (cliente) como
// `api/alaia/sync.js` (servidor, único punto de verdad de la fusión).
//
// No es un CRDT ni resuelve conflictos campo por campo: es la estrategia más
// simple que sigue siendo correcta para una app personal de pocas personas,
// escrita a mano y no editada concurrentemente campo por campo. Ver README.md.

import { ChapterStatus } from '../story/storyProgress/storyProgress.js';

const STATUS_RANK = {
  [ChapterStatus.LOCKED]: 0,
  [ChapterStatus.AVAILABLE]: 1,
  [ChapterStatus.STARTED]: 2,
  [ChapterStatus.COMPLETED]: 3,
};

/**
 * Fusiona dos mapas de estado de capítulos. Un estado nunca retrocede (regla
 * ya existente en storyProgress.js: Started/Completed son "pegajosos") — fusionar
 * es simplemente quedarse, por capítulo, con el estado más avanzado de los dos.
 */
export function mergeChapterStatuses(a = {}, b = {}) {
  const merged = {};
  const chapterIds = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const id of chapterIds) {
    const statusA = a[id];
    const statusB = b[id];
    if (!statusA) {
      merged[id] = statusB;
    } else if (!statusB) {
      merged[id] = statusA;
    } else {
      merged[id] = (STATUS_RANK[statusB] ?? 0) > (STATUS_RANK[statusA] ?? 0) ? statusB : statusA;
    }
  }
  return merged;
}

function lastUpdate(memory) {
  return memory.updatedAt ?? memory.createdAt ?? '';
}

/**
 * Fusiona dos listas de Memorias por `id`. Una Memoria que solo existe de un
 * lado se conserva tal cual. Si existe de los dos lados (el mismo id se editó
 * en dos dispositivos, ej. favorito/archivado), gana la que se actualizó más
 * tarde (`updatedAt`, con `createdAt` como respaldo si falta) — simple, y
 * suficiente para el volumen y la concurrencia real de esta app.
 */
export function mergeMemories(a = [], b = []) {
  const byId = new Map();
  for (const memory of a) {
    byId.set(memory.id, memory);
  }
  for (const memory of b) {
    const existing = byId.get(memory.id);
    if (!existing || lastUpdate(memory) > lastUpdate(existing)) {
      byId.set(memory.id, memory);
    }
  }
  return [...byId.values()];
}
