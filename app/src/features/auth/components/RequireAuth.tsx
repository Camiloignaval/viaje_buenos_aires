import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { CheckingSession } from "./CheckingSession";
import { SessionUnavailable } from "./SessionUnavailable";

// Guard de rutas protegidas. Reacciona al cache de sesión: al hacer logout (o al
// recibir un 401 global), status pasa a unauthenticated y redirige a /login.
// Un fallo transitorio (unavailable) NO expulsa al usuario: muestra un estado
// recuperable con reintento, conservando la posibilidad de seguir autenticado.
// Al expulsar a /login preserva la ruta original en `returnTo` para volver ahí
// tras iniciar sesión (LoginPage lo valida contra open redirects).
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, refetch } = useSession();
  const location = useLocation();
  if (status === "checking") return <CheckingSession />;
  if (status === "unavailable") return <SessionUnavailable onRetry={refetch} />;
  if (status === "unauthenticated") {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }
  return <>{children}</>;
}
