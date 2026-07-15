import { describe, expect, it, vi } from "vitest";
import type { ActDecision, ContextDecisionRun } from "../decision";
import type { LivingTravelContext } from "../livingContext";
import type { CompanionInput } from "./contracts";
import { orchestrateCompanion } from "./orchestrator";

const NOW = "2026-10-03T15:00:00.000Z";
const POLICY = "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS";

function selected(overrides: Record<string, unknown> = {}): ActDecision {
  return {
    outcome: "act",
    id: "decision:trip-start:trip-1:2026-10-03",
    ruleId: "trip-start-today",
    kind: "trip_start_today",
    category: "trip_lifecycle",
    priority: "normal",
    reasonCode: "actionable",
    confidence: "sufficient",
    evidence: [{ kind: "signal", state: "present" }],
    freshness: [{ module: "temporal", state: "fresh" }],
    requiredCapabilities: ["temporal"],
    sourceModules: ["temporal"],
    dedupeKey: "trip-start:trip-1:2026-10-03",
    window: {
      validFrom: "2026-10-03T14:00:00.000Z",
      validUntil: "2026-10-03T16:00:00.000Z",
      effectiveAt: NOW,
      expiresAt: "2026-10-03T16:00:00.000Z",
    },
    payload: { attentionSignal: "trip_lifecycle", temporalState: "active" },
    ...overrides,
  } as ActDecision;
}

function unreadContext(): LivingTravelContext {
  return Object.defineProperty({}, "resolvedAt", {
    get: () => {
      throw new Error("Living Context must not be read");
    },
  }) as LivingTravelContext;
}

function runWith(selectedDecision: ActDecision | null): ContextDecisionRun {
  return Object.defineProperty({
    decision: selectedDecision,
    selected: selectedDecision,
  }, "evaluations", {
    get: () => {
      throw new Error("evaluations must not be read");
    },
  }) as ContextDecisionRun;
}

function input(selectedDecision: ActDecision | null = selected(), overrides: Partial<CompanionInput> = {}): CompanionInput {
  return {
    context: unreadContext(),
    decisionRun: runWith(selectedDecision),
    preferences: { enabled: true },
    ...overrides,
  };
}

function execute(companionInput: CompanionInput, now = NOW) {
  return orchestrateCompanion(companionInput, { now: () => new Date(now) });
}

