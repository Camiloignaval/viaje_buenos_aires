import { describe, expect, it, vi } from "vitest";
import type { ActDecision, ContextDecisionRun } from "../decision";
import type { LivingTravelContext } from "../livingContext";
import type { CompanionInput, CompanionObservation } from "./contracts";
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

function input(selectedDecision: ActDecision | null = selected()): CompanionInput {
  return {
    context: {} as LivingTravelContext,
    decisionRun: {
      decision: selectedDecision,
      selected: selectedDecision,
      evaluations: [],
    } as ContextDecisionRun,
    preferences: { enabled: true },
  };
}

function timingClock(...values: number[]) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

describe("Companion safe observer", () => {
  it("emits only the closed action categories and sanitized duration", () => {
    const observations: CompanionObservation[] = [];
    const result = orchestrateCompanion(input(), {
      now: () => new Date(NOW),
      timingNow: timingClock(100, 125),
      observer: (observation) => observations.push(observation),
    });

    expect(result).toMatchObject({ outcome: "action", actionId: selected().id });
    expect(observations).toEqual([{
      outcome: "action",
      reason: "actionable",
      policy: POLICY,
      priority: "normal",
      channel: "in_app",
      durationMs: 25,
    }]);
    expect(Object.isFrozen(observations[0])).toBe(true);
    expect(Object.keys(observations[0]).sort()).toEqual([
      "channel",
      "durationMs",
      "outcome",
      "policy",
      "priority",
      "reason",
    ]);
  });

  it("emits a closed silence without decision or user data", () => {
    const observer = vi.fn<(observation: CompanionObservation) => void>();
    const companionInput = { ...input(), preferences: { enabled: false } };

    const result = orchestrateCompanion(companionInput, {
      now: () => new Date(NOW),
      timingNow: timingClock(20, 30),
      observer,
    });

    expect(result).toMatchObject({ outcome: "silence", reason: "preference_disabled" });
    expect(observer).toHaveBeenCalledWith({
      outcome: "silence",
      reason: "preference_disabled",
      policy: POLICY,
      priority: "none",
      channel: "none",
      durationMs: 10,
    });
  });

  it("emits only the selected priority category for a gated decision", () => {
    const observer = vi.fn<(observation: CompanionObservation) => void>();
    const companionInput = {
      ...input(),
      history: [{
        dedupeKey: "another-action",
        priority: "low" as const,
        processedAt: "2026-10-03T14:00:00.000Z",
      }],
    };

    const result = orchestrateCompanion(companionInput, {
      now: () => new Date(NOW),
      timingNow: timingClock(10, 12),
      observer,
    });

    expect(result).toMatchObject({ outcome: "silence", reason: "frequency_limited" });
    expect(observer).toHaveBeenCalledWith({
      outcome: "silence",
      reason: "frequency_limited",
      policy: POLICY,
      priority: "normal",
      channel: "none",
      durationMs: 2,
    });
  });

  it.each([
    ["negative", [50, 25], 0],
    ["non-finite start", [Number.NaN, 25], 0],
    ["non-finite end", [25, Number.POSITIVE_INFINITY], 0],
    ["oversized", [0, 75_000], 60_000],
  ] as const)("sanitizes a %s timing duration", (_label, values, expectedDuration) => {
    const observer = vi.fn<(observation: CompanionObservation) => void>();

    orchestrateCompanion(input(), {
      now: () => new Date(NOW),
      timingNow: timingClock(...values),
      observer,
    });

    expect(observer.mock.calls[0][0].durationMs).toBe(expectedDuration);
    expect(Number.isFinite(observer.mock.calls[0][0].durationMs)).toBe(true);
  });

  it("keeps the exact output when the observer throws", () => {
    const expected = orchestrateCompanion(input(), { now: () => new Date(NOW) });

    expect(() => orchestrateCompanion(input(), {
      now: () => new Date(NOW),
      timingNow: timingClock(0, 1),
      observer: () => {
        throw new Error("observer unavailable");
      },
    })).not.toThrow();
    expect(orchestrateCompanion(input(), {
      now: () => new Date(NOW),
      observer: () => {
        throw new Error("observer unavailable");
      },
    })).toEqual(expected);
  });

  it("keeps the exact output when the observer callback is unreadable", () => {
    const expected = orchestrateCompanion(input(), { now: () => new Date(NOW) });
    const dependencies = Object.defineProperty({ now: () => new Date(NOW) }, "observer", {
      get: () => {
        throw new Error("observer getter unavailable");
      },
    });

    expect(() => orchestrateCompanion(input(), dependencies)).not.toThrow();
    expect(orchestrateCompanion(input(), dependencies)).toEqual(expected);
  });
});
