import { platformRequest } from "@/services/platformClient";
import type { Trip, TravelBudget, TripAccommodation, TripDestination } from "../types";

export interface CreateTripInput {
  title: string;
  destination: TripDestination;
  startDateTime: string;
  endDateTime: string;
  travelCompanions: string;
  expectedTravelers: number;
  travelReason: string;
  travelStyle: string[];
  travelBudgetStyle: string;
  /** Solo herramientas editoriales/bootstrap; el wizard normal no autoasigna Story. */
  baseStoryId?: string | null;
  accommodation?: TripAccommodation;
  travelContext?: string;
  travelBudget?: TravelBudget;
}

/** Viajes del usuario autenticado, ya ordenados por updatedAt desc en el server. */
export function listTrips() {
  return platformRequest<{ trips: Trip[] }>("/api/trips");
}

/** Crea un viaje con el modelo estructurado (título, destino, fechas, alojamiento opcional, contexto opcional). */
export function createTrip(input: CreateTripInput) {
  return platformRequest<{ trip: Trip }>("/api/trips", {
    method: "POST",
    body: input,
  });
}

/** Detalle de un viaje. 403 si no existe o no eres miembro (indistinguibles desde el cliente). */
export function getTrip(tripId: string) {
  return platformRequest<{ trip: Trip }>(
    `/api/trips/${encodeURIComponent(tripId)}`,
  );
}
