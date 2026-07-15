import { useQuery } from "@tanstack/react-query";
import { getTrip } from "@/features/trips/api/tripsApi";
import { PlatformApiError } from "@/services/platformClient";
import type { Trip } from "@/features/trips/types";
import { TripContextStatus } from "../lib/status";
import type { TripContextStatusValue } from "../lib/status";

export interface ConnectedTripState {
  status: TripContextStatusValue;
  tripId: string | null;
  trip: Trip | null;
  error: string | null;
  dataUpdatedAt?: number;
}

// Resuelve el viaje conectado. Sin tripId → local (sin red). Con tripId, useQuery
// consulta la plataforma; 403/404 → not-found (indistinguibles desde el cliente,
// igual que requireTripMember). Reemplaza a connectedContext.js.
export function useConnectedTrip(tripId: string | null): ConnectedTripState {
  const query = useQuery({
    queryKey: ["connected", "trip", tripId],
    queryFn: () => getTrip(tripId as string),
    enabled: Boolean(tripId),
    retry: false,
  });

  if (!tripId) {
    return { status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null, dataUpdatedAt: 0 };
  }
  if (query.isPending) {
    return { status: TripContextStatus.LOADING, tripId, trip: null, error: null, dataUpdatedAt: query.dataUpdatedAt };
  }
  if (query.isError) {
    const error = query.error;
    if (
      error instanceof PlatformApiError &&
      (error.status === 404 || error.status === 403)
    ) {
      return { status: TripContextStatus.NOT_FOUND, tripId, trip: null, error: null, dataUpdatedAt: query.dataUpdatedAt };
    }
    return {
      status: TripContextStatus.ERROR,
      tripId,
      trip: null,
      error: error instanceof Error ? error.message : "No se pudo cargar el viaje.",
      dataUpdatedAt: query.dataUpdatedAt,
    };
  }
  return { status: TripContextStatus.SUCCESS, tripId, trip: query.data.trip, error: null, dataUpdatedAt: query.dataUpdatedAt };
}
