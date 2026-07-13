import { platformRequest } from "@/services/platformClient";
import type { CityOption, PlaceOption } from "../types";

export function searchCities(countryCode: string, query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ country: countryCode, q: query });
  return platformRequest<{ cities: CityOption[] }>(`/api/locations/cities?${params.toString()}`, { signal });
}

export function searchAccommodation(countryCode: string, cityName: string, query: string) {
  const params = new URLSearchParams({ country: countryCode, city: cityName, q: query });
  return platformRequest<{ places: PlaceOption[] }>(`/api/locations/accommodation?${params.toString()}`);
}
