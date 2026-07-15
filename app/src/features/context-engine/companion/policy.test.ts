import { describe, expect, it } from "vitest";
import type { ActDecision, ContextDecisionRun, DecisionKind, DecisionPriority } from "../decision";
import type { LivingTravelContext } from "../livingContext";
import type { CompanionHistoryEntry, CompanionInput } from "./contracts";
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
      validFrom: "2026-10-03T08:00:00.000Z",
      validUntil: "2026-10-03T20:00:00.000Z",
      effectiveAt: NOW,
      expiresAt: "2026-10-03T20:00:00.000Z",
    },
    payload: { attentionSignal: "trip_lifecycle", temporalState: "active" },
    ...overrides,
  } as ActDecision;
}

function history(
  processedAt: string,
  priority: DecisionPriority = "normal",
  dedupeKey = "another-decision",
): CompanionHistoryEntry {
  return { dedupeKey, priority, processedAt };
}

function input(overrides: Partial<CompanionInput> = {}): CompanionInput {
  return {
    context: {} as LivingTravelContext,
    decisionRun: { decision: selected(), selected: selected(), evaluations: [] } as ContextDecisionRun,
    preferences: { enabled: true },
    ...overrides,
  };
}

function execute(companionInput: CompanionInput, now = NOW) {
  return orchestrateCompanion(companionInput, { now: () => new Date(now) });
}

