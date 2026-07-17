import { describe, expect, it } from "vitest";
import { acceptMemoryCandidate } from "@/features/context-engine/memory";
import { createLivingContextResolution, type LivingTravelContext } from "@/features/context-engine/livingContext";
import type { StoryPackage } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import realStory from "@/content/stories/buenos-aires-2026/story.json";
import { composeFirstRealExperience, type FirstRealExperienceInput, type FirstRealExperienceResult } from "./firstRealExperience";
import { adaptStoryActivity } from "./lib/adaptiveJourney";
import {
  createPendingVisibleDeliveryReceipt,
  readVisibleDeliverySession,
  transitionVisibleDeliveryReceipt,
  writeVisibleDeliverySession,
  type VisibleDeliveryStorage,
} from "./lib/visibleDeliverySession";
import { toVisibleCompanionExperience, type VisibleExperienceEvent } from "./lib/visibleExperience";

const NOW = "2026-10-03T15:00:00.000Z";
const TIMEZONE = "America/Argentina/Buenos_Aires";
type ResolvedFirstRealExperienceInput = Extract<FirstRealExperienceInput, { resolvedLivingContext: LivingTravelContext }>;

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-integrated",
    title: "Buenos Aires",
    destination: {
      countryCode: "AR", countryName: "Argentina", cityId: "buenos-aires", cityName: "Buenos Aires",
      latitude: -34.6037, longitude: -58.3816, timezone: TIMEZONE,
    },
    baseStoryId: "ba-2026",
    status: "active",
    role: "owner",
    updatedAt: NOW,
    startDateTime: "2026-10-02",
    endDateTime: "2026-10-06",
    ...overrides,
  };
}

async function context(kind: "weather" | "light" | "failed"): Promise<LivingTravelContext> {
  return createLivingContextResolution({
    trip: trip(),
    story: { baseStoryId: "ba-2026", package: realStory as StoryPackage },
  }, {
    now: () => new Date(NOW),
    weatherAdapter: async () => {
      if (kind === "failed") throw new Error("provider-private-payload");
      return {
        value: {
          condition: kind === "weather" ? "rain" as const : "clear" as const,
          temperatureC: 18,
          precipitationProbability: kind === "weather" ? 80 : 0,
          isRaining: kind === "weather",
          isStorm: false,
          isSnow: false,
          sunrise: { localDateTime: "2026-10-03T06:30:00", timezone: TIMEZONE },
          sunset: { localDateTime: "2026-10-03T12:00:00", timezone: TIMEZONE },
          effectiveAt: { localDateTime: "2026-10-03T11:45:00", timezone: TIMEZONE },
          expiresAt: "2026-10-03T15:15:00.000Z",
          confidence: "unknown" as const,
        },
        fetchedAt: NOW,
        source: "authorized-integration-adapter",
      };
    },
  }).settled;
}

function candidate(id: string) {
  const adapted = adaptStoryActivity({
    id,
    intelligence: { outdoor: true, indoor: false, rainFriendly: false, photoMoment: true },
    contextWindow: { validFrom: "2026-10-03T14:00:00.000Z", validUntil: "2026-10-03T16:00:00.000Z", timezone: TIMEZONE },
  });
  if (!adapted) throw new Error("Expected exact curated candidate");
  return adapted.candidate;
}

function productiveInput(resolved: LivingTravelContext, activities = [candidate("activity-primary")]): ResolvedFirstRealExperienceInput {
  return {
    logicalInstant: NOW,
    resolvedLivingContext: resolved,
    decision: {
      tripId: "trip-integrated",
      preferences: { enabled: true, beforeTrip: true, duringTrip: true },
      processedKeys: new Set(),
      activities,
    },
    companion: { preferences: { enabled: true }, processedKeys: new Set(), history: [] },
    memory: {
      scope: { ownerUserId: "user-integrated", tripId: "trip-integrated", storyId: "story-ba-2026" },
      facts: { firstChapterAlreadyOpened: false },
    },
  };
}

