import { safeTripTemporalState, type TripTemporalState } from "@/features/trips/lib/countdown";
import type {
  AbstainDecisionDraft,
  ActDecisionDraft,
  DecisionKind,
  DecisionReason,
  DecisionRule,
  RuleEvaluationDraft,
} from "./contracts";
import { normalizedCalendarDate, resolveDestinationLocalDayWindow } from "./time";

const PLACEHOLDER_REASONS = Object.freeze(["incomplete_context"] as const satisfies readonly DecisionReason[]);
const TEMPORAL_REASONS = Object.freeze([
  "actionable",
  "invalid_context",
  "trip_finished",
  "trip_not_applicable",
  "already_processed",
  "outside_effective_window",
] as const satisfies readonly DecisionReason[]);

function notImplementedYet(): readonly RuleEvaluationDraft[] {
  return [Object.freeze({
    outcome: "abstain",
    reasonCode: "incomplete_context",
    confidence: "unknown",
    evidence: Object.freeze([{ kind: "signal", state: "missing" }] as const),
    freshness: Object.freeze([]),
    missingCapabilities: Object.freeze([]),
    missingModules: Object.freeze([]),
    staleModules: Object.freeze([]),
    conflictingSignals: Object.freeze([]),
    nextUsefulEvaluationAt: null,
  })];
}

function defineRule(rule: DecisionRule): DecisionRule {
  return Object.freeze(rule);
}

type TemporalRuleKind = "tomorrow" | "today" | "last-day";
const TEMPORAL_DECISIONS: Readonly<Record<TemporalRuleKind, { kind: DecisionKind; temporalState: "before" | "active" }>> = Object.freeze({
  tomorrow: Object.freeze({ kind: "trip_start_tomorrow", temporalState: "before" }),
  today: Object.freeze({ kind: "trip_start_today", temporalState: "active" }),
  "last-day": Object.freeze({ kind: "trip_last_day", temporalState: "active" }),
});

function temporalAbstention(
  reasonCode: AbstainDecisionDraft["reasonCode"],
  freshness: AbstainDecisionDraft["freshness"] = [],
): readonly RuleEvaluationDraft[] {
  return [Object.freeze({
    outcome: "abstain",
    reasonCode,
    confidence: "insufficient",
    evidence: Object.freeze([{ kind: "signal", state: reasonCode === "invalid_context" ? "conflicting" : "missing" }] as const),
    freshness: Object.freeze([...freshness]),
    missingCapabilities: Object.freeze([]),
    missingModules: Object.freeze([]),
    staleModules: Object.freeze([]),
    conflictingSignals: Object.freeze(reasonCode === "invalid_context" ? ["temporal_input"] : []),
    nextUsefulEvaluationAt: null,
  })];
}

function temporalStateApplies(kind: TemporalRuleKind, state: TripTemporalState, localDate: string, endDate: string): boolean {
  if (kind === "tomorrow") return state.kind === "tomorrow";
  if (kind === "today") return state.kind === "today";
  return localDate === endDate && (
    state.kind === "today"
    || (state.kind === "in-progress" && state.isLastDay)
  );
}

