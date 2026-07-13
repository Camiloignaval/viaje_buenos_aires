import { useQuery } from "@tanstack/react-query";
import { searchCities } from "../api/locationsApi";

const MIN_QUERY_LENGTH = 2;

export function useCitySearch(countryCode: string | null, query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["locations", "cities", countryCode, trimmed],
    queryFn: ({ signal }) => searchCities(countryCode as string, trimmed, signal).then((data) => data.cities),
    enabled: Boolean(countryCode) && trimmed.length >= MIN_QUERY_LENGTH,
    staleTime: 60_000,
  });
}
