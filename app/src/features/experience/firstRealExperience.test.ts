import { describe, expect, it } from "vitest";
import type { Trip } from "@/features/trips/types";
import { createLivingContextResolution, type LivingContextInput, type LivingTravelContext } from "@/features/context-engine/livingContext";
import type { StoryPackage } from "@/features/story/engine/types";
import realStory from "@/content/stories/buenos-aires-2026/story.json";
import {
  composeFirstRealExperience,
  type FirstRealExperienceInput,
} from "./firstRealExperience";
import { adaptStoryActivity } from "./lib/adaptiveJourney";

const LOGICAL_INSTANT = "2026-10-03T15:00:00.000Z";

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    title: "Viaje de prueba",
    destination: {
      countryCode: "AR",
      countryName: "Argentina",
      cityId: "buenos-aires",
      cityName: "Buenos Aires",
      latitude: -34.6037,
      longitude: -58.3816,
      timezone: "America/Argentina/Buenos_Aires",
    },
    baseStoryId: "story-1",
    status: "active",
    role: "owner",
    updatedAt: LOGICAL_INSTANT,
    startDateTime: "2026-10-03",
    endDateTime: "2026-10-06",
    ...overrides,
  };
}

function input(overrides: Partial<{
  logicalInstant: string;
  livingContext: LivingContextInput;
  decision: FirstRealExperienceInput["decision"];
  companion: FirstRealExperienceInput["companion"];
  memory: FirstRealExperienceInput["memory"];
}> = {}): FirstRealExperienceInput {
  return {
    logicalInstant: LOGICAL_INSTANT,
    livingContext: { trip: trip() },
    decision: {
      tripId: "trip-1",
      preferences: { enabled: true, beforeTrip: true, duringTrip: true },
      processedKeys: new Set<string>(),
      activities: [],
    },
    companion: {
      preferences: { enabled: true },
      processedKeys: new Set<string>(),
      history: [],
    },
    memory: {
      scope: { ownerUserId: "user-1", tripId: "trip-1", storyId: "story-1" },
      facts: { firstChapterAlreadyOpened: false },
    },
    ...overrides,
  };
}

function expectDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeepFrozen(child, seen);
}

async function resolvedWeatherContext(kind: "weather" | "light"): Promise<LivingTravelContext> {
  return createLivingContextResolution({
    trip: trip({ startDateTime: "2026-10-02", endDateTime: "2026-10-06" }),
    story: { baseStoryId: "story-1", package: realStory as StoryPackage },
  }, {
    now: () => new Date(LOGICAL_INSTANT),
    weatherAdapter: async () => ({
      value: {
        condition: kind === "weather" ? "rain" : "clear",
        temperatureC: 18,
        precipitationProbability: kind === "weather" ? 80 : 0,
        isRaining: kind === "weather",
        isStorm: false,
        isSnow: false,
        sunrise: { localDateTime: "2026-10-03T06:30:00", timezone: "America/Argentina/Buenos_Aires" },
        sunset: { localDateTime: "2026-10-03T12:00:00", timezone: "America/Argentina/Buenos_Aires" },
        effectiveAt: { localDateTime: "2026-10-03T11:45:00", timezone: "America/Argentina/Buenos_Aires" },
        expiresAt: "2026-10-03T15:15:00.000Z",
        confidence: "unknown",
      },
      fetchedAt: LOGICAL_INSTANT,
      source: "authorized-test-adapter",
    }),
  }).settled;
}

async function adaptiveInput(kind: "weather" | "light"): Promise<FirstRealExperienceInput> {
  const base = input();
  const adapted = adaptStoryActivity({
    id: `activity-${kind}`,
    intelligence: { outdoor: true, indoor: false, rainFriendly: false, photoMoment: true },
    contextWindow: {
      validFrom: "2026-10-03T14:00:00.000Z",
      validUntil: "2026-10-03T16:00:00.000Z",
      timezone: "America/Argentina/Buenos_Aires",
    },
  });
  if (!adapted) throw new Error("Expected curated activity");
  const { livingContext: _legacy, ...common } = base;
  return {
    ...common,
    resolvedLivingContext: await resolvedWeatherContext(kind),
    decision: { ...base.decision, activities: [adapted.candidate] },
  };
}