describe("Companion history, dedupe and frequency policy", () => {
  it("silences a key already present in processedKeys", () => {
    const result = execute(input({ processedKeys: new Set(["trip-start:trip-1:2026-10-03"]) }));

    expect(result).toMatchObject({
      outcome: "silence",
      reason: "already_processed",
      evaluatedGates: ["preference", "selection", "decision_contract", "temporal_window", "history", "dedupe"],
    });
  });

  it("silences a key already present in history", () => {
    const result = execute(input({
      history: [history("2026-10-03T08:00:00.000Z", "normal", "trip-start:trip-1:2026-10-03")],
    }));

    expect(result).toMatchObject({ outcome: "silence", reason: "already_processed" });
  });

  it.each([undefined, null, []] as const)("accepts absent or empty caller-owned history: %s", (entries) => {
    const result = execute(input({ history: entries }));

    expect(result).toMatchObject({ outcome: "action", reason: "actionable" });
  });

  it.each([
    [{ dedupeKey: "other", priority: "normal" }],
    [{ dedupeKey: "", priority: "normal", processedAt: "2026-10-03T10:00:00.000Z" }],
    [{ dedupeKey: "other", priority: "urgent", processedAt: "2026-10-03T10:00:00.000Z" }],
    [{ dedupeKey: "other", priority: "normal", processedAt: "not-a-date" }],
    [{ dedupeKey: "other", priority: "normal", processedAt: "2026-10-03T15:00:00.001Z" }],
  ])("fails closed for incomplete, malformed, invalid-priority or future history", (entry) => {
    const result = execute(input({
      history: [entry as unknown as CompanionHistoryEntry],
      processedKeys: new Set(["trip-start:trip-1:2026-10-03"]),
    }));

    expect(result).toMatchObject({
      outcome: "silence",
      reason: "invalid_history",
      evaluatedGates: ["preference", "selection", "decision_contract", "temporal_window", "history"],
    });
    expect("nextUsefulAt" in result).toBe(false);
  });

  it("fails closed for malformed processed keys before applying dedupe", () => {
    const result = execute(input({
      processedKeys: new Set(["trip-start:trip-1:2026-10-03", ""]),
    }));

    expect(result).toMatchObject({ outcome: "silence", reason: "invalid_history" });
  });

  it("fails closed when a caller-owned history snapshot cannot be read", () => {
    const companionInput = Object.defineProperty(input(), "history", {
      get: () => {
        throw new Error("history unavailable");
      },
    });

    expect(() => execute(companionInput)).not.toThrow();
    expect(execute(companionInput)).toMatchObject({ outcome: "silence", reason: "invalid_history" });
  });

  it.each(["normal", "low"] as const)("limits a distinct %s decision inside the six-hour interval", (priority) => {
    const result = execute(input({
      decisionRun: { decision: selected({ priority }), selected: selected({ priority }), evaluations: [] },
      history: [history("2026-10-03T10:00:00.000Z")],
    }));

    expect(result).toMatchObject({
      outcome: "silence",
      reason: "frequency_limited",
      nextUsefulAt: "2026-10-03T16:00:00.000Z",
      evaluatedGates: ["preference", "selection", "decision_contract", "temporal_window", "history", "dedupe", "frequency"],
    });
  });

  it("allows a normal decision at the exact six-hour boundary", () => {
    const result = execute(input({ history: [history("2026-10-03T09:00:00.000Z")] }));

    expect(result).toMatchObject({ outcome: "action", policy: POLICY });
  });

  it("limits a distinct high decision before sixty minutes and exposes the exact retry instant", () => {
    const high = selected({ priority: "high" });
    const result = execute(input({
      decisionRun: { decision: high, selected: high, evaluations: [] },
      history: [history("2026-10-03T14:30:00.000Z", "normal")],
    }));

    expect(result).toMatchObject({
      outcome: "silence",
      reason: "frequency_limited",
      nextUsefulAt: "2026-10-03T15:30:00.000Z",
    });
  });

  it("allows a distinct high decision at the exact open sixty-minute boundary", () => {
    const high = selected({ priority: "high" });
    const result = execute(input({
      decisionRun: { decision: high, selected: high, evaluations: [] },
      history: [history("2026-10-03T14:00:00.000Z", "high")],
    }));

    expect(result).toMatchObject({ outcome: "action", reason: "actionable" });
  });

  it("silences a high decision when another high action is inside the open sixty-minute interval", () => {
    const high = selected({ priority: "high" });
    const result = execute(input({
      decisionRun: { decision: high, selected: high, evaluations: [] },
      history: [
        history("2026-10-03T13:30:00.000Z", "normal", "older-normal"),
        history("2026-10-03T14:15:00.000Z", "high", "recent-high"),
      ],
    }));

    expect(result).toMatchObject({
      outcome: "silence",
      reason: "recent_high_action",
      nextUsefulAt: "2026-10-03T15:15:00.000Z",
    });
  });

  it("never lets high priority bypass dedupe", () => {
    const high = selected({ priority: "high" });
    const result = execute(input({
      decisionRun: { decision: high, selected: high, evaluations: [] },
      processedKeys: new Set([high.dedupeKey]),
      history: [history("2026-10-03T13:00:00.000Z", "normal")],
    }));

    expect(result).toMatchObject({ outcome: "silence", reason: "already_processed" });
  });

  it("never lets high priority bypass expiry", () => {
    const expired = selected({ priority: "high" });
    const result = execute(input({
      decisionRun: { decision: expired, selected: expired, evaluations: [] },
      history: [history("2026-10-03T13:00:00.000Z", "normal")],
    }), "2026-10-03T20:00:00.000Z");

    expect(result).toMatchObject({ outcome: "silence", reason: "decision_expired" });
    expect(result.evaluatedGates).not.toContain("history");
  });

  it("uses the latest action regardless of caller-owned history order", () => {
    const result = execute(input({ history: [
      history("2026-10-03T08:00:00.000Z", "normal", "older"),
      history("2026-10-03T12:00:00.000Z", "low", "latest"),
      history("2026-10-03T09:00:00.000Z", "normal", "middle"),
    ] }));

    expect(result).toMatchObject({
      outcome: "silence",
      reason: "frequency_limited",
      nextUsefulAt: "2026-10-03T18:00:00.000Z",
    });
  });
});

describe("Companion conceptual channels", () => {
  it.each([
    ["trip_start_tomorrow", "timeline"],
    ["trip_start_today", "in_app"],
    ["trip_last_day", "memory"],
    ["weather_attention_candidate", "push"],
    ["light_moment_candidate", "editorial"],
  ] as const)("maps %s exactly to %s", (kind, channel) => {
    const act = selected({ kind: kind as DecisionKind });
    const result = execute(input({
      decisionRun: { decision: act, selected: act, evaluations: [] },
    }));

    expect(result).toMatchObject({ outcome: "action", channel });
  });

  it("fails closed for an unknown decision kind", () => {
    const act = selected({ kind: "unknown_kind" });
    const result = execute(input({
      decisionRun: { decision: act, selected: act, evaluations: [] },
    }));

    expect(result).toMatchObject({ outcome: "silence", reason: "invalid_selected_decision" });
  });

  it("returns only a conceptual label and preserves the selected decision without delivery authorization", () => {
    const result = execute(input());

    expect(result).toMatchObject({ outcome: "action", channel: "in_app", decision: selected() });
    expect(result).not.toHaveProperty("copy");
    expect(result).not.toHaveProperty("destination");
    expect(result).not.toHaveProperty("delivery");
    expect(result).not.toHaveProperty("authorized");
  });
});
