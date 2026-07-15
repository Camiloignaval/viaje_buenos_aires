import { describe, expect, it } from "vitest";
import { classifyMemory, type MemoryCompanionAction, type MemoryEditorialMessage } from "./policy";
import type { MemoryInput, MemoryScope } from "./contracts";

const scope: MemoryScope = Object.freeze({ ownerUserId: "user-1", tripId: "trip-1", storyId: "story-1" });

function paired(kind = "trip_start_today"): MemoryInput {
  const id = `decision:${kind}:trip-1`;
  const action: MemoryCompanionAction = {
    outcome: "action",
    actionId: id,
    decision: {
      outcome: "act", id, ruleId: kind === "trip_start_today" ? "trip-start-today" : "last-day",
      kind, category: "trip_lifecycle", priority: "normal", reasonCode: "actionable",
      confidence: "sufficient", evidence: [{ kind: "signal", state: "present" }],
      freshness: [{ module: "temporal", state: "fresh" }], requiredCapabilities: ["temporal"],
      sourceModules: ["temporal"], dedupeKey: `dedupe:${id}`,
      window: {
        validFrom: "2026-10-03T14:00:00.000Z", validUntil: "2026-10-03T16:00:00.000Z",
        effectiveAt: "2026-10-03T15:00:00.000Z", expiresAt: "2026-10-03T16:00:00.000Z",
      },
      payload: { attentionSignal: "trip_lifecycle", temporalState: "active" },
    },
    channel: "memory", policy: "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS", reason: "actionable",
    decisionRef: { id, kind, priority: "normal", dedupeKey: `dedupe:${id}` },
    evaluatedGates: ["preference", "selection", "decision_contract", "temporal_window", "history", "dedupe", "frequency", "channel"],
  };
  const message: MemoryEditorialMessage = {
    locale: "es-CL", catalogVersion: "editorial-v1",
    variantId: kind === "trip_start_today" ? "today-01" : "last-day-01",
    text: kind === "trip_start_today" ? "Hoy comienza una nueva historia." : "Hoy es el último día de este viaje.",
    actionRef: { actionId: id, decisionId: id, kind }, channel: "memory",
  };
  return { source: "companion_editorial", action, message };
}

describe("Memory input validation", () => {
  it("rejects mismatched lineage and exact-shape violations as semantic discards", () => {
    const mismatch = paired() as Extract<MemoryInput, { source: "companion_editorial" }>;
    const invalid = { ...paired(), unexpected: true } as unknown as MemoryInput;
    const mismatchedMessage = { ...mismatch.message, actionRef: { ...mismatch.message.actionRef, actionId: "decision:other" } };

    expect(classifyMemory(scope, { ...mismatch, message: mismatchedMessage }, { firstChapterAlreadyOpened: false }))
      .toEqual({ outcome: "discard", reason: "lineage_mismatch", type: null });
    expect(classifyMemory(scope, invalid, { firstChapterAlreadyOpened: false }))
      .toEqual({ outcome: "discard", reason: "invalid_input", type: null });
  });

  it.each(["email", "accessToken", "latitude", "coordinates", "rawError", "quote", "weather"])(
    "distinguishes prohibited %s data from ordinary invalid input",
    (field) => {
      const input = { ...paired(), [field]: "PRIVATE_MARKER" } as unknown as MemoryInput;
      const result = classifyMemory(scope, input, { firstChapterAlreadyOpened: false });

      expect(result).toEqual({ outcome: "discard", reason: "privacy_rejected", type: null });
      expect(JSON.stringify(result)).not.toContain("PRIVATE_MARKER");
    },
  );

  it("does not invoke getters and rejects untrusted ownership claims", () => {
    const input = paired() as unknown as Record<string, unknown>;
    Object.defineProperty(input, "email", { enumerable: true, get: () => { throw new Error("must not read"); } });
    const claimedScope = { ...scope, ownerUserId: "person@example.com" };

    expect(classifyMemory(scope, input as MemoryInput, { firstChapterAlreadyOpened: false }))
      .toEqual({ outcome: "discard", reason: "privacy_rejected", type: null });
    expect(classifyMemory(claimedScope, paired(), { firstChapterAlreadyOpened: false }))
      .toEqual({ outcome: "discard", reason: "privacy_rejected", type: null });
  });

  it("rejects arbitrary full payload fields and private free text", () => {
    const arbitrary = paired() as Extract<MemoryInput, { source: "companion_editorial" }>;
    const privateText = paired() as Extract<MemoryInput, { source: "companion_editorial" }>;
    (arbitrary.action.decision as { payload: Record<string, unknown> }).payload = {
      attentionSignal: "trip_lifecycle", temporalState: "active", extra: "marker",
    };
    (privateText.action.decision as { payload: Record<string, unknown> }).payload = {
      attentionSignal: "trip_lifecycle", temporalState: "active", userText: "PRIVATE_MARKER",
    };

    expect(classifyMemory(scope, arbitrary, { firstChapterAlreadyOpened: false }))
      .toEqual({ outcome: "discard", reason: "invalid_input", type: null });
    const rejected = classifyMemory(scope, privateText, { firstChapterAlreadyOpened: false });
    expect(rejected).toEqual({ outcome: "discard", reason: "privacy_rejected", type: null });
    expect(JSON.stringify(rejected)).not.toContain("PRIVATE_MARKER");
  });
});
