import type { QueryFunctionContext } from "@tanstack/react-query";
import type { Trip } from "@/features/trips/types";
import { resolveWeatherEligibility } from "./weatherContext";
import { fetchWeatherContext } from "./weatherContextClient";

const WEATHER_STALE_TIME_MS = 15 * 60 * 1000;
const UNAVAILABLE_WEATHER_IDENTITY = [
  "context-engine", "weather", "unavailable", "unavailable", "unavailable", "unavailable",
] as const;

export function weatherContextQueryOptions(trip: Trip | null | undefined, now: Date) {
  const eligibility = resolveWeatherEligibility({ trip, now });
  const authorized = eligibility.eligible && typeof trip?.role === "string" && trip.role.trim().length > 0;
  const destination = trip?.destination && typeof trip.destination === "object" ? trip.destination : null;
  const queryKey = authorized
    ? ["context-engine", "weather", trip?.id, destination?.cityId, eligibility.request.timezone, eligibility.request.localDate] as const
    : UNAVAILABLE_WEATHER_IDENTITY;

  return {
    queryKey,
    queryFn: async ({ signal }: QueryFunctionContext<typeof queryKey>) => {
      if (!authorized || !eligibility.eligible || !trip) throw new Error("weather_query_disabled");
      try {
        const snapshot = await fetchWeatherContext({ tripId: trip.id, ...eligibility.request, signal });
        if (!snapshot) throw new Error("weather_query_failed");
        return snapshot;
      } catch {
        throw new Error("weather_query_failed");
      }
    },
    enabled: authorized,
    staleTime: WEATHER_STALE_TIME_MS,
    retry: false as const,
  };
}
