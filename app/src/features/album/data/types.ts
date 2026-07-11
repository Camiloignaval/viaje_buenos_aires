// Modelo unificado de Memoria (sin campo `type`), espejo de memory/memoryStore.js.

export interface Memory {
  id: string;
  storyId: string;
  chapterId: string;
  activityId: string | null;
  note: string;
  /** Ids de foto (IndexedDB) o URLs remotas ya sincronizadas; la primera es la principal. */
  photos: string[];
  videos: string[];
  favorite: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Subconjunto de la Storage API que memoryStore realmente usa (inyectable en tests). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
