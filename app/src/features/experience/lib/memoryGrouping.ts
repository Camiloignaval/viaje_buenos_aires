// Agrupa/ordena Memorias ya guardadas. Port verbatim de render.js
// (groupMemoriesByActivity / mostRecent / byCreatedAt).

import type { Memory } from "@/features/album/data/types";

/** La Memoria más reciente de una lista (o null). */
export function mostRecent(memories: Memory[] | undefined): Memory | null {
  if (!memories || memories.length === 0) {
    return null;
  }
  return memories.reduce<Memory | null>(
    (latest, memory) =>
      !latest || memory.createdAt > latest.createdAt ? memory : latest,
    null,
  );
}

export function byCreatedAt(a: Memory, b: Memory): number {
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

export interface GroupedMemories {
  byActivityId: Map<string, Memory[]>;
  general: Memory[];
}

/**
 * Agrupa las Memorias ya guardadas de un capítulo: por actividad y las generales
 * (sin actividad). Las archivadas nunca se muestran acá.
 */
export function groupMemoriesByActivity(memories: Memory[]): GroupedMemories {
  const byActivityId = new Map<string, Memory[]>();
  const general: Memory[] = [];
  for (const memory of memories) {
    if (memory.archived) {
      continue;
    }
    if (memory.activityId) {
      const list = byActivityId.get(memory.activityId) ?? [];
      list.push(memory);
      byActivityId.set(memory.activityId, list);
    } else {
      general.push(memory);
    }
  }
  return { byActivityId, general };
}
