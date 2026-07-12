// Resuelve ids de foto a algo pintable (URL remota tal cual, o object URL desde
// IndexedDB). Port verbatim de experienceView.js (collectPhotoIds / isRemoteUrl /
// resolvePhotoUrls / tripWidePhotoIds).

import { loadPhotoBlob } from "@/features/album/data/photoStore";
import type { Memory } from "@/features/album/data/types";

export function isRemoteUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

/** Todos los ids de foto referenciados por una o más listas de Memorias, sin repetir. */
export function collectPhotoIds(memoriesLists: Memory[][]): Set<string> {
  const ids = new Set<string>();
  for (const list of memoriesLists) {
    for (const memory of list) {
      for (const id of memory.photos ?? []) {
        ids.add(id);
      }
    }
  }
  return ids;
}

/**
 * Resuelve cada id de foto a algo pintable. URL remota → tal cual; id local →
 * object URL desde IndexedDB. Un id sin blob resuelto se descarta.
 */
export async function resolvePhotoUrls(
  photoIds: Set<string>,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    [...photoIds].map(async (id): Promise<[string, string] | null> => {
      if (isRemoteUrl(id)) {
        return [id, id];
      }
      const blob = await loadPhotoBlob(id);
      return blob ? [id, URL.createObjectURL(blob)] : null;
    }),
  );
  return Object.fromEntries(entries.filter((entry): entry is [string, string] => entry !== null));
}

/** Ids de foto ya capturados en todo el viaje (sin archivadas), para el epílogo. */
export function tripWidePhotoIds(tripMemories: Memory[]): string[] {
  return [...collectPhotoIds([tripMemories.filter((memory) => !memory.archived)])];
}