describe("orchestrateCompanion contracts and pure gates", () => {
  it("is deterministic for the same input and injected clock", () => {
    const now = vi.fn(() => new Date(NOW));
    const companionInput = input();

    const first = orchestrateCompanion(companionInput, { now });
    const second = orchestrateCompanion(companionInput, { now });

    expect(first).toEqual(second);
    expect(now).toHaveBeenCalledTimes(2);
  });

  it("does not mutate frozen inputs and deeply freezes the output", () => {
    const act = selected({
      evidence: Object.freeze([{ kind: "signal", state: "present" }]),
      freshness: Object.freeze([{ module: "temporal", state: "fresh" }]),
      window: Object.freeze({
        validFrom: "2026-10-03T14:00:00.000Z",
        validUntil: "2026-10-03T16:00:00.000Z",
        effectiveAt: NOW,
        expiresAt: "2026-10-03T16:00:00.000Z",
      }),
      payload: Object.freeze({ attentionSignal: "trip_lifecycle", temporalState: "active" }),
    });
    Object.freeze(act);
    const result = execute(Object.freeze(input(act)));

    expect(result.outcome).toBe("action");
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.outcome === "action" && Object.isFrozen(result.decision)).toBe(true);
    expect(result.outcome === "action" && Object.isFrozen(result.decision.payload)).toBe(true);
    expect(act.payload).toEqual({ attentionSignal: "trip_lifecycle", temporalState: "active" });
  });

  it("returns no_selected_decision without reading evaluations", () => {
    expect(execute(input(null))).toEqual({
      outcome: "silence",
      reason: "no_selected_decision",
      decisionRef: null,
      evaluatedGates: ["preference", "selection"],
      policy: POLICY,
    });
  });

  it("gives global disabled precedence without reading selection or context", () => {
    const decisionRun = Object.defineProperty({}, "selected", {
      get: () => {
        throw new Error("selection must not be read");
      },
    }) as ContextDecisionRun;
    const result = orchestrateCompanion({
      context: unreadContext(),
      decisionRun,
      preferences: { enabled: false },
    }, { now: () => { throw new Error("clock must not be read"); } });

    expect(result).toEqual({
      outcome: "silence",
      reason: "preference_disabled",
      decisionRef: null,
      evaluatedGates: ["preference"],
      policy: POLICY,
    });
  });

  it("evaluates only the selected Act and never reads Living Context or alternatives", () => {
    const result = execute(input());

    expect(result).toMatchObject({
      outcome: "action",
      actionId: "decision:trip-start:trip-1:2026-10-03",
      channel: "in_app",
      reason: "actionable",
    });
  });

  it("fails closed when the runtime selection is not an Act", () => {
    const notAct = {
      ...selected(),
      outcome: "abstain",
      reasonCode: "incomplete_context",
    } as unknown as ActDecision;

    expect(execute(input(notAct))).toMatchObject({
      outcome: "silence",
      reason: "invalid_selected_decision",
      decisionRef: null,
      evaluatedGates: ["preference", "selection", "decision_contract"],
    });
  });

  it("fails closed when an Act omits required runtime fields", () => {
    const malformed = { ...selected(), payload: undefined } as unknown as ActDecision;

    expect(execute(input(malformed))).toMatchObject({
      outcome: "silence",
      reason: "invalid_selected_decision",
      decisionRef: null,
    });
  });

  it("preserves the selected Act exactly in a detached deep clone", () => {
    const act = selected();
    const result = execute(input(act));

    expect(result.outcome).toBe("action");
    if (result.outcome !== "action") throw new Error("expected action");
    expect(result.decision).toEqual(act);
    expect(result.decision).not.toBe(act);
    expect(result.decision.window).not.toBe(act.window);
    expect(result.decision.evidence).not.toBe(act.evidence);
    expect(result.decision.payload).not.toBe(act.payload);
  });

  it("returns not_yet_valid with the exact next useful instant", () => {
    expect(execute(input(), "2026-10-03T13:59:59.999Z")).toEqual({
      outcome: "silence",
      reason: "not_yet_valid",
      decisionRef: {
        id: "decision:trip-start:trip-1:2026-10-03",
        kind: "trip_start_today",
        priority: "normal",
        dedupeKey: "trip-start:trip-1:2026-10-03",
      },
      evaluatedGates: ["preference", "selection", "decision_contract", "temporal_window"],
      nextUsefulAt: "2026-10-03T14:00:00.000Z",
      policy: POLICY,
    });
  });

  it("treats validFrom as inclusive", () => {
    expect(execute(input(), "2026-10-03T14:00:00.000Z")).toMatchObject({
      outcome: "action",
      reason: "actionable",
    });
  });

  it("treats validUntil as exclusive", () => {
    expect(execute(input(), "2026-10-03T16:00:00.000Z")).toMatchObject({
      outcome: "silence",
      reason: "decision_expired",
    });
  });

  it("treats expiresAt as exclusive", () => {
    const act = selected({
      window: { ...selected().window, validUntil: "2026-10-03T17:00:00.000Z" },
    });

    expect(execute(input(act), "2026-10-03T16:00:00.000Z")).toMatchObject({
      outcome: "silence",
      reason: "decision_expired",
    });
  });

  it.each([
    ["missing", { ...selected(), window: undefined }],
    ["malformed", { ...selected(), window: { ...selected().window, validFrom: "not-a-date" } }],
    ["reversed", { ...selected(), window: { ...selected().window, validUntil: "2026-10-03T13:00:00.000Z" } }],
  ])("rejects a %s decision window", (_label, act) => {
    expect(execute(input(act as ActDecision))).toMatchObject({
      outcome: "silence",
      reason: "invalid_selected_decision",
      evaluatedGates: ["preference", "selection", "decision_contract"],
    });
  });

  it("explains an action with policy, decision reference and ordered gates", () => {
    expect(execute(input())).toMatchObject({
      outcome: "action",
      policy: POLICY,
      decisionRef: {
        id: "decision:trip-start:trip-1:2026-10-03",
        kind: "trip_start_today",
        priority: "normal",
        dedupeKey: "trip-start:trip-1:2026-10-03",
      },
      evaluatedGates: ["preference", "selection", "decision_contract", "temporal_window", "channel"],
    });
  });

  it("omits nextUsefulAt when the failure has no exact recovery instant", () => {
    const result = execute(input({ ...selected(), outcome: "abstain" } as unknown as ActDecision));

    expect(result).toMatchObject({ outcome: "silence", reason: "invalid_selected_decision" });
    expect("nextUsefulAt" in result).toBe(false);
  });
});
