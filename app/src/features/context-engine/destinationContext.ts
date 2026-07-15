import type { Trip } from "@/features/trips/types";
import type { LivingContextInput } from "./livingContext";
import { availableResult, unavailableResult } from "./livingContextResult";
import { resolveTravelContext, type TravelContext } from "./travelContext";
import type { ModuleResult } from "./types";

function structuredDestination(trip: Trip | null | undefined) {
  return trip?.destination && typeof trip.destination === "object" ? trip.destination : null;
}

export function resolveDestinationContext(input: LivingContextInput, now: Date): ModuleResult<TravelContext> {
  const destination = structuredDestination(input.trip);
  if (!destination) return unavailableResult("missing_destination");
  const snapshot = input.story;
  const story = snapshot && snapshot.baseStoryId === input.trip?.baseStoryId ? snapshot.package : null;
  return availableResult("destination", resolveTravelContext({
    countryCode: destination.countryCode, countryName: destination.countryName, city: destination.cityName,
    timezone: destination.timezone, destinationLanguage: story?.metadata.destinationLanguage,
    localCurrency: story?.budget?.currency,
  }), "trip", "trip.destination", input.observedAt?.trip ?? input.trip?.updatedAt, now);
}
