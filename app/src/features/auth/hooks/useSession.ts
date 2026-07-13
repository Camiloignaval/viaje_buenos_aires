import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession } from "../api/authApi";
import {
  readPersistedSession,
  SESSION_CACHE_KEY,
  syncPersistedSession,
} from "../lib/sessionCache";
import { PlatformApiError } from "@/services/platformClient";
import type { SessionStatus, User } from "../types";

export const sessionQueryKey = ["auth", "session"] as const;

// La sesión se revalida en segundo plano pasado este tiempo: la semilla de
// localStorage (arranque frío) queda stale enseguida y dispara un getSession
// silencioso —sin flash de "Revisando tu sesión…"—, mientras que en navegación
// SPA la sesión recién traída sigue fresca y no se re-consulta en cada ruta.
const SESSION_STALE_MS = 0;

type SessionData = { user: User | null };

// Deriva el estado de sesión distinguiendo "no hay sesión" de "no se pudo
// verificar". Regla central del Objetivo 1: un error transitorio NUNCA debe leerse
// como unauthenticated.
//   · hay data con user            → authenticated
//   · hay data sin user            → unauthenticated (respuesta válida sin sesión)
//   · sin data + error 401         → unauthenticated (sesión rechazada explícita)
//   · sin data + cualquier error   → unavailable (recuperable; no asumir logout)
//   · sin data, sin error          → checking
// Nota: si hubo un éxito previo, React Query conserva `data` aunque un refetch
// falle (isError=false), así que la última sesión válida se mantiene sola.
export function deriveSessionStatus(
  data: SessionData | undefined,
  isError: boolean,
  error: unknown,
): SessionStatus {
  if (data?.user) return "authenticated";
  if (data) return "unauthenticated";
  if (isError) {
    return error instanceof PlatformApiError && error.status === 401
      ? "unauthenticated"
      : "unavailable";
  }
  return "checking";
}

// Reintentos de la query de sesión: no reintentar 4xx (401/403/… son respuestas
// definitivas), sí reintentar red/timeout/5xx un par de veces antes de rendirse.
export function shouldRetrySession(failureCount: number, error: unknown): boolean {
  if (error instanceof PlatformApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

// La sesión es el estado global de auth. Vive en el cache de TanStack Query
// (no en un Context): getSession es la query, y login/logout la actualizan por
// setQueryData. Se siembra desde localStorage (`initialData`) para que un
// arranque frío con sesión ya conocida entre directo en `authenticated` —sin el
// loader "Revisando tu sesión…"—, y se revalida en segundo plano (SESSION_STALE_MS).
export function useSession(): {
  status: SessionStatus;
  user: User | null;
  refetch: () => void;
} {
  const queryClient = useQueryClient();
  // Se lee una sola vez por instancia: `initialData` solo importa en el primer
  // mount (cuando el cache aún no tiene la sesión resuelta).
  const [persisted] = useState(readPersistedSession);

  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
    staleTime: SESSION_STALE_MS,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: shouldRetrySession,
    ...(persisted
      ? {
          initialData: { user: persisted.user },
          // El cache no prueba que la cookie HttpOnly siga vigente ni que aún
          // pertenezca a esta persona: siempre se verifica en segundo plano.
          initialDataUpdatedAt: 0,
        }
      : {}),
  });

  // Espeja la última sesión resuelta a localStorage (guarda con user, limpia sin
  // él). Cubre login, logout y el 401 global, porque todos pasan por setQueryData
  // y este observador re-renderiza con el nuevo `data`.
  useEffect(() => {
    if (query.data === undefined) return;
    syncPersistedSession(query.data);
  }, [query.data]);

  // localStorage se comparte entre pestañas. Un logout remoto corta de
  // inmediato las vistas privadas; un login/cambio de cuenta obliga a validar
  // la cookie compartida antes de reutilizar la identidad anterior.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_CACHE_KEY) return;
      if (event.newValue === null) {
        queryClient.setQueryData(sessionQueryKey, { user: null });
        queryClient.removeQueries({ queryKey: ["trips"] });
        queryClient.removeQueries({ queryKey: ["connected"] });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  return {
    status: deriveSessionStatus(query.data, query.isError, query.error),
    user: query.data?.user ?? null,
    refetch: () => void query.refetch(),
  };
}
