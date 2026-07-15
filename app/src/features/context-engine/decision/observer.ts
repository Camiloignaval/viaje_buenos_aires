import type { DecisionObservation, RuleEvaluation } from "./contracts";

const MAX_OBSERVER_DURATION_MS = 60_000;

function sanitizeDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs)) return 0;
  return Math.min(MAX_OBSERVER_DURATION_MS, Math.max(0, Math.round(durationMs)));
}

export function observationFromEvaluation(evaluation: RuleEvaluation, durationMs: number): DecisionObservation {
  const states = evaluation.freshness.map(({ state }) => state);
  const freshness = states.includes("stale")
    ? "stale"
    : states.includes("fresh")
      ? "fresh"
      : "unavailable";
  const availability = evaluation.outcome === "abstain" && evaluation.missingModules.length > 0
    ? "unavailable"
    : evaluation.outcome === "act"
      ? "available"
      : "partial";
  return Object.freeze({
    ruleId: evaluation.ruleId as Exclude<typeof evaluation.ruleId, "engine">,
    phase: evaluation.disposition,
    outcome: evaluation.outcome,
    reasonCode: evaluation.reasonCode,
    availability,
    freshness,
    durationMs: sanitizeDuration(durationMs),
  });
}
