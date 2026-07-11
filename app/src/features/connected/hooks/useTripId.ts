import { useSearchParams } from "react-router-dom";

// El tripId de la Experiencia Conectada viene de `?tripId=` en la URL — mismo
// contrato que el viejo connectedContext.readTripId, pero leído por React Router.
// Sin tripId, Alaia sigue 100% local.
export function useTripId(): string | null {
  const [searchParams] = useSearchParams();
  return searchParams.get("tripId");
}
