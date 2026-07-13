import type { User } from "../types";

// Cache liviano de la ÚLTIMA sesión válida en localStorage. No es la fuente de
// verdad (esa es la cookie HttpOnly del server); es solo una semilla para que el
// arranque frío no tenga que mostrar "Revisando tu sesión…" cuando ya sabemos
// quién es el usuario. La sesión se revalida igual en segundo plano (useSession),
// y un 401 de cualquier endpoint la limpia vía handleAuthError.
//
// Guardamos solo el `user` (perfil, no sensible) + el instante de guardado, para
// que React Query sepa qué tan vieja es la semilla y decida si revalidar.

export const SESSION_CACHE_KEY = "alaia:session:v1";
// El cache solo evita el loader de un arranque frío: no debe conservar el
// perfil de alguien que dejó de usar el navegador durante días.
export const PERSISTED_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type PersistedSession = {
  user: User;
  updatedAt: number;
};

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<User>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.email === "string" &&
    candidate.email.length > 0 &&
    (candidate.displayName === null || typeof candidate.displayName === "string") &&
    (candidate.residenceCountryCode === null || typeof candidate.residenceCountryCode === "string") &&
    (candidate.emailVerifiedAt === null || typeof candidate.emailVerifiedAt === "string") &&
    typeof candidate.onboardingCompleted === "boolean"
  );
}

export function readPersistedSession(
  storage: Storage | undefined = getBrowserStorage(),
  now: number = Date.now(),
): PersistedSession | null {
  try {
    const raw = storage?.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<PersistedSession>;
    if (!isUser(record.user)) return null;
    if (typeof record.updatedAt !== "number" || !Number.isFinite(record.updatedAt)) return null;
    if (record.updatedAt > now + 5 * 60 * 1000 || now - record.updatedAt > PERSISTED_SESSION_MAX_AGE_MS) {
      storage?.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return { user: record.user, updatedAt: record.updatedAt };
  } catch {
    return null;
  }
}

// Refleja el estado de la sesión en localStorage: guarda cuando hay usuario,
// limpia cuando la respuesta es válida sin sesión (logout / 401). Nunca bloquea:
// localStorage puede fallar en modo privado.
export function syncPersistedSession(
  data: { user: User | null },
  now: number = Date.now(),
  storage: Storage | undefined = getBrowserStorage(),
): void {
  try {
    if (data.user) {
      const record: PersistedSession = { user: data.user, updatedAt: now };
      storage?.setItem(SESSION_CACHE_KEY, JSON.stringify(record));
    } else {
      storage?.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    /* no-op: el cache es una mejora de UX, nunca un requisito. */
  }
}
