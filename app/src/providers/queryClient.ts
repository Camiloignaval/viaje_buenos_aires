import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { handleAuthError } from "./authErrorHandler";

// Un único QueryClient para toda la app. Defaults conservadores pensados para
// una PWA: no refetch al enfocar la ventana (molesto en móvil), un reintento.
// El manejo de 401 vive acá (capa compartida), una sola vez, para queries y
// mutaciones — nunca duplicado en cada hook. La sesión (useSession) define su
// propio `retry`, así que este default no la afecta.
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => handleAuthError(queryClient, error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleAuthError(queryClient, error),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
