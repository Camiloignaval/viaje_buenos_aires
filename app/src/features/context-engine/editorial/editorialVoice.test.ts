import { describe, expect, it } from "vitest";
import { EDITORIAL_V1_CATALOG } from "./catalog";
import { EditorialContractError, type EditorialCatalog, type EditorialDecisionKind } from "./contracts";
import { createEditorialMessage, type EditorialCompanionAction } from "./editorialVoice";

const CHANNEL_BY_KIND = {
  trip_start_tomorrow: "timeline",
  trip_start_today: "in_app",
  trip_last_day: "memory",
  weather_attention_candidate: "push",
  light_moment_candidate: "editorial",
} as const;

function action(
  kind: EditorialDecisionKind = "trip_start_today",
  actionId = "decision:trip-start:trip-marker:2026-10-03",
): EditorialCompanionAction {
  return {
    outcome: "action",
    actionId,
    decision: {
      outcome: "act",
      id: actionId,
      ruleId: kind === "trip_start_tomorrow" ? "trip-start-tomorrow"
        : kind === "trip_start_today" ? "trip-start-today"
          : kind === "trip_last_day" ? "last-day"
            : kind === "weather_attention_candidate" ? "weather-attention-candidate"
              : "light-moment-candidate",
      kind,
      category: kind.startsWith("trip_") ? "trip_lifecycle"
        : kind === "weather_attention_candidate" ? "weather_attention" : "light_moment",
      priority: kind === "weather_attention_candidate" ? "high" : "normal",
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
      payload: { attentionSignal: "trip_lifecycle" },
    },
    channel: CHANNEL_BY_KIND[kind],
    policy: "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS",
    reason: "actionable",
    decisionRef: {
      id: actionId,
      kind,
      priority: kind === "weather_attention_candidate" ? "high" : "normal",
      dedupeKey: `dedupe:${actionId}`,
    },
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

function errorCode(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    expect(error).toBeInstanceOf(EditorialContractError);
    return (error as EditorialContractError).code;
  }
}

describe("createEditorialMessage", () => {
  it("is exactly deterministic and returns only the editorial contract", () => {
    const input = action();
    const first = createEditorialMessage(input);
    const second = createEditorialMessage(input);

    expect(second).toEqual(first);
    expect(Object.keys(first)).toEqual(["locale", "catalogVersion", "variantId", "text", "actionRef", "channel"]);
    expect(first).toEqual({
      locale: "es-CL",
      catalogVersion: "editorial-v1",
      variantId: first.variantId,
      text: first.text,
      actionRef: {
        actionId: "decision:trip-start:trip-marker:2026-10-03",
        decisionId: "decision:trip-start:trip-marker:2026-10-03",
        kind: "trip_start_today",
      },
      channel: "in_app",
    });
  });

  it("does not mutate deeply frozen input and returns a deeply frozen detached result", () => {
    const input = action();
    Object.freeze(input.decision.payload);
    Object.freeze(input.decision.window);
    Object.freeze(input.decision.evidence[0]);
    Object.freeze(input.decision.evidence);
    Object.freeze(input.decision.freshness[0]);
    Object.freeze(input.decision.freshness);
    Object.freeze(input.decision.requiredCapabilities);
    Object.freeze(input.decision.sourceModules);
    Object.freeze(input.decision);
    Object.freeze(input.decisionRef);
    Object.freeze(input.evaluatedGates);
    Object.freeze(input);

    const result = createEditorialMessage(input);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.actionRef)).toBe(true);
    expect(result.actionRef).not.toBe(input.decisionRef);
    expect(input.decision.kind).toBe("trip_start_today");
  });

  it.each(Object.keys(CHANNEL_BY_KIND) as EditorialDecisionKind[])(
    "selects text only from the matching %s catalog entry",
    (kind) => {
      const result = createEditorialMessage(action(kind));
      const variants = EDITORIAL_V1_CATALOG.entries[kind];

      expect(variants.map(({ id }) => id)).toContain(result.variantId);
      expect(variants.map(({ text }) => text)).toContain(result.text);
      expect(result.channel).toBe(CHANNEL_BY_KIND[kind]);
    },
  );

  it("reaches both variants through different stable action identities", () => {
    const variants = [
      createEditorialMessage(action("trip_start_today", "decision:action-a")).variantId,
      createEditorialMessage(action("trip_start_today", "decision:action-b")).variantId,
    ];

    expect(new Set(variants)).toEqual(new Set(["today-01", "today-02"]));
  });

  it("keeps IDs and untrusted action text out of copy", () => {
    const input = action("trip_start_today", "ACTION_MARKER_9f4b");
    (input.decision as { payload: Record<string, unknown> }).payload = {
      attentionSignal: "trip_lifecycle",
      marker: "USER_TEXT_MARKER_2ad1",
    };
    const result = createEditorialMessage(input);

    expect(result.text).not.toContain("ACTION_MARKER_9f4b");
    expect(result.text).not.toContain("USER_TEXT_MARKER_2ad1");
  });

  it("does not fall back when the selected kind is missing from an otherwise valid catalog", () => {
    const catalog = {
      ...EDITORIAL_V1_CATALOG,
      entries: { ...EDITORIAL_V1_CATALOG.entries, trip_start_today: [] },
    } as unknown as EditorialCatalog;

    expect(errorCode(() => createEditorialMessage(action(), catalog))).toBe("MISSING_KIND");
  });

  it("rejects unsupported kinds before channel and catalog validation", () => {
    const input = action() as unknown as Record<string, unknown>;
    (input.decision as Record<string, unknown>).kind = "unknown_kind";
    (input.decisionRef as Record<string, unknown>).kind = "unknown_kind";
    input.channel = "unknown_channel";

    expect(errorCode(() => createEditorialMessage(input as unknown as EditorialCompanionAction, {} as EditorialCatalog)))
      .toBe("UNSUPPORTED_KIND");
  });

  it("rejects an invalid channel before catalog validation", () => {
    const input = action() as unknown as Record<string, unknown>;
    input.channel = "email";

    expect(errorCode(() => createEditorialMessage(input as unknown as EditorialCompanionAction, {} as EditorialCatalog)))
      .toBe("INVALID_CHANNEL");
  });

  it.each([
    [null, "INVALID_ACTION"],
    [{ outcome: "silence" }, "INVALID_ACTION"],
    [{ ...action(), actionId: "mismatched" }, "INVALID_ACTION"],
  ])("rejects invalid CompanionAction input without a partial output", (input, code) => {
    expect(errorCode(() => createEditorialMessage(input as EditorialCompanionAction))).toBe(code);
  });
});