class MemoryStorage implements Storage {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("Adaptive Journey & Living Memories — real authority integration", () => {
  it.each([
    ["S05/S07/S13 Weather", "weather", "weather_attention_candidate", ["Quizás sea un buen momento para considerar el clima.", "El clima puede ser relevante para este momento del viaje."]],
    ["S10/S13 Light", "light", "light_moment_candidate", ["Puede ser un buen momento para disfrutar la luz natural.", "La luz natural acompaña este momento del viaje."]],
  ] as const)("%s runs Living Context → Decision → Companion → Editorial → Memory without substitution", async (_scenario, fixture, kind, copies) => {
    const result = await composeFirstRealExperience(productiveInput(await context(fixture)));
    expect(result.outcome).toBe("transient_composed");
    if (result.outcome !== "transient_composed") throw new Error("Expected transient composition");
    expect(result.decisionRun.selected.kind).toBe(kind);
    expect(result.decisionRun.evaluations.filter(({ disposition }) => disposition === "selected")).toHaveLength(1);
    expect(copies).toContain(result.message.text);
    expect(result.memoryDiscard).toEqual({ outcome: "discard", reason: "transient_context", type: null });
    expect(result.deliveryIntents).toEqual([{ destination: "in_app", state: "pending", references: ["editorial_message"] }]);
    expect(toVisibleCompanionExperience(result, { surface: "active_story_chapter" })).toEqual({ label: "Alaia", text: result.message.text });
    expect("memoryCandidate" in result).toBe(false);
  });

  it("S01/S02 selects one authority from two actionable candidates and never promotes or queues the loser", async () => {
    const result = await composeFirstRealExperience(productiveInput(await context("weather"), [candidate("first"), candidate("second")]));
    expect(result.outcome).toBe("transient_composed");
    if (result.outcome !== "transient_composed") throw new Error("Expected transient composition");
    expect(result.decisionRun.evaluations.filter(({ disposition }) => disposition === "selected")).toHaveLength(1);
    expect(result.decisionRun.evaluations.some(({ reasonCode }) => reasonCode === "not_selected")).toBe(true);
    expect(result.deliveryIntents).toHaveLength(1);
  });

  it("S03/S04 adapts exact structured Story evidence and rejects legacy, partial and contradictory evidence", () => {
    expect(candidate("exact")).toMatchObject({ activityId: "exact", intelligence: { outdoor: true, photoMoment: true } });
    expect(adaptStoryActivity({ id: "legacy", timeWindow: "after lunch", intelligence: { outdoor: true } } as never)).toBeNull();
    expect(adaptStoryActivity({ id: "partial", intelligence: { outdoor: true } })).toBeNull();
    expect(adaptStoryActivity({
      id: "contradictory",
      intelligence: { outdoor: true, indoor: true, photoMoment: true },
      contextWindow: { validFrom: "2026-10-03T14:00:00.000Z", validUntil: "2026-10-03T16:00:00.000Z", timezone: TIMEZONE },
    })).toBeNull();
  });

  it("S06/S11/S24 keeps a valid temporal branch when Weather is unavailable and emits no contextual surface", async () => {
    const temporal = await createLivingContextResolution({ trip: trip({ endDateTime: "2026-10-03" }) }, {
      now: () => new Date(NOW),
      weatherAdapter: async () => { throw new Error("weather-failed-private"); },
    }).settled;
    const result = await composeFirstRealExperience(productiveInput(temporal));
    expect(result.outcome).toBe("composed");
    if (result.outcome !== "composed") throw new Error("Expected temporal composition");
    expect(result.decisionRun.selected.kind).toBe("trip_last_day");
    expect(result.action.channel).toBe("memory");
    expect(toVisibleCompanionExperience(result, { surface: "active_story_chapter" })).toBeNull();
  });

  it("S12 Last Day preserves memory destination, accepts once and has no in_app projection", async () => {
    const result = await composeFirstRealExperience({
      ...productiveInput(await context("failed")),
      resolvedLivingContext: await createLivingContextResolution({ trip: trip({ endDateTime: "2026-10-03" }) }, { now: () => new Date(NOW) }).settled,
      decision: { ...productiveInput(await context("failed")).decision, activities: [] },
    });
    expect(result.outcome).toBe("composed");
    if (result.outcome !== "composed") throw new Error("Expected Last Day composition");
    expect(result.decisionRun.selected.kind).toBe("trip_last_day");
    expect(result.deliveryIntents).toEqual([{ destination: "memory", state: "pending", references: ["editorial_message", "memory_candidate"] }]);
    expect(acceptMemoryCandidate(result.memoryCandidate)).toMatchObject({ outcome: "accepted", lifecycle: "accepted", type: "trip_last_day" });
    expect(toVisibleCompanionExperience(result, { surface: "active_story_chapter" })).toBeNull();
  });

  it("S14/S15 restores only confirmed same-scope receipts and fails closed on corrupt storage", () => {
    const storage = new MemoryStorage();
    const dependencies: VisibleDeliveryStorage = { getStorage: () => storage };
    const scope = { userId: "user-integrated", tripId: "trip-integrated" };
    const pending = createPendingVisibleDeliveryReceipt({
      scope, actionId: "action-safe", destination: "in_app", references: ["editorial_message"],
      dedupeKey: "weather-safe", priority: "normal", pendingAt: NOW, expiryBoundaries: ["2026-10-03T16:00:00.000Z"],
    });
    if (!pending) throw new Error("Expected receipt");
    const visible = transitionVisibleDeliveryReceipt(pending, "visible", "2026-10-03T15:01:00.000Z");
    if (visible.status !== "transitioned") throw new Error("Expected transition");
    expect(writeVisibleDeliverySession({ dependencies, scope, document: { version: 1, receipts: [visible.receipt] } }).status).toBe("available");
    expect(readVisibleDeliverySession({ dependencies, scope, now: NOW })).toMatchObject({ status: "available", document: { receipts: [{ state: "visible" }] } });
    storage.setItem([...storage.values.keys()][0] ?? "bad", "{not-json");
    expect(readVisibleDeliverySession({ dependencies, scope, now: NOW }).status).toBe("unavailable");
  });

  it("S20/S21/S22/S23/S25 keeps identity stable, surfaces exact DTO only, and contains hostile failures", async () => {
    const input = productiveInput(await context("weather"));
    const first = await composeFirstRealExperience(input);
    const second = await composeFirstRealExperience(input);
    expect(first.outcome).toBe("transient_composed");
    expect(second.outcome).toBe("transient_composed");
    if (first.outcome !== "transient_composed" || second.outcome !== "transient_composed") throw new Error("Expected transient results");
    expect(second.decisionRun.selected.id).toBe(first.decisionRun.selected.id);
    const events: VisibleExperienceEvent[] = [];
    const view = toVisibleCompanionExperience(first, {
      surface: "active_story_chapter",
      observer: (event) => { events.push(event); throw new Error("observer-private"); },
    });
    expect(view).toEqual({ label: "Alaia", text: first.message.text });
    expect(events).toEqual([{ kind: "adaptive_result_layer" }]);
    expect(Object.keys(events[0])).toEqual(["kind"]);
    const invalid = { ...first, deliveryIntents: [{ ...first.deliveryIntents[0], references: ["editorial_message", "memory_candidate"] }] } as unknown as FirstRealExperienceResult;
    expect(toVisibleCompanionExperience(invalid, { surface: "active_story_chapter" })).toBeNull();
  });
});
