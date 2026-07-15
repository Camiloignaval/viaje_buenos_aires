import type { Trip } from "@/features/trips/types";
import type { LivingContextInput } from "./livingContext";
import { availableResult, unavailableResult } from "./livingContextResult";
import { resolveTravelContext, type TravelContext } from "./travelContext";
import type { ModuleResult } from "./types";

export interface DestinationFieldSource {
  owner: "trip" | "story" | "catalog";
  source: "trip.destination" | "story.metadata" | "currencyCatalog" | "localeCatalog";
}

export interface DestinationLivingContext extends TravelContext {
  sources: {
    country: DestinationFieldSource;
    city: DestinationFieldSource;
    timezone: DestinationFieldSource;
    currency: DestinationFieldSource;
    locale: DestinationFieldSource;
  };
}

function structuredDestination(trip: Trip | null | undefined) {
  return trip?.destination && typeof trip.destination === "object" ? trip.destination : null;
}

export function resolveDestinationContext(input: LivingContextInput, now: Date): ModuleResult<DestinationLivingContext> {
  const destination = structuredDestination(input.trip);
  if (!destination) return unavailableResult("missing_destination");
  const snapshot = input.story;
  const story = snapshot && snapshot.baseStoryId === input.trip?.baseStoryId ? snapshot.package : null;
  const context = resolveTravelContext({
    countryCode: destination.countryCode, countryName: destination.countryName, city: destination.cityName,
    timezone: destination.timezone, destinationLanguage: story?.metadata.destinationLanguage,
  });
  const tripSource = { owner: "trip", source: "trip.destination" } as const;
  return availableResult("destination", {
    ...context,
    sources: {
      country: tripSource,
      city: tripSource,
      timezone: tripSource,
      currency: { owner: "catalog", source: "currencyCatalog" },
      locale: story?.metadata.destinationLanguage
        ? { owner: "story", source: "story.metadata" }
        : { owner: "catalog", source: "localeCatalog" },
    },
  }, "trip", "trip.destination", input.observedAt?.trip ?? input.trip?.updatedAt, now);
}
