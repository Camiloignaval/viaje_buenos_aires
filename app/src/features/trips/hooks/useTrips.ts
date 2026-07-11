import { useQuery } from "@tanstack/react-query";
import { listTrips } from "../api/tripsApi";
import type { Trip } from "../types";

export const tripsQueryKey = ["trips", "list"] as const;

// Lista de viajes. La API ya los devuelve por updatedAt desc; se reordena acá
// como red de seguridad (igual que el viejo tripStore.loadTrips).
export function useTrips() {
  return useQuery({
    queryKey: tripsQueryKey,
    queryFn: listTrips,
    select: (data): { trips: Trip[] } => ({
      trips: [...data.trips].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      ),
    }),
  });
}
