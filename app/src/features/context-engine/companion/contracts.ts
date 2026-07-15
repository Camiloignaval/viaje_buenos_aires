import type { ActDecision, ContextDecisionRun, DecisionKind, DecisionPriority } from "../decision";
import type { LivingTravelContext } from "../livingContext";

export const COMPANION_POLICY = "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS" as const;

export type CompanionPolicy = typeof COMPANION_POLICY;
export type CompanionChannel = "push" | "in_app" | "timeline" | "memory" | "editorial";
export type CompanionSilenceReason =
  | "preference_disabled"
  | "no_selected_decision"
  | "invalid_selected_decision"
  | "not_yet_valid"
  | "decision_expired"
  | "already_processed"
  | "invalid_history"
  | "frequency_limited"
  | "recent_high_action";
export type CompanionGate =
  | "preference"
  | "selection"
  | "decision_contract"
  | "temporal_window"
  | "history"
  | "dedupe"
  | "frequency"
  | "channel";

export interface CompanionInput {
  readonly context: LivingTravelContext;
  readonly decisionRun: ContextDecisionRun;
  readonly preferences: Readonly<{ enabled: boolean }>;
}

export interface CompanionDecisionRef {
  readonly id: ActDecision["id"];
  readonly kind: DecisionKind;
  readonly priority: DecisionPriority;
  readonly dedupeKey: string;
}

export interface CompanionAction {
  readonly outcome: "action";
  readonly actionId: ActDecision["id"];
  readonly decision: ActDecision;
  readonly channel: CompanionChannel;
  readonly policy: CompanionPolicy;
  readonly reason: "actionable";
  readonly decisionRef: CompanionDecisionRef;
  readonly evaluatedGates: readonly CompanionGate[];
}

export interface CompanionSilence {
  readonly outcome: "silence";
  readonly reason: CompanionSilenceReason;
  readonly decisionRef: CompanionDecisionRef | null;
  readonly evaluatedGates: readonly CompanionGate[];
  readonly nextUsefulAt?: string;
  readonly policy: CompanionPolicy;
}

export type CompanionResult = CompanionAction | CompanionSilence;

export interface CompanionDependencies {
  readonly now: () => Date;
}
