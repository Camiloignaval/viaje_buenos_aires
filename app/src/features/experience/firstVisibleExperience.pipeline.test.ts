import { describe, expect, it } from "vitest";
import type { Trip } from "@/features/trips/types";
import {
  composeFirstRealExperience,
  type FirstRealExperienceInput,
} from "./firstRealExperience";

const TODAY = "2026-10-03T15:00:00.000Z";

function trip(startDateTime = "2026-10-03", endDateTime = "2026-10-06"): Trip {
  return {
    id: "trip-closure",
    title: "Viaje real de cierre",
    destination: {
      countryCode: "AR",
      countryName: "Argentina",
      cityId: "buenos-aires",
      cityName: "Buenos Aires",
      latitude: -34.6037,
      longitude: -58.3816,
      timezone: "America/Argentina/Buenos_Aires",
    },
    baseStoryId: "story-closure",
    status: "active",
    role: "owner",
    updatedAt: TODAY,
    startDateTime,
    endDateTime,
  };
}

function input(options: Readonly<{
  logicalInstant?: string;
  trip?: Trip;
  companionEnabled?: boolean;
  history?: FirstRealExperienceInput["companion"]["history"];
}> = {}): FirstRealExperienceInput {
  const currentTrip = options.trip ?? trip();
  return {
    logicalInstant: options.logicalInstant ?? TODAY,
    livingContext: { trip: currentTrip },
    decision: {
      tripId: currentTrip.id,
      preferences: { enabled: true, beforeTrip: true, duringTrip: true },
      processedKeys: new Set(),
      activities: [],
    },
    companion: {
      preferences: { enabled: options.companionEnabled ?? true },
      processedKeys: new Set(),
      history: options.history ?? [],
    },
    memory: {
      scope: { ownerUserId: "user-closure", tripId: currentTrip.id, storyId: "story-closure" },
      facts: { firstChapterAlreadyOpened: false },
    },
  };
}

describe("first visible experience real pipeline closure", () => {
  it("trip_start_today remains the sole approved pending in_app intent", async () => {
    const result = await composeFirstRealExperience(input());

    expect(result).toMatchObject({
      outcome: "composed",
      action: { channel: "in_app", decision: { kind: "trip_start_today" } },
      message: { channel: "in_app", text: "Hoy comienza una nueva historia." },
      deliveryIntents: [{ destination: "in_app", state: "pending" }],
    });
  });

  it("trip_start_tomorrow preserves timeline and produces no deliverable intent", async () => {
    const result = await composeFirstRealExperience(input({ trip: trip("2026-10-04", "2026-10-07") }));

    expect(result).toMatchObject({
      outcome: "memory_discard",
      action: { channel: "timeline", decision: { kind: "trip_start_tomorrow" } },
      message: { channel: "timeline" },
      deliveryIntents: [],
    });
  });

  it("trip_last_day preserves memory and never becomes an in_app intent", async () => {
    const result = await composeFirstRealExperience(input({
      logicalInstant: "2026-10-05T15:00:00.000Z",
      trip: trip("2026-10-03", "2026-10-05"),
    }));

    expect(result).toMatchObject({
      outcome: "composed",
      action: { channel: "memory", decision: { kind: "trip_last_day" } },
      message: { channel: "memory" },
      deliveryIntents: [{ destination: "memory", state: "pending" }],
    });
  });

  it.each([
    ["preference", { companionEnabled: false }, "preference_disabled"],
    ["frequency", {
      history: [{ dedupeKey: "other-visible", priority: "normal", processedAt: "2026-10-03T14:30:00.000Z" }],
    }, "frequency_limited"],
  ] as const)("Companion %s silence stops before Editorial, Memory and delivery", async (_case, overrides, reason) => {
    const result = await composeFirstRealExperience(input(overrides));

    expect(result).toMatchObject({
      outcome: "companion_silence",
      silence: { reason },
      deliveryIntents: [],
    });
    expect("message" in result || "memoryCandidate" in result || "memoryDiscard" in result).toBe(false);
  });
});