function evaluateTemporalRule(kind: TemporalRuleKind) {
  return (input: Parameters<DecisionRule["evaluate"]>[0], now: Date): readonly RuleEvaluationDraft[] => {
    const temporal = input.context.temporal.value;
    if (!temporal || !Number.isFinite(now.getTime())) return temporalAbstention("invalid_context");
    const startDate = normalizedCalendarDate(temporal.startDateTime);
    const endDate = normalizedCalendarDate(temporal.endDateTime);
    const dayWindow = resolveDestinationLocalDayWindow(now, temporal.timezone);
    if (!startDate || !endDate || startDate > endDate || !dayWindow) return temporalAbstention("invalid_context");

    // The persisted temporal state can be stale; only a state rederived for this exact injected clock is trusted.
    const state = safeTripTemporalState(now, temporal.startDateTime, temporal.endDateTime, temporal.timezone);
    const freshness = Object.freeze([{ module: "temporal" as const, state: input.context.temporal.freshness }]);
    if (!state) return temporalAbstention("invalid_context", freshness);
    if (!temporalStateApplies(kind, state, dayWindow.localDate, endDate)) {
      const reason = kind === "last-day" && (state.kind === "just-finished" || state.kind === "memory")
        ? "trip_finished"
        : "trip_not_applicable";
      return temporalAbstention(reason, freshness);
    }

    const selected = TEMPORAL_DECISIONS[kind];
    const eventDate = kind === "last-day" ? endDate : startDate;
    const draft: ActDecisionDraft = {
      outcome: "act",
      kind: selected.kind,
      category: "trip_lifecycle",
      reasonCode: "actionable",
      confidence: "sufficient",
      evidence: Object.freeze([
        { kind: "module", state: "available" },
        { kind: "signal", state: "coherent" },
        { kind: "window", state: "inside" },
      ]),
      freshness,
      dedupeKey: `${input.tripId}:${selected.kind}:${eventDate}`,
      window: Object.freeze({
        validFrom: dayWindow.validFrom,
        validUntil: dayWindow.validUntil,
        effectiveAt: now.toISOString(),
        expiresAt: dayWindow.validUntil,
      }),
      payload: Object.freeze({ attentionSignal: "trip_lifecycle", temporalState: selected.temporalState }),
    };
    return [Object.freeze(draft)];
  };
}

export const DECISION_RULES: readonly DecisionRule[] = Object.freeze([
  defineRule({
    id: "trip-start-tomorrow",
    purpose: "Evaluate whether the trip starts tomorrow in destination-local time.",
    enables: Object.freeze(["trip_start_tomorrow"]),
    requiredCapabilities: Object.freeze(["temporal"]),
    requiredModules: Object.freeze(["temporal"]),
    priority: "low",
    preference: "before_trip",
    freshnessPolicy: "derived_temporal",
    abstainReasons: TEMPORAL_REASONS,
    evaluate: evaluateTemporalRule("tomorrow"),
  }),
  defineRule({
    id: "trip-start-today",
    purpose: "Evaluate whether the trip starts today in destination-local time.",
    enables: Object.freeze(["trip_start_today"]),
    requiredCapabilities: Object.freeze(["temporal"]),
    requiredModules: Object.freeze(["temporal"]),
    priority: "normal",
    preference: "during_trip",
    freshnessPolicy: "derived_temporal",
    abstainReasons: TEMPORAL_REASONS,
    evaluate: evaluateTemporalRule("today"),
  }),
  defineRule({
    id: "last-day",
    purpose: "Evaluate whether today is the trip's last destination-local day.",
    enables: Object.freeze(["trip_last_day"]),
    requiredCapabilities: Object.freeze(["temporal"]),
    requiredModules: Object.freeze(["temporal"]),
    priority: "normal",
    preference: "during_trip",
    freshnessPolicy: "derived_temporal",
    abstainReasons: TEMPORAL_REASONS,
    evaluate: evaluateTemporalRule("last-day"),
  }),
  defineRule({
    id: "weather-attention-candidate",
    purpose: "Evaluate curated activities against coherent fresh weather.",
    enables: Object.freeze(["weather_attention_candidate"]),
    requiredCapabilities: Object.freeze(["weather", "narrative"]),
    requiredModules: Object.freeze(["weather", "narrative"]),
    priority: "high",
    preference: "during_trip",
    freshnessPolicy: "fresh_weather",
    abstainReasons: PLACEHOLDER_REASONS,
    evaluate: notImplementedYet,
  }),
  defineRule({
    id: "light-moment-candidate",
    purpose: "Evaluate curated photo moments against coherent fresh light windows.",
    enables: Object.freeze(["light_moment_candidate"]),
    requiredCapabilities: Object.freeze(["weather", "narrative"]),
    requiredModules: Object.freeze(["weather", "narrative"]),
    priority: "normal",
    preference: "during_trip",
    freshnessPolicy: "fresh_weather",
    abstainReasons: PLACEHOLDER_REASONS,
    evaluate: notImplementedYet,
  }),
]);
