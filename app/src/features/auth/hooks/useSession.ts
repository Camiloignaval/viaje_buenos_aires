import { useQuery } from "@tanstack/react-query";
import { getSession } from "../api/authApi";
import { PlatformApiError } from "@/services/platformClient";
import type { SessionStatus, User } from "../types";

export const sessionQueryKey = ["auth", "session"] as const;

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
// setQueryData. staleTime Infinity porque no cambia sola.
export function useSession(): {
  status: SessionStatus;
  user: User | null;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
    staleTime: Infinity,
    retry: shouldRetrySession,
  });

  return {
    status: deriveSessionStatus(query.data, query.isError, query.error),
    user: query.data?.user ?? null,
    refetch: () => void query.refetch(),
  };
}
