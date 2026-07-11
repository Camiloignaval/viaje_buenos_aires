import { useQuery } from "@tanstack/react-query";
import { searchAccommodation } from "../api/locationsApi";

const MIN_QUERY_LENGTH = 2;

export function useAccommodationSearch(countryCode: string | null, cityName: string | null, query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["locations", "accommodation", countryCode, cityName, trimmed],
    queryFn: () => searchAccommodation(countryCode ?? "", cityName ?? "", trimmed).then((data) => data.places),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
    staleTime: 60_000,
  });
}
