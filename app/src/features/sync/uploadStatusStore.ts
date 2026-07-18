// Estado de subida por foto (hotfix Épica 5). Registra, namespaced por storyId en
// localStorage, si una foto LOCAL (id de IndexedDB) está subiéndose o falló. No es
// arquitectura nueva: es el mínimo para que la UI muestre "Subiendo…" / "No se pudo
// subir" y para que un reload reconstruya lo pendiente.
//
// Regla de verdad, sin ambigüedad:
//  - una foto cuyo valor ya es una URL remota  → subida (implícito, no vive acá);
//  - una foto local presente acá como "uploading"/"failed" → ese estado;
//  - una foto local AUSENTE de este registro   → "pending" (aún no intentada).
// Por eso "uploaded" nunca se persiste: al promoverse, el id local se reemplaza por
// la URL y su entrada se limpia. Así un reload deja lo no-remoto como pendiente y
// reintentable, sin perder el Blob de IndexedDB.

export type LocalPhotoStatus = "pending" | "uploading" | "failed";

function statusKey(storyId: string): string {
  return `alaia:photo-status:${storyId}`;
}

function loadRaw(storyId: string): Record<string, LocalPhotoStatus> {
  try {
    const raw = window.localStorage.getItem(statusKey(storyId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, LocalPhotoStatus>) : {};
  } catch {
    return {};
  }
}

function saveRaw(storyId: string, map: Record<string, LocalPhotoStatus>): void {
  try {
    window.localStorage.setItem(statusKey(storyId), JSON.stringify(map));
  } catch {
    // Nunca romper la experiencia por un storage que no acepta escrituras.
  }
}

/** Estados persistidos de las fotos locales de una historia (solo uploading/failed). */
export function loadPhotoStatuses(storyId: string): Record<string, LocalPhotoStatus> {
  return loadRaw(storyId);
}

/** Marca el estado de una foto local. "pending" limpia la entrada (es el default implícito). */
export function setPhotoStatus(
  storyId: string,
  photoId: string,
  status: LocalPhotoStatus,
): void {
  const map = loadRaw(storyId);
  if (status === "pending") {
    delete map[photoId];
  } else {
    map[photoId] = status;
  }
  saveRaw(storyId, map);
}

/** Limpia la entrada de una foto local (se usa al promoverse a URL remota). */
export function clearPhotoStatus(storyId: string, photoId: string): void {
  const map = loadRaw(storyId);
  if (photoId in map) {
    delete map[photoId];
    saveRaw(storyId, map);
  }
}
