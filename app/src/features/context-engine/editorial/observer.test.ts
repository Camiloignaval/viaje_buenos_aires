import { describe, expect, it } from "vitest";
import { EditorialContractError, type EditorialDecisionKind } from "./contracts";
import { createEditorialMessage, type EditorialCompanionAction } from "./editorialVoice";
import { sanitizeEditorialDuration } from "./observer";

function action(
  kind: EditorialDecisionKind = "trip_start_today",
  actionId = "decision:observer-fixture",
): EditorialCompanionAction {
  const ruleId = kind === "trip_start_tomorrow" ? "trip-start-tomorrow"
    : kind === "trip_start_today" ? "trip-start-today"
      : kind === "trip_last_day" ? "last-day"
        : kind === "weather_attention_candidate" ? "weather-attention-candidate"
          : "light-moment-candidate";
  const category = kind.startsWith("trip_") ? "trip_lifecycle"
    : kind === "weather_attention_candidate" ? "weather_attention" : "light_moment";
  const priority = kind === "weather_attention_candidate" ? "high" : "normal";
  const channel = kind === "trip_start_tomorrow" ? "timeline"
    : kind === "trip_start_today" ? "in_app"
      : kind === "trip_last_day" ? "memory"
        : kind === "weather_attention_candidate" ? "push" : "editorial";

  return {
    outcome: "action",
    actionId,
    decision: {
      outcome: "act",
      id: actionId,
      ruleId,
      kind,
      category,
      priority,
      reasonCode: "actionable",
      confidence: "sufficient",
      evidence: [{ kind: "signal", state: "present" }],
      freshness: [{ module: "temporal", state: "fresh" }],
      requiredCapabilities: ["temporal"],
      sourceModules: ["temporal"],
      dedupeKey: `dedupe:${actionId}`,
      window: {
        validFrom: "2026-10-03T14:00:00.000Z",
        validUntil: "2026-10-03T16:00:00.000Z",
        effectiveAt: "2026-10-03T15:00:00.000Z",
        expiresAt: "2026-10-03T16:00:00.000Z",
      },
      payload: { marker: "PRIVATE_USER_CONTENT" },
    },
    channel,
    policy: "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS",
    reason: "actionable",
    decisionRef: { id: actionId, kind, priority, dedupeKey: `dedupe:${actionId}` },
    evaluatedGates: [
      "preference",
      "selection",
      "decision_contract",
      "temporal_window",
      "history",
      "dedupe",
      "frequency",
      "channel",
    ],
  };
}

describe("Editorial Voice observer", () => {
  it("emits exactly the allowed categorical success fields", () => {
    const events: unknown[] = [];
    const times = [120, 145];
    const message = createEditorialMessage(action(), undefined, {
      observer: (event) => events.push(event),
      timingNow: () => times.shift() ?? 145,
    });

    expect(events).toEqual([{
      outcome: "success",
      errorCode: "none",
      kind: "trip_start_today",
      variantId: message.variantId,
      catalogVersion: "editorial-v1",
      durationMs: 25,
    }]);
    expect(Object.isFrozen(events[0])).toBe(true);
    expect(JSON.stringify(events[0])).not.toMatch(/decision:observer-fixture|PRIVATE_USER_CONTENT|actionRef|text|payload|evidence/);
  });

  it("emits a categorized error without exposing the action or raw error", () => {
    const events: unknown[] = [];
    const input = { ...action(), channel: "email" } as unknown as EditorialCompanionAction;

    expect(() => createEditorialMessage(input, undefined, { observer: (event) => events.push(event) }))
      .toThrowError(expect.objectContaining({ name: "EditorialContractError", code: "INVALID_CHANNEL" }));
    expect(events).toEqual([{
      outcome: "error",
      errorCode: "INVALID_CHANNEL",
      kind: "trip_start_today",
      variantId: "none",
      catalogVersion: "editorial-v1",
      durationMs: 0,
    }]);
    expect(JSON.stringify(events[0])).not.toMatch(/decision:observer-fixture|email|EditorialContractError|stack|message/);
  });

  it.each([
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [-1, 0],
    [12.75, 12.75],
    [60_001, 60_000],
  ])("sanitizes duration %s into the inclusive telemetry range", (duration, expected) => {
    expect(sanitizeEditorialDuration(duration)).toBe(expected);
  });

  it("preserves the exact successful message when the observer throws", () => {
    const input = action();
    const expected = createEditorialMessage(input);
    const actual = createEditorialMessage(input, undefined, {
      observer: () => { throw new Error("observer failure"); },
    });

    expect(actual).toEqual(expected);
    expect(Object.isFrozen(actual)).toBe(true);
  });

  it("preserves the original typed contract failure when the observer throws", () => {
    const input = { ...action(), channel: "email" } as unknown as EditorialCompanionAction;
    let caught: unknown;
    try {
      createEditorialMessage(input, undefined, {
        observer: () => { throw new Error("observer replacement"); },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(EditorialContractError);
    expect(caught).toMatchObject({ name: "EditorialContractError", code: "INVALID_CHANNEL", message: "INVALID_CHANNEL" });
  });

  it("treats throwing dependency getters and timing callbacks as absent", () => {
    const dependencies = Object.defineProperties({}, {
      observer: { get: () => { throw new Error("observer getter"); } },
      timingNow: { get: () => { throw new Error("timing getter"); } },
    });

    expect(createEditorialMessage(action(), undefined, dependencies)).toEqual(createEditorialMessage(action()));
  });
});
