// Único archivo de sync/ que toca red, `fetch` y `localStorage` — orquesta subir
// fotos pendientes y sincronizar progreso/Memorias contra /api/aurora/*. Nunca
// rompe la experiencia local: cualquier falla se traga en silencio y la app sigue
// 100% local. La fusión de verdad vive en syncMerge.ts (servidor). Port TS 1:1 de
// sync/syncClient.js.

import { loadProgress, saveProgress } from "@/features/story/engine/progressStore";
import {
  loadMemories,
  replaceAllMemories,
  promotePhotoUrl,
} from "@/features/album/data/memoryStore";
import { loadPhotoBlob } from "@/features/album/data/photoStore";
import type { ChapterStatuses } from "@/features/story/engine/types";
import type { Memory } from "@/features/album/data/types";

export interface SyncResult {
  chapterStatuses: ChapterStatuses;
  memories: Memory[];
}

function syncTokenKey(storyId: string): string {
  return `aurora:sync-token:${storyId}`;
}

export function getSyncToken(storyId: string): string | null {
  return window.localStorage.getItem(syncTokenKey(storyId));
}

export function saveSyncToken(storyId: string, token: string): void {
  window.localStorage.setItem(syncTokenKey(storyId), token);
}

/** Si la URL trae `?token=...`, lo devuelve — si no, null. */
export function extractTokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("token");
}

function isRemoteUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Sube a Cloudinary las fotos todavía locales (ids de IndexedDB) y promueve cada una. */
async function uploadPendingPhotos(
  storyId: string,
  accessToken: string,
  memories: Memory[],
): Promise<void> {
  for (const memory of memories) {
    for (const photoId of memory.photos ?? []) {
      if (isRemoteUrl(photoId)) {
        continue;
      }
      const blob = await loadPhotoBlob(photoId);
      if (!blob) {
        continue;
      }
      const response = await fetch("/api/aurora/photo-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, accessToken, image: await blobToDataUrl(blob) }),
      });
      if (!response.ok) {
        continue;
      }
      const { url } = (await response.json()) as { url: string };
      promotePhotoUrl(storyId, memory.id, photoId, url);
    }
  }
}

/**
 * Sincroniza el progreso y las Memorias de `storyId` contra el backend, si hay un
 * `accessToken` guardado. Devuelve el resultado fusionado, o `null` si no hay
 * token/red/backend — en cualquiera de esos casos no cambia nada.
 */
export async function syncNow(storyId: string): Promise<SyncResult | null> {
  const accessToken = getSyncToken(storyId);
  if (!accessToken) {
    return null;
  }
  try {
    await uploadPendingPhotos(
      storyId,
      accessToken,
      loadMemories(storyId, undefined, { includeArchived: true }),
    );

    const chapterStatuses = loadProgress(storyId);
    const memories = loadMemories(storyId, undefined, { includeArchived: true });

    const response = await fetch("/api/aurora/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId, accessToken, chapterStatuses, memories }),
    });
    if (!response.ok) {
      return null;
    }
    const merged = (await response.json()) as SyncResult;
    saveProgress(storyId, merged.chapterStatuses);
    replaceAllMemories(storyId, merged.memories);
    return merged;
  } catch {
    return null;
  }
}
