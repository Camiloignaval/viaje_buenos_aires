import type { QueryClient } from "@tanstack/react-query";
import { PlatformApiError } from "@/services/platformClient";
import { sessionQueryKey } from "@/features/auth/hooks/useSession";

// Reacción global y ÚNICA ante un 401 de un endpoint de datos: la sesión ya no
// vale. Se marca la sesión como unauthenticated en el cache → cualquier ruta
// protegida (RequireAuth) redirige sola a /login. Es una redirección CONTROLADA
// y declarativa: no navega imperativamente, así que no puede generar loops ni
// múltiples redirecciones simultáneas. Además suelta los datos privados del cache.
//
// Reglas (Objetivo 2):
//   · sólo 401 (403 = "sin permiso para este recurso", NO desloguea)
//   · se excluye /api/auth/* : un 401 de verify-code (código incorrecto) o del
//     propio flujo de login lo maneja la pantalla de acceso, no es sesión vencida
//   · no toca endpoints públicos (no lanzan 401)
export function handleAuthError(client: QueryClient, error: unknown): void {
  if (!(error instanceof PlatformApiError)) return;
  if (error.status !== 401) return;
  if (error.path.startsWith("/api/auth/")) return;

  client.setQueryData(sessionQueryKey, { user: null });
  client.removeQueries({ queryKey: ["trips"] });
  client.removeQueries({ queryKey: ["connected"] });
}
