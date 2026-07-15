// Continuidad: recuerda el último viaje abierto (y, opcionalmente, el último
// capítulo) para que al reabrir Alaia —sobre todo instalada— se continúe donde
// la historia quedó, sin que el usuario tenga que preguntarse "¿dónde estaba?".
// Solo estado durable: nunca diálogos, loaders ni errores efímeros. Escritura
// fail-silent, lectura defensiva.

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ContinuityState {
  tripId: string;
  /** Último capítulo abierto (posición de lectura), si se conoce. */
  chapterId?: string | null;
  updatedAt: string;
}

export const CONTINUITY_KEY = "alaia:continuity:v1";

function getDefaultStorage(): KeyValueStorage {
  return window.localStorage;
}

export function getContinuity(storage: KeyValueStorage = getDefaultStorage()): ContinuityState | null {
  const raw = storage.getItem(CONTINUITY_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof (parsed as ContinuityState).tripId === "string") {
      return parsed as ContinuityState;
    }
    return null;
  } catch {
    return null;
  }
}

function write(state: ContinuityState, storage: KeyValueStorage): void {
  try {
    storage.setItem(CONTINUITY_KEY, JSON.stringify(state));
  } catch {
    // Nunca romper la navegación por un storage que no acepta escrituras.
  }
}

/** Recuerda el viaje abierto. Preserva el chapterId previo si es el mismo viaje. */
export function rememberTrip(tripId: string, storage: KeyValueStorage = getDefaultStorage()): void {
  if (!tripId) return;
  const previous = getContinuity(storage);
  write(
    {
      tripId,
      chapterId: previous?.tripId === tripId ? previous.chapterId ?? null : null,
      updatedAt: new Date().toISOString(),
    },
    storage,
  );
}

/** Recuerda la posición de lectura (capítulo) dentro del último viaje. */
export function rememberReadingPosition(
  tripId: string,
  chapterId: string | null,
  storage: KeyValueStorage = getDefaultStorage(),
): void {
  if (!tripId) return;
  write({ tripId, chapterId, updatedAt: new Date().toISOString() }, storage);
}

export function clearContinuity(storage: KeyValueStorage = getDefaultStorage()): void {
  write({ tripId: "", chapterId: null, updatedAt: new Date().toISOString() }, storage);
}