describe("composeFirstRealExperience", () => {
  it("Primer día local exitoso / Lineage exitoso / Intent exitoso / Trace exitoso: composes the real five-engine chain", async () => {
    const result = await composeFirstRealExperience(input());

    expect(result.outcome).toBe("composed");
    if (result.outcome !== "composed") throw new Error("Expected composed result");
    expect(result.livingContext.resolvedAt).toBe(LOGICAL_INSTANT);
    expect([result.livingContext.destination.status, result.livingContext.temporal.status]).toEqual(["available", "available"]);
    expect([result.livingContext.financial.reason, result.livingContext.weather.reason])
      .not.toContain("pending");
    expect([result.livingContext.financial.reason, result.livingContext.weather.reason])
      .not.toContain("weather_pending");
    expect(result.decisionRun.selected).toMatchObject({ outcome: "act", kind: "trip_start_today" });
    expect(result.action.outcome).toBe("action");
    expect(result.action.decision).toEqual(result.decisionRun.selected);
    expect(result.action.decisionRef.id).toBe(result.decisionRun.selected.id);
    expect(result.message).toMatchObject({
      variantId: "today-01",
      text: "Hoy comienza una nueva historia.",
      channel: "in_app",
    });
    expect(result.message.actionRef.actionId).toBe(result.action.actionId);
    expect(result.memoryCandidate).toMatchObject({
      outcome: "candidate",
      lifecycle: "candidate",
      type: "trip_started",
      decisionRef: { id: result.action.decision.id, kind: "trip_start_today" },
      editorialRef: { catalogVersion: "editorial-v1", variantId: "today-01" },
    });
    expect(result.deliveryIntents).toEqual([{
      destination: "in_app",
      state: "pending",
      references: ["editorial_message", "memory_candidate"],
    }]);
    expect(result.trace).toEqual([
      { stage: "living_context", outcome: "resolved", reason: "none" },
      { stage: "decision_engine", outcome: "selected", reason: "none" },
      { stage: "companion", outcome: "action", reason: "none" },
      { stage: "editorial_voice", outcome: "rendered", reason: "none" },
      { stage: "memory_engine", outcome: "candidate", reason: "trip_started" },
    ]);
  });

  it("Valores finales inmutables: deeply freezes the successful result and every final value", async () => {
    const result = await composeFirstRealExperience(input());

    expect(result.outcome).toBe("composed");
    expectDeepFrozen(result);
  });

  it("Abstención de Decision / Resultado terminal / Trace terminal: stops without bypass or intents", async () => {
    const result = await composeFirstRealExperience(input({
      decision: {
        tripId: "trip-1",
        preferences: { enabled: false, beforeTrip: true, duringTrip: true },
        processedKeys: new Set<string>(),
        activities: [],
      },
    }));

    expect(result).toMatchObject({ outcome: "decision_abstain", deliveryIntents: [] });
    expect(result.trace.map(({ stage }) => stage)).toEqual(["living_context", "decision_engine"]);
    expect(result.trace.at(-1)).toMatchObject({ outcome: "abstained", reason: "incomplete_context" });
    expect("silence" in result).toBe(false);
    expect("action" in result).toBe(false);
    expect("message" in result).toBe(false);
    expect("memoryCandidate" in result || "memoryDiscard" in result).toBe(false);
    expectDeepFrozen(result);
  });

  it("Silencio de Companion / Resultado terminal / Trace terminal: never renders Editorial or classifies Memory", async () => {
    const result = await composeFirstRealExperience(input({
      companion: {
        preferences: { enabled: false },
        processedKeys: new Set<string>(),
        history: [],
      },
    }));

    expect(result).toMatchObject({
      outcome: "companion_silence",
      silence: { outcome: "silence", reason: "preference_disabled" },
      deliveryIntents: [],
    });
    expect(result.trace.map(({ stage }) => stage)).toEqual(["living_context", "decision_engine", "companion"]);
    expect("action" in result).toBe(false);
    expect("message" in result).toBe(false);
    expect("memoryCandidate" in result || "memoryDiscard" in result).toBe(false);
    expectDeepFrozen(result);
  });

  it("Descarte de Memory / Resultado terminal / Trace terminal: preserves discard without an intent", async () => {
    const tomorrowTrip = trip({ startDateTime: "2026-10-04", endDateTime: "2026-10-07" });
    const result = await composeFirstRealExperience(input({ livingContext: { trip: tomorrowTrip } }));

    expect(result).toMatchObject({
      outcome: "memory_discard",
      action: { outcome: "action", channel: "timeline", decision: { kind: "trip_start_tomorrow" } },
      memoryDiscard: { outcome: "discard", reason: "unsupported_kind" },
      deliveryIntents: [],
    });
    expect(result.trace).toEqual([
      { stage: "living_context", outcome: "resolved", reason: "none" },
      { stage: "decision_engine", outcome: "selected", reason: "none" },
      { stage: "companion", outcome: "action", reason: "none" },
      { stage: "editorial_voice", outcome: "rendered", reason: "none" },
      { stage: "memory_engine", outcome: "discard", reason: "unsupported_kind" },
    ]);
    expect("memoryCandidate" in result).toBe(false);
  });

  it("Contexto no settled / Lineage inválido: fails closed with zero intents and no downstream bypass", async () => {
    const invalid = await composeFirstRealExperience(input({ logicalInstant: "not-an-instant" }));
    const unsettled = await composeFirstRealExperience(input({
      livingContext: { trip: trip({ startDateTime: undefined }) },
    }));
    const lineage = await composeFirstRealExperience(input({
      decision: {
        tripId: "another-trip",
        preferences: { enabled: true, beforeTrip: true, duringTrip: true },
        processedKeys: new Set<string>(),
        activities: [],
      },
    }));

    expect(invalid).toEqual({
      outcome: "error",
      stage: "living_context",
      errorCode: "invalid_input",
      deliveryIntents: [],
      trace: [{ stage: "living_context", outcome: "error", reason: "invalid_input" }],
    });
    expect(unsettled).toMatchObject({ outcome: "error", stage: "living_context", errorCode: "unsettled_context", deliveryIntents: [] });
    expect(unsettled.trace.map(({ stage }) => stage)).toEqual(["living_context"]);
    expect("decisionRun" in unsettled || "action" in unsettled || "message" in unsettled).toBe(false);
    expect(lineage).toMatchObject({ outcome: "error", stage: "decision_engine", errorCode: "lineage_error", deliveryIntents: [] });
    expect(lineage.trace.map(({ stage }) => stage)).toEqual(["living_context", "decision_engine"]);
    expect("decisionRun" in lineage || "action" in lineage || "message" in lineage).toBe(false);
  });

  it("Error de dependencia: categorizes failure without raw errors, intents or downstream bypass", async () => {
    const hostileLivingContext = Object.defineProperty({}, "trip", {
      get: () => { throw new Error("kari@example.com token=secret -34.6037"); },
    });
    const result = await composeFirstRealExperience(input({
      livingContext: hostileLivingContext,
    }));
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({ outcome: "error", stage: "living_context", errorCode: "dependency_error", deliveryIntents: [] });
    expect(result.trace).toEqual([{ stage: "living_context", outcome: "error", reason: "dependency_error" }]);
    expect("decisionRun" in result || "action" in result || "message" in result).toBe(false);
    expect(serialized).not.toMatch(/kari@|secret|-34\.6037/);
  });

  it("keeps observer events categorical and ignores hostile getters and callbacks", async () => {
    const events: unknown[] = [];
    const observed = await composeFirstRealExperience(input(), {
      observer: (event) => {
        events.push(event);
        throw new Error("observer must not alter composition");
      },
    });
    const hostileDependencies = Object.defineProperty({}, "observer", {
      get: () => { throw new Error("observer getter"); },
    });
    const withoutObserver = await composeFirstRealExperience(input(), hostileDependencies);

    expect(observed).toEqual(withoutObserver);
    expect(events).toEqual(observed.trace);
    expect(events).toHaveLength(5);
    expect(events.every(Object.isFrozen)).toBe(true);
    expect(JSON.stringify(events)).not.toMatch(/trip-1|user-1|story-1|2026-|Hoy comienza|payload|@/);
  });

  it("uses one logical instant across authoritative outputs", async () => {
    const result = await composeFirstRealExperience(input());

    expect(result.outcome).toBe("composed");
    if (result.outcome !== "composed") throw new Error("Expected composed result");
    expect([
      result.livingContext.resolvedAt,
      result.decisionRun.selected?.window.effectiveAt,
      result.memoryCandidate.occurredAt,
    ]).toEqual([LOGICAL_INSTANT, LOGICAL_INSTANT, LOGICAL_INSTANT]);
  });
});

