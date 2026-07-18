// Único archivo de sync/ que toca red, `fetch` y `localStorage` — orquesta subir
// fotos pendientes y sincronizar progreso/Memorias contra /api/alaia/*. Nunca
// rompe la experiencia local (sigue 100% local-first), pero YA NO traga los
// errores: cada foto devuelve un resultado estructurado (uploaded/failed/skipped)
// y los fallos se loguean con contexto útil. La fusión de verdad vive en
// syncMerge.ts (servidor).
//
// Hotfix (fuga de UUID): una foto se considera COMPARTIDA solo cuando el endpoint
// devuelve una URL HTTPS remota. Antes de POST /api/alaia/sync se sanitiza el
// payload para que ningún id local (UUID de IndexedDB ni blob:) viaje al backend;
// los ids locales pendientes NO se borran del estado local — se reincorporan tras
// la fusión para poder reintentar sin perder el Blob.

import { loadProgress, saveProgress } from "@/features/story/engine/progressStore";
import {
  loadMemories,
  replaceAllMemories,
  promotePhotoUrl,
} from "@/features/album/data/memoryStore";
import { loadPhotoBlob } from "@/features/album/data/photoStore";
import { setPhotoStatus, clearPhotoStatus } from "./uploadStatusStore";
import type { ChapterStatuses } from "@/features/story/engine/types";
import type { Memory } from "@/features/album/data/types";

const PHOTO_UPLOAD_ENDPOINT = "/api/alaia/photo-upload";
const SYNC_ENDPOINT = "/api/alaia/sync";

export type PhotoOutcomeStatus = "uploaded" | "failed" | "skipped";

export interface PhotoUploadOutcome {
  memoryId: string;
  photoId: string;
  status: PhotoOutcomeStatus;
  url?: string;
  error?: string;
}

export interface SyncResult {
  chapterStatuses: ChapterStatuses;
  memories: Memory[];
  /** Resultado por foto pendiente intentada en esta corrida. */
  photoOutcomes: PhotoUploadOutcome[];
}

/** Callback opcional para refrescar la UI en cada cambio de estado de una foto. */
export type SyncProgress = () => void;

function syncTokenKey(storyId: string): string {
  return `alaia:sync-token:${storyId}`;
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

/**
 * Fuente ÚNICA de verdad de "esta foto ya está compartida": una URL HTTP(S)
 * remota. Un blob URL o un UUID de IndexedDB NO cuentan. Reemplaza la comprobación
 * frágil dispersa por el código.
 */
export function isRemotePhotoUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\//.test(value);
}

/**
 * Devuelve una copia de las Memorias con `photos[]` reducido a SOLO URLs remotas.
 * No muta el estado local: sirve para el payload de /api/alaia/sync, de modo que
 * ningún id local (UUID/blob:) pendiente viaje nunca al backend.
 */
export function sanitizeMemoriesForRemoteSync(memories: Memory[]): Memory[] {
  return memories.map((memory) => ({
    ...memory,
    photos: (memory.photos ?? []).filter((id) => isRemotePhotoUrl(id)),
  }));
}

/**
 * Reincorpora al resultado fusionado del servidor los ids locales pendientes que
 * se habían sanitizado del payload — así el estado local nunca pierde una foto que
 * todavía no subió (se puede reintentar y su Blob sigue en IndexedDB).
 */
