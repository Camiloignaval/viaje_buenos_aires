import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { CheckingSession } from "./CheckingSession";
import { SessionUnavailable } from "./SessionUnavailable";

// Guard de rutas protegidas. Reacciona al cache de sesión: al hacer logout (o al
// recibir un 401 global), status pasa a unauthenticated y redirige a /login.
// Un fallo transitorio (unavailable) NO expulsa al usuario: muestra un estado
// recuperable con reintento, conservando la posibilidad de seguir autenticado.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, refetch } = useSession();
  if (status === "checking") return <CheckingSession />;
  if (status === "unavailable") return <SessionUnavailable onRetry={refetch} />;
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  return <>{children}</>;
}
