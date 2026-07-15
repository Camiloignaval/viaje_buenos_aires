import { describe, expect, it } from "vitest";
import type { MemoryInput, MemoryScope } from "./contracts";
import { classifyMemory, type MemoryCompanionAction, type MemoryEditorialMessage } from "./policy";

const scope: MemoryScope = { ownerUserId: "user-1", tripId: "trip-1", storyId: "story-1" };
const facts = { firstChapterAlreadyOpened: false } as const;

function pair(kind: string): MemoryInput {
  const id = `decision:${kind}:trip-1`;
  const action: MemoryCompanionAction = {
    outcome: "action", actionId: id,
    decision: {
      outcome: "act", id,
      ruleId: kind === "trip_start_today" ? "trip-start-today" : kind === "trip_last_day" ? "last-day"
        : kind === "trip_start_tomorrow" ? "trip-start-tomorrow"
          : kind === "weather_attention_candidate" ? "weather-attention-candidate" : "light-moment-candidate",
      kind, category: kind.startsWith("trip_") ? "trip_lifecycle" : kind.startsWith("weather") ? "weather_attention" : "light_moment",
      priority: kind.startsWith("weather") ? "high" : "normal", reasonCode: "actionable", confidence: "sufficient",
      evidence: [{ kind: "signal", state: "present" }], freshness: [{ module: "temporal", state: "fresh" }],
      requiredCapabilities: ["temporal"], sourceModules: ["temporal"], dedupeKey: `dedupe:${id}`,
      window: {
        validFrom: "2026-10-03T14:00:00.000Z", validUntil: "2026-10-03T16:00:00.000Z",
        effectiveAt: "2026-10-03T15:00:00.000Z", expiresAt: "2026-10-03T16:00:00.000Z",
      }, payload: kind.startsWith("trip_")
        ? { attentionSignal: "trip_lifecycle", temporalState: kind === "trip_start_tomorrow" ? "before" : "active" }
        : { attentionSignal: kind.startsWith("weather") ? "weather" : "light", activityCandidate: "curated" },
    },
    channel: "memory", policy: "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS", reason: "actionable",
    decisionRef: { id, kind, priority: kind.startsWith("weather") ? "high" : "normal", dedupeKey: `dedupe:${id}` },
    evaluatedGates: ["preference", "selection", "decision_contract", "temporal_window", "history", "dedupe", "frequency", "channel"],
  };
  const message: MemoryEditorialMessage = {
    locale: "es-CL", catalogVersion: "editorial-v1",
    variantId: kind === "trip_start_today" ? "today-01"
      : kind === "trip_last_day" ? "last-day-01"
        : kind === "trip_start_tomorrow" ? "tomorrow-01"
          : kind === "weather_attention_candidate" ? "weather-01" : "light-01",
    text: kind === "trip_start_today" ? "Hoy comienza una nueva historia."
      : kind === "trip_last_day" ? "Hoy es el último día de este viaje."
        : kind === "trip_start_tomorrow" ? "Mañana comienza este viaje."
          : kind === "weather_attention_candidate" ? "Quizás sea un buen momento para considerar el clima."
            : "Puede ser un buen momento para disfrutar la luz natural.",
    actionRef: { actionId: id, decisionId: id, kind }, channel: "memory",
  };
  return { source: "companion_editorial", action, message };
}

describe("Memory policy", () => {
  it.each([
    ["trip_start_today", "trip_started", "trip_milestone"],
    ["trip_last_day", "trip_last_day", "trip_milestone"],
  ] as const)("retains %s as an immutable %s candidate", (kind, type, reason) => {
    const result = classifyMemory(scope, pair(kind), facts);

    expect(result).toMatchObject({ outcome: "candidate", lifecycle: "candidate", type, origin: "companion_editorial", retention: { reason } });
    expect(result.outcome === "candidate" && result.meaning.text).toBe(
      kind === "trip_start_today" ? "Hoy comienza una nueva historia." : "Hoy es el último día de este viaje.",
    );
    expect(result.outcome === "candidate" && Object.isFrozen(result.scope)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("retains explicit favorites with minimal evidence", () => {
    const result = classifyMemory(scope, {
      source: "authorized_event",
      event: { eventId: "event-fav-1", kind: "favorite_marked", occurredAt: "2026-10-03T15:30:00.000Z", targetRef: "place-1" },
    }, facts);

    expect(result).toEqual({
      outcome: "candidate", lifecycle: "candidate", type: "favorite_marked", origin: "authorized_event",
      occurredAt: "2026-10-03T15:30:00.000Z", scope,
      decisionRef: null, editorialRef: null,
      evidence: [{ kind: "favorite_target", ref: "place-1" }],
      meaning: { code: "favorite_marked", text: null },
      retention: { reason: "explicit_affinity", explanation: "explicit_preference_worth_recalling" },
      dedupe: { version: "memory-key-v1", sourceSlot: "favorite:place-1" },
    });
  });

  it("retains only the first authorized chapter slot", () => {
    const input: MemoryInput = {
      source: "authorized_event",
      event: { eventId: "event-chapter-1", kind: "chapter_opened", occurredAt: "2026-10-03T16:00:00.000Z", targetRef: "chapter-1" },
    };

    expect(classifyMemory(scope, input, facts)).toMatchObject({
      outcome: "candidate", type: "first_chapter_opened", dedupe: { sourceSlot: "first-chapter" },
    });
    expect(classifyMemory(scope, input, { firstChapterAlreadyOpened: true }))
      .toEqual({ outcome: "discard", reason: "not_first", type: "first_chapter_opened" });
  });

  it.each([
    ["trip_start_tomorrow", "unsupported_kind"],
    ["weather_attention_candidate", "transient_context"],
    ["light_moment_candidate", "transient_context"],
  ] as const)("discards deferred or transient %s", (kind, reason) => {
    expect(classifyMemory(scope, pair(kind), facts)).toEqual({ outcome: "discard", reason, type: null });
  });

  it.each(["trip_ended", "note_added", "important_moment"])(
    "semantically discards deferred authorized-event signal %s without inventing a memory",
    (kind) => {
      const input = {
        source: "authorized_event",
        event: { eventId: `event-${kind}`, kind, occurredAt: "2026-10-03T16:00:00.000Z", targetRef: "target-1" },
      } as unknown as MemoryInput;

      expect(classifyMemory(scope, input, facts))
        .toEqual({ outcome: "discard", reason: "unsupported_kind", type: null });
    },
  );
});
