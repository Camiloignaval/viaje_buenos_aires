import type { DecisionReason, DecisionRule, RuleEvaluationDraft } from "./contracts";

const PLACEHOLDER_REASONS = Object.freeze(["incomplete_context"] as const satisfies readonly DecisionReason[]);

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
    abstainReasons: PLACEHOLDER_REASONS,
    evaluate: notImplementedYet,
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
    abstainReasons: PLACEHOLDER_REASONS,
    evaluate: notImplementedYet,
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
    abstainReasons: PLACEHOLDER_REASONS,
    evaluate: notImplementedYet,
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
