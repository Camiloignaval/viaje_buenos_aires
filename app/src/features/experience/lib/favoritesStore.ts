// Favoritos de un viaje: "esto nos llamó la atención" — afinidad, no una tarea
// ni un bookmark ni una checklist. Pertenecen al VIAJE (namespaced por scope =
// tripId), nunca al Story Package: dos personas sobre la misma historia pueden
// marcar favoritos distintos. Persistencia local (offline por naturaleza),
// escritura fail-silent, carga defensiva. Preparado para comparación futura en
// viajes compartidos (cada favorito guarda su createdAt).
//
// Port del patrón de progressStore: storage inyectable, sin conocer React ni UI.

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Un favorito puede apuntar a un lugar, actividad, café, photo spot o momento. */
export interface FavoriteEntry {
  targetId: string;
  createdAt: string;
}

export type FavoritesMap = Record<string, FavoriteEntry>;

export function favoritesKey(scopeId: string): string {
  return `alaia:favorites:${scopeId}`;
}

function getDefaultStorage(): KeyValueStorage {
  return window.localStorage;
}

export function loadFavorites(
  scopeId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): FavoritesMap {
  const raw = storage.getItem(favoritesKey(scopeId));
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as FavoritesMap)
      : {};
  } catch {
    return {};
  }
}

function saveFavorites(scopeId: string, map: FavoritesMap, storage: KeyValueStorage): void {
  try {
    storage.setItem(favoritesKey(scopeId), JSON.stringify(map));
  } catch {
    // Nunca romper la experiencia por un storage que no acepta escrituras.
  }
}

export function isFavorite(
  scopeId: string,
  targetId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): boolean {
  return targetId in loadFavorites(scopeId, storage);
}

export function addFavorite(
  scopeId: string,
  targetId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): FavoritesMap {
  const current = loadFavorites(scopeId, storage);
  if (current[targetId]) return current;
  const updated: FavoritesMap = {
    ...current,
    [targetId]: { targetId, createdAt: new Date().toISOString() },
  };
  saveFavorites(scopeId, updated, storage);
  return updated;
}

export function removeFavorite(
  scopeId: string,
  targetId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): FavoritesMap {
  const current = loadFavorites(scopeId, storage);
  if (!current[targetId]) return current;
  const updated = { ...current };
  delete updated[targetId];
  saveFavorites(scopeId, updated, storage);
  return updated;
}

/** Alterna el favorito y devuelve el nuevo estado (true = quedó marcado). */
export function toggleFavorite(
  scopeId: string,
  targetId: string,
  storage: KeyValueStorage = getDefaultStorage(),
): boolean {
  if (isFavorite(scopeId, targetId, storage)) {
    removeFavorite(scopeId, targetId, storage);
    return false;
  }
  addFavorite(scopeId, targetId, storage);
  return true;
}
