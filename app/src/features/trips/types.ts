// Espejo de publicTripSummary/publicTripDetail (lib/platformTrips.js).
export type TripStatus = "active" | "archived";
export type AccommodationType = "hotel" | "address" | "neighborhood" | "unknown";

export interface TripDestination {
  countryCode: string;
  countryName: string;
  cityId: string;
  cityName: string;
  adminName?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface TripAccommodation {
  type: AccommodationType;
  name?: string;
  address?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

// Resultado normalizado de /api/locations/cities.
export interface CityOption {
  id: string;
  name: string;
  adminName?: string;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

// Resultado normalizado de /api/locations/accommodation.
export interface PlaceOption {
  id: string;
  type: AccommodationType;
  name: string;
  address: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

export interface TravelBudget {
  amount: number;
  currency: string;
  style: string;
}

export interface TripMember {
  userId: string;
  role: string;
  joinedAt: string;
}

export interface Trip {
  id: string;
  title: string;
  // Viajes legacy guardan destination como string; los nuevos, como objeto estructurado.
  destination: string | TripDestination;
  baseStoryId: string | null;
  status: TripStatus;
  role: string | null;
  updatedAt: string;
  // Presente en el detalle (publicTripDetail). Ausente en el summary del listado.
  members?: TripMember[];
  // Ausentes en viajes legacy (sin fechas/alojamiento/contexto guardados).
  startDateTime?: string;
  endDateTime?: string;
  accommodation?: TripAccommodation;
  travelContext?: string;
  // Ausentes en viajes legacy Y en los de la etapa anterior (sin perfil narrativo).
  travelCompanions?: string;
  expectedTravelers?: number;
  travelReason?: string;
  travelStyle?: string[];
  travelBudgetStyle?: string;
  travelBudget?: TravelBudget;
}
