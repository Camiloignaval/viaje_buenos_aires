import { describe, expect, it } from "vitest";
import type { StoryPackage } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import { resolveDestinationContext } from "./destinationContext";

const story = {
  storyId: "story-ba-2026",
  schemaVersion: "1.4",
  metadata: {
    destination: "Montevideo, Uruguay",
    destinationCountryCode: "UY",
    destinationLanguage: "es",
    title: "Story",
    travelDates: { start: "2030-01-01", end: "2030-01-02" },
    language: "es",
  },
  storyMood: { primary: "warm" }, unlockRulesDefault: {}, chapters: [],
  budget: { currency: "UYU" },
  baseCopy: { welcomeMessage: "x", dailyOpenTemplate: "x", dailyCloseTemplate: "x" },
} satisfies StoryPackage;

function trip(destination: Trip["destination"]): Trip {
  return { id: "t", title: "t", destination, baseStoryId: "ba-2026", status: "active", role: null, updatedAt: "2026-07-15T00:00:00Z" };
}

describe("resolveDestinationContext", () => {
  it("Trip estructurado conserva los hechos y Story solo completa metadata curada", () => {
    const result = resolveDestinationContext({
      trip: trip({ countryCode: "AR", countryName: "Argentina", cityId: "ba", cityName: "Buenos Aires", latitude: -34, longitude: -58, timezone: "America/Argentina/Buenos_Aires" }),
      story: { baseStoryId: "ba-2026", package: story },
    }, new Date("2026-07-15T00:00:00Z"));
    expect(result.value).toMatchObject({
      country: { code: "AR" }, city: "Buenos Aires", currency: "ARS", locale: "es-AR",
      sources: {
        country: { owner: "trip", source: "trip.destination" },
        city: { owner: "trip", source: "trip.destination" },
        timezone: { owner: "trip", source: "trip.destination" },
        currency: { owner: "catalog", source: "currencyCatalog" },
        locale: { owner: "story", source: "story.metadata" },
      },
    });
    expect(result.provenance).toMatchObject({ owner: "trip", source: "trip.destination" });
  });

  it("un destino string legacy no gana precisión inventada desde Story", () => {
    expect(resolveDestinationContext({ trip: trip("Buenos Aires"), story: { baseStoryId: "ba-2026", package: story } }, new Date())).toMatchObject({
      status: "unavailable",
      reason: "missing_destination",
    });
  });
});