describe("adaptive contextual composition", () => {
  it.each([
    ["weather", "weather_attention_candidate", "push", "weather-"],
    ["light", "light_moment_candidate", "editorial", "light-"],
  ] as const)("composes authorized %s intervention after transient Memory discard", async (fixture, decisionKind, companionChannel, variantPrefix) => {
    const result = await composeFirstRealExperience(await adaptiveInput(fixture));

    expect(result.outcome).toBe("transient_composed");
    if (result.outcome !== "transient_composed") throw new Error("Expected transient composition");
    expect(result.decisionRun.selected).toMatchObject({ kind: decisionKind });
    expect(result.decisionRun.evaluations.filter(({ disposition }) => disposition === "selected")).toHaveLength(1);
    expect(result.action.channel).toBe(companionChannel);
    expect(result.message.variantId.startsWith(variantPrefix)).toBe(true);
    expect(result.memoryDiscard).toEqual({ outcome: "discard", reason: "transient_context", type: null });
    expect(result.deliveryIntents).toEqual([{
      destination: "in_app",
      state: "pending",
      references: ["editorial_message"],
    }]);
    expect("memoryCandidate" in result).toBe(false);
    expect(result.trace.at(-1)).toEqual({ stage: "memory_engine", outcome: "discard", reason: "transient_context" });
    expectDeepFrozen(result);
  });

  it("continues only the single selected authority when multiple activities are actionable", async () => {
    const adaptive = await adaptiveInput("weather");
    const first = adaptive.decision.activities[0];
    const result = await composeFirstRealExperience({
      ...adaptive,
      decision: {
        ...adaptive.decision,
        activities: [first, { ...first, activityId: "activity-weather-second" }],
      },
    });

    expect(result.outcome).toBe("transient_composed");
    if (result.outcome !== "transient_composed") throw new Error("Expected transient composition");
    expect(result.decisionRun.evaluations.filter(({ disposition }) => disposition === "selected")).toHaveLength(1);
    expect(result.decisionRun.evaluations.filter(({ outcome, reasonCode }) => outcome === "abstain" && reasonCode === "not_selected").length).toBeGreaterThanOrEqual(1);
    expect(result.deliveryIntents).toHaveLength(1);
  });

  it("fails closed when productive input has ambiguous or invalid lineage", async () => {
    const productive = await adaptiveInput("weather");
    if (!("resolvedLivingContext" in productive) || !productive.resolvedLivingContext) {
      throw new Error("Expected resolved context fixture");
    }
    const ambiguous = await composeFirstRealExperience({
      ...productive,
      livingContext: { trip: trip() },
    } as unknown as FirstRealExperienceInput);
    const mismatch = await composeFirstRealExperience({
      ...productive,
      decision: { ...productive.decision, tripId: "another-trip" },
    });
    const staleReference = await composeFirstRealExperience({
      ...productive,
      resolvedLivingContext: { ...productive.resolvedLivingContext, resolvedAt: "2026-10-03T14:59:59.000Z" },
    });

    expect(ambiguous).toMatchObject({ outcome: "error", stage: "living_context", errorCode: "invalid_input", deliveryIntents: [] });
    expect(mismatch).toMatchObject({ outcome: "error", stage: "decision_engine", errorCode: "lineage_error", deliveryIntents: [] });
    expect(staleReference).toMatchObject({ outcome: "error", stage: "living_context", errorCode: "invalid_input", deliveryIntents: [] });
    expect([ambiguous, mismatch, staleReference].every((result) => !("action" in result) && !("message" in result))).toBe(true);
  });
});
