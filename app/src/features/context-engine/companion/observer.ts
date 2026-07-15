import type {
  CompanionDependencies,
  CompanionObservation,
  CompanionResult,
} from "./contracts";

const MAX_OBSERVER_DURATION_MS = 60_000;

export function readCompanionTiming(dependencies: CompanionDependencies): number {
  try {
    const timingNow = dependencies.timingNow;
    return typeof timingNow === "function" ? timingNow() : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function sanitizeDuration(startedAt: number, finishedAt: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) return 0;
  return Math.min(MAX_OBSERVER_DURATION_MS, Math.max(0, finishedAt - startedAt));
}

function observationFor(
  result: CompanionResult,
  durationMs: number,
): CompanionObservation {
  return Object.freeze({
    outcome: result.outcome,
    reason: result.reason,
    policy: result.policy,
    priority: result.decisionRef?.priority ?? "none",
    channel: result.outcome === "action" ? result.channel : "none",
    durationMs,
  });
}

export function notifyCompanionObserver(
  result: CompanionResult,
  dependencies: CompanionDependencies,
  startedAt: number,
): void {
  const finishedAt = readCompanionTiming(dependencies);
  try {
    const observer = dependencies.observer;
    if (typeof observer === "function") {
      observer(observationFor(result, sanitizeDuration(startedAt, finishedAt)));
    }
  } catch {
    // Observability is best-effort and must never influence orchestration.
  }
}
