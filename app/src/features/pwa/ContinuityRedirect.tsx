import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { getContinuity } from "./continuityStore";
import { isStandaloneDisplay, resolveLaunchTarget } from "./continuity";
import { useSession } from "@/features/auth/hooks/useSession";

// Punto de entrada de Alaia (ruta índice). Instalada, continúa en el último
// viaje abierto; en el navegador, va a la lista de viajes. La restauración es
// invisible: solo un replace de navegación, con los guards de la Portada
// validando sesión y existencia del viaje (degradan con elegancia si cambió).
export function ContinuityRedirect() {
  const session = useSession();
  const target = useMemo(
    () => resolveLaunchTarget({ continuity: getContinuity(), standalone: isStandaloneDisplay(), userId: session.user?.id }),
    [session.user?.id],
  );

  return target.kind === "restore" ? (
    <Navigate to={`/trips/${target.tripId}`} replace />
  ) : (
    <Navigate to="/trips" replace />
  );
}
