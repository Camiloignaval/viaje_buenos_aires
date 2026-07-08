// Único archivo de `sync/` que toca red, `fetch` y `localStorage` (paralelo a
// `experienceView.js` en `experience/`) — orquesta subir fotos pendientes y
// sincronizar progreso/Memorias contra `/api/aurora/*`. Nunca rompe la
// experiencia local: cualquier falla (sin red, sin token, backend caído,
// backend no configurado) se traga en silencio y la app sigue 100% local.
// La fusión de verdad vive en `syncMerge.js` (servidor) — acá solo se aplica
// el resultado que el servidor ya devolvió fusionado.

import { loadProgress, saveProgress } from '../story/progressStore/progressStore.js';
import { loadMemories, replaceAllMemories, promotePhotoUrl } from '../memory/memoryStore.js';
import { loadPhotoBlob } from '../memory/photoStore.js';

function syncTokenKey(storyId) {
  return `aurora:sync-token:${storyId}`;
}

export function getSyncToken(storyId) {
  return window.localStorage.getItem(syncTokenKey(storyId));
}

export function saveSyncToken(storyId, token) {
  window.localStorage.setItem(syncTokenKey(storyId), token);
}

/** Si la URL trae `?token=...` (del link/QR de Aurora Studio), lo devuelve — si no, null. */
export function extractTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token');
}

function isRemoteUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Sube a Cloudinary las fotos todavía locales (ids de IndexedDB, no URLs) y promueve cada una en el momento. */
async function uploadPendingPhotos(storyId, accessToken, memories) {
  for (const memory of memories) {
    for (const photoId of memory.photos ?? []) {
      if (isRemoteUrl(photoId)) {
        continue;
      }
      const blob = await loadPhotoBlob(photoId);
      if (!blob) {
        continue;
      }
      const response = await fetch('/api/aurora/photo-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, accessToken, image: await blobToDataUrl(blob) }),
      });
      if (!response.ok) {
        continue;
      }
      const { url } = await response.json();
      promotePhotoUrl(storyId, memory.id, photoId, url);
    }
  }
}

/**
 * Sincroniza el progreso y las Memorias de `storyId` contra el backend, si hay
 * un `accessToken` guardado. Devuelve `{chapterStatuses, memories}` fusionado
 * si la sincronización funcionó, o `null` si no hay token, no hay red, o el
 * backend no está configurado — en cualquiera de esos casos no cambia nada.
 */
export async function syncNow(storyId) {
  const accessToken = getSyncToken(storyId);
  if (!accessToken) {
    return null;
  }
  try {
    await uploadPendingPhotos(storyId, accessToken, loadMemories(storyId, undefined, { includeArchived: true }));

    const chapterStatuses = loadProgress(storyId);
    const memories = loadMemories(storyId, undefined, { includeArchived: true });

    const response = await fetch('/api/aurora/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, accessToken, chapterStatuses, memories }),
    });
    if (!response.ok) {
      return null;
    }
    const merged = await response.json();
    saveProgress(storyId, merged.chapterStatuses);
    replaceAllMemories(storyId, merged.memories);
    return merged;
  } catch {
    return null;
  }
}
