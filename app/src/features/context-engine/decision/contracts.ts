import type { LivingTravelContext } from "../livingContext";
import type { LivingContextFreshness, LivingContextModuleName } from "../types";

export const DECISION_RULE_IDS = [
  "trip-start-tomorrow",
  "trip-start-today",
  "last-day",
  "weather-attention-candidate",
  "light-moment-candidate",
] as const;

export type RuleId = (typeof DECISION_RULE_IDS)[number];
export type DecisionPriority = "high" | "normal" | "low";
export type DecisionCategory = "trip_lifecycle" | "weather_attention" | "light_moment";
export type DecisionKind =
  | "trip_start_tomorrow"
  | "trip_start_today"
  | "trip_last_day"
  | "weather_attention_candidate"
  | "light_moment_candidate";
export type DecisionConfidence = "sufficient" | "insufficient" | "unknown";
export type DecisionReason =
  | "actionable"
  | "incomplete_context"
  | "missing_capability"
  | "module_unavailable"
  | "module_stale"
  | "missing_activity_metadata"
  | "weak_signal"
  | "outside_effective_window"
  | "preference_disabled"
  | "already_processed"
  | "trip_finished"
  | "trip_not_applicable"
  | "conflicting_signals"
  | "invalid_context"
  | "duplicate_candidate"
  | "not_selected";
export type DecisionCapability = keyof LivingTravelContext["capabilities"];
export type DecisionFreshnessPolicy = "none" | "derived_temporal" | "fresh_weather";
export type DecisionPreference = "always" | "before_trip" | "during_trip";
export type DecisionDisposition = "selected" | "not_selected" | "abstained";

export interface DecisionWindow {
  readonly validFrom: string;
  readonly validUntil: string;
  readonly effectiveAt: string;
  readonly expiresAt: string;
}

export interface DecisionEvidence {
  readonly kind: "capability" | "module" | "freshness" | "preference" | "window" | "signal" | "activity_metadata";
  readonly state: "available" | "unavailable" | "fresh" | "stale" | "enabled" | "disabled" | "inside" | "outside" | "present" | "missing" | "coherent" | "conflicting";
}

export interface DecisionFreshnessEvidence {
  readonly module: LivingContextModuleName;
  readonly state: LivingContextFreshness;
}

export interface DecisionPayload {
  readonly attentionSignal?: "trip_lifecycle" | "weather" | "light";
  readonly temporalState?: "before" | "active" | "finished";
  readonly activityCandidate?: "curated";
}

export interface NormalizedActivityCandidate {
  readonly activityId: string;
  readonly intelligence: Readonly<{
    outdoor?: boolean;
    indoor?: boolean;
    rainFriendly?: boolean;
    photoMoment?: boolean;
  }>;
  readonly window: Readonly<{
    validFrom: string;
    validUntil: string;
    timezone: string;
  }>;
}

export interface DecisionInput {
  readonly tripId: string;
  readonly context: LivingTravelContext;
  readonly preferences: Readonly<{
    enabled: boolean;
    beforeTrip: boolean;
    duringTrip: boolean;
  }>;
  readonly processedKeys: ReadonlySet<string>;
  readonly activities: readonly NormalizedActivityCandidate[];
}

export interface ActDecisionDraft {
  readonly outcome: "act";
  readonly kind: DecisionKind;
  readonly category: DecisionCategory;
  readonly reasonCode: "actionable";
  readonly confidence: "sufficient";
  readonly evidence: readonly DecisionEvidence[];
  readonly freshness: readonly DecisionFreshnessEvidence[];
  readonly dedupeKey: string;
  readonly window: DecisionWindow;
  readonly payload: DecisionPayload;
}

export interface AbstainDecisionDraft {
  readonly outcome: "abstain";
  readonly reasonCode: Exclude<DecisionReason, "actionable">;
  readonly confidence: "insufficient" | "unknown";
  readonly evidence: readonly DecisionEvidence[];
  readonly freshness: readonly DecisionFreshnessEvidence[];
  readonly missingCapabilities: readonly DecisionCapability[];
  readonly missingModules: readonly LivingContextModuleName[];
  readonly staleModules: readonly LivingContextModuleName[];
  readonly conflictingSignals: readonly string[];
  readonly nextUsefulEvaluationAt: string | null;
  readonly dedupeKey?: string | null;
  readonly window?: DecisionWindow | null;
}

export type RuleEvaluationDraft = ActDecisionDraft | AbstainDecisionDraft;

export interface DecisionRule {
  readonly id: RuleId;
  readonly purpose: string;
  readonly enables: readonly string[];
  readonly requiredCapabilities: readonly DecisionCapability[];
  readonly requiredModules: readonly LivingContextModuleName[];
  readonly priority: DecisionPriority;
  readonly preference: DecisionPreference;
  readonly freshnessPolicy: DecisionFreshnessPolicy;
  readonly abstainReasons: readonly DecisionReason[];
  evaluate(input: DecisionInput, now: Date): readonly RuleEvaluationDraft[];
}

export interface ActDecision extends ActDecisionDraft {
  readonly id: `decision:${string}`;
  readonly ruleId: RuleId;
  readonly priority: DecisionPriority;
  readonly requiredCapabilities: readonly DecisionCapability[];
  readonly sourceModules: readonly LivingContextModuleName[];
}

export interface AbstainDecision extends Omit<AbstainDecisionDraft, "dedupeKey" | "window"> {
  readonly id: `abstain:${string}`;
  readonly ruleId: RuleId | "engine";
  readonly priority: DecisionPriority | null;
  readonly requiredCapabilities: readonly DecisionCapability[];
  readonly sourceModules: readonly LivingContextModuleName[];
  readonly dedupeKey: string | null;
  readonly window: DecisionWindow | null;
}

export type ContextDecision = ActDecision | AbstainDecision;
export type RuleEvaluation = ContextDecision & Readonly<{
  disposition: DecisionDisposition;
  order: number;
}>;

export interface ContextDecisionRun {
  readonly decision: ContextDecision;
  readonly selected: ActDecision | null;
  readonly evaluations: readonly RuleEvaluation[];
}

export interface DecisionObservation {
  readonly ruleId: RuleId;
  readonly phase: DecisionDisposition;
  readonly outcome: ContextDecision["outcome"];
  readonly reasonCode: DecisionReason;
  readonly availability: "available" | "partial" | "unavailable";
  readonly freshness: LivingContextFreshness;
  readonly durationMs: number;
}

export type DecisionObserver = (observation: DecisionObservation) => void;

export interface DecisionDependencies {
  readonly now: () => Date;
  readonly rules?: readonly DecisionRule[];
  readonly observer?: DecisionObserver;
  readonly timingNow?: () => number;
}
