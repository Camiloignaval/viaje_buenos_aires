import type { DecisionPriority, DecisionReason } from "./contracts";

export const DECISION_PRIORITIES = Object.freeze(["high", "normal", "low"] as const);

export const DECISION_PRIORITY_RANK: Readonly<Record<DecisionPriority, number>> = Object.freeze({
  high: 0,
  normal: 1,
  low: 2,
});

export const DECISION_REASONS = Object.freeze([
  "actionable",
  "incomplete_context",
  "missing_capability",
  "module_unavailable",
  "module_stale",
  "missing_activity_metadata",
  "weak_signal",
  "outside_effective_window",
  "preference_disabled",
  "already_processed",
  "trip_finished",
  "trip_not_applicable",
  "conflicting_signals",
  "invalid_context",
  "duplicate_candidate",
  "not_selected",
] as const satisfies readonly DecisionReason[]);
