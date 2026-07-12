// Fusiona el estado local con el estado remoto de una historia (Épica 5).
// Funciones puras: mismo input, mismo output siempre. No tocan red ni storage.
// Port TS 1:1 de sync/syncMerge.js.

import { ChapterStatus } from "@/features/story/engine/storyProgress";
import type { ChapterStatuses, ChapterStatusValue } from "@/features/story/engine/types";
import type { Memory } from "@/features/album/data/types";

const STATUS_RANK: Record<ChapterStatusValue, number> = {
  [ChapterStatus.LOCKED]: 0,
  [ChapterStatus.AVAILABLE]: 1,
  [ChapterStatus.STARTED]: 2,
  [ChapterStatus.COMPLETED]: 3,
};

/**
 * Fusiona dos mapas de estado de capítulos. Un estado nunca retrocede: fusionar
 * es quedarse, por capítulo, con el estado más avanzado de los dos.
 */
export function mergeChapterStatuses(
  a: ChapterStatuses = {},
  b: ChapterStatuses = {},
): ChapterStatuses {
  const merged: ChapterStatuses = {};
  const chapterIds = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const id of chapterIds) {
    const statusA = a[id];
    const statusB = b[id];
    if (!statusA) {
      merged[id] = statusB;
    } else if (!statusB) {
      merged[id] = statusA;
    } else {
      merged[id] =
        (STATUS_RANK[statusB] ?? 0) > (STATUS_RANK[statusA] ?? 0)
          ? statusB
          : statusA;
    }
  }
  return merged;
}

function lastUpdate(memory: Memory): string {
  return memory.updatedAt ?? memory.createdAt ?? "";
}

/**
 * Fusiona dos listas de Memorias por `id`. Una que solo existe de un lado se
 * conserva. Si existe de los dos, gana la que se actualizó más tarde.
 */
export function mergeMemories(a: Memory[] = [], b: Memory[] = []): Memory[] {
  const byId = new Map<string, Memory>();
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