export function reattachPendingPhotos(
  mergedMemories: Memory[],
  localMemories: Memory[],
): Memory[] {
  const localById = new Map(localMemories.map((memory) => [memory.id, memory]));
  return mergedMemories.map((merged) => {
    const local = localById.get(merged.id);
    if (!local) return merged;
    const pending = (local.photos ?? []).filter((id) => !isRemotePhotoUrl(id));
    if (pending.length === 0) return merged;
    const remote = merged.photos ?? [];
    return { ...merged, photos: [...remote, ...pending.filter((id) => !remote.includes(id))] };
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as { error?: string; code?: string };
    return body.code ? `${body.code}: ${body.error ?? ""}`.trim() : body.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

/**
 * Sube a Cloudinary (vía backend) las fotos todavía locales de cada Memoria y las
 * promueve a su URL remota. Devuelve un resultado por foto — nunca traga el error:
 * un fallo deja la foto local intacta, marca su estado como `failed` y se loguea
 * con status/endpoint/storyId/photoId/mensaje.
 */
async function uploadPendingPhotos(
  storyId: string,
  accessToken: string,
  memories: Memory[],
  onProgress?: SyncProgress,
): Promise<PhotoUploadOutcome[]> {
  const outcomes: PhotoUploadOutcome[] = [];
  for (const memory of memories) {
    for (const photoId of memory.photos ?? []) {
      if (isRemotePhotoUrl(photoId)) {
        continue; // ya compartida
      }
      const blob = await loadPhotoBlob(photoId);
      if (!blob) {
        // El id no resuelve a un Blob local (p. ej. ya limpiado): no hay nada que subir.
        outcomes.push({ memoryId: memory.id, photoId, status: "skipped" });
        continue;
      }

      setPhotoStatus(storyId, photoId, "uploading");
      onProgress?.();

      let response: Response;
      try {
        response = await fetch(PHOTO_UPLOAD_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId, accessToken, image: await blobToDataUrl(blob) }),
        });
      } catch (networkError) {
        const message = networkError instanceof Error ? networkError.message : String(networkError);
        console.error("[alaia sync] fallo de red al subir foto", {
          endpoint: PHOTO_UPLOAD_ENDPOINT,
          storyId,
          photoId,
          memoryId: memory.id,
          message,
        });
        setPhotoStatus(storyId, photoId, "failed");
        outcomes.push({ memoryId: memory.id, photoId, status: "failed", error: message });
        onProgress?.();
        continue;
      }

      if (!response.ok) {
        const message = await readErrorMessage(response);
        console.error("[alaia sync] el backend rechazó la subida", {
          endpoint: PHOTO_UPLOAD_ENDPOINT,
          status: response.status,
          storyId,
          photoId,
          memoryId: memory.id,
          message,
        });
        setPhotoStatus(storyId, photoId, "failed");
        outcomes.push({ memoryId: memory.id, photoId, status: "failed", error: `${response.status} ${message}` });
        onProgress?.();
        continue;
      }

      const body = (await response.json()) as { url?: unknown };
      // Solo se considera compartida si la respuesta trae una URL HTTPS remota válida.
      if (!isRemotePhotoUrl(body.url)) {
        console.error("[alaia sync] respuesta sin URL remota válida", {
          endpoint: PHOTO_UPLOAD_ENDPOINT,
          status: response.status,
          storyId,
          photoId,
          memoryId: memory.id,
        });
        setPhotoStatus(storyId, photoId, "failed");
        outcomes.push({ memoryId: memory.id, photoId, status: "failed", error: "respuesta sin url remota" });
        onProgress?.();
        continue;
      }

      promotePhotoUrl(storyId, memory.id, photoId, body.url);
      clearPhotoStatus(storyId, photoId);
      outcomes.push({ memoryId: memory.id, photoId, status: "uploaded", url: body.url });
      onProgress?.();
    }
  }
  return outcomes;
}

/**
 * Sincroniza el progreso y las Memorias de `storyId` contra el backend, si hay un
 * `accessToken` guardado. Primero sube las fotos pendientes; después manda al
 * servidor SOLO fotos con URL remota (payload sanitizado) y reincorpora localmente
 * los pendientes tras la fusión. Devuelve el resultado, o `null` si no hay
 * token/red/backend — sin cambiar nada.
 */
export async function syncNow(
  storyId: string,
  onProgress?: SyncProgress,
): Promise<SyncResult | null> {
  const accessToken = getSyncToken(storyId);
  if (!accessToken) {
    return null;
  }

  // 1) Subir pendientes (promueve en local las que suben; deja las que fallan).
  const photoOutcomes = await uploadPendingPhotos(
    storyId,
    accessToken,
    loadMemories(storyId, undefined, { includeArchived: true }),
    onProgress,
  );

  // 2) Estado local ya con las subidas promovidas a URL.
  const chapterStatuses = loadProgress(storyId);
  const localMemories = loadMemories(storyId, undefined, { includeArchived: true });

  // 3) Payload SIN ids locales: ningún UUID/blob viaja al backend.
  const sanitizedMemories = sanitizeMemoriesForRemoteSync(localMemories);

  let response: Response;
  try {
    response = await fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId, accessToken, chapterStatuses, memories: sanitizedMemories }),
    });
  } catch (networkError) {
    const message = networkError instanceof Error ? networkError.message : String(networkError);
    console.error("[alaia sync] fallo de red al sincronizar", { endpoint: SYNC_ENDPOINT, storyId, message });
    return { chapterStatuses, memories: localMemories, photoOutcomes };
  }

  if (!response.ok) {
    console.error("[alaia sync] el backend rechazó la sincronización", {
      endpoint: SYNC_ENDPOINT,
      status: response.status,
      storyId,
      message: await readErrorMessage(response),
    });
    return { chapterStatuses, memories: localMemories, photoOutcomes };
  }

  const merged = (await response.json()) as { chapterStatuses: ChapterStatuses; memories: Memory[] };
  // 4) Reincorporar los pendientes locales que se habían sanitizado del payload.
  const reconciledMemories = reattachPendingPhotos(merged.memories, localMemories);
  saveProgress(storyId, merged.chapterStatuses);
  replaceAllMemories(storyId, reconciledMemories);
  return { chapterStatuses: merged.chapterStatuses, memories: reconciledMemories, photoOutcomes };
}
