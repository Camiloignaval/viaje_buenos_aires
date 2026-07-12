// Persistencia local del checklist de Preparativos. Port TS del MODO LOCAL de
// storage.js (loadAll/saveAll/localUpsert) — mismo key "ba-trip-memories" y misma
// forma, para que la experience React y la vanilla (experience.html) compartan el
// estado durante la coexistencia strangler-fig.
//
// Nota: storage.js también tiene un modo backend (MongoDB vía /api/memories); ese
// modo no se porta acá — el checklist de la experience React persiste local. Es
// suficiente para la Etapa 4 (dev/QA local) y no cambia la experiencia visible.

const STORAGE_KEY = "ba-trip-memories";

export interface ChecklistMemory {
  id: string;
  title: string;
  day: number | null;
  category: string;
  completed: boolean;
  note: string;
  imageUrl: string | null;
  cloudinaryPublicId: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type ChecklistMap = Record<string, ChecklistMemory>;

function loadAll(): ChecklistMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as ChecklistMap;
  } catch {
    return {};
  }
}

function saveAll(map: ChecklistMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export interface ChecklistPatch {
  title?: string;
  day?: number | null;
  category?: string;
  completed?: boolean;
  note?: string;
  imageUrl?: string | null;
  cloudinaryPublicId?: string | null;
}

/** Devuelve todos los recuerdos guardados, como { [id]: Memory }. */
export function getChecklistMemories(): ChecklistMap {
  return loadAll();
}

/** Crea o actualiza (parcialmente) un ítem del checklist. */
export function upsertChecklistMemory(id: string, patch: ChecklistPatch): ChecklistMemory {
  const all = loadAll();
  const now = new Date().toISOString();
  const existing: ChecklistMemory = all[id] || {
    id,
    title: patch.title || "",
    day: patch.day ?? null,
    category: patch.category || "",
    completed: false,
    note: "",
    imageUrl: null,
    cloudinaryPublicId: null,
    createdAt: now,
  };
  all[id] = { ...existing, ...patch, id, updatedAt: now };
  saveAll(all);
  return all[id];
}
