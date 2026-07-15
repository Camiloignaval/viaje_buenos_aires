import { DECISION_PRIORITY_RANK } from "./constants";
import type {
  AbstainDecision,
  AbstainDecisionDraft,
  ActDecision,
  ActDecisionDraft,
  ContextDecisionRun,
  DecisionCapability,
  DecisionDependencies,
  DecisionInput,
  DecisionReason,
  DecisionRule,
  RuleEvaluation,
  RuleEvaluationDraft,
} from "./contracts";
import { observationFromEvaluation } from "./observer";
import { DECISION_RULES } from "./rules";
import { resolveWindowState } from "./time";

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

function preferenceEnabled(input: DecisionInput, rule: DecisionRule): boolean {
  if (!input.preferences.enabled) return false;
  if (rule.preference === "before_trip") return input.preferences.beforeTrip;
  if (rule.preference === "during_trip") return input.preferences.duringTrip;
  return true;
}

function normalizeInput(input: DecisionInput): DecisionInput {
  const activities = [...input.activities]
    .sort((left, right) => {
      if (left.window.validFrom !== right.window.validFrom) return left.window.validFrom < right.window.validFrom ? -1 : 1;
      if (left.activityId === right.activityId) return 0;
      return left.activityId < right.activityId ? -1 : 1;
    })
    .map((activity) => Object.freeze({
      ...activity,
      intelligence: Object.freeze({ ...activity.intelligence }),
      window: Object.freeze({ ...activity.window }),
    }));
  return Object.freeze({
    ...input,
    preferences: Object.freeze({ ...input.preferences }),
    processedKeys: new Set(input.processedKeys),
    activities: Object.freeze(activities),
  });
}

function abstain(
  rule: DecisionRule,
  order: number,
  reasonCode: Exclude<DecisionReason, "actionable">,
  details: Partial<AbstainDecisionDraft> = {},
): RuleEvaluation {
  return Object.freeze({
    id: `abstain:${rule.id}:${order}`,
    ruleId: rule.id,
    priority: rule.priority,
    outcome: "abstain",
    reasonCode,
    confidence: details.confidence ?? "insufficient",
    evidence: freezeArray(details.evidence ?? []),
    freshness: freezeArray(details.freshness ?? []),
    missingCapabilities: freezeArray(details.missingCapabilities ?? []),
    missingModules: freezeArray(details.missingModules ?? []),
    staleModules: freezeArray(details.staleModules ?? []),
    conflictingSignals: freezeArray(details.conflictingSignals ?? []),
    nextUsefulEvaluationAt: details.nextUsefulEvaluationAt ?? null,
    dedupeKey: details.dedupeKey ?? null,
    window: details.window ? Object.freeze({ ...details.window }) : null,
    disposition: "abstained",
    order,
  });
}

function act(rule: DecisionRule, order: number, draft: ActDecisionDraft): RuleEvaluation {
  return Object.freeze({
    ...draft,
    id: `decision:${draft.dedupeKey}`,
    ruleId: rule.id,
    priority: rule.priority,
    evidence: freezeArray(draft.evidence.map((item) => Object.freeze({ ...item }))),
    freshness: freezeArray(draft.freshness.map((item) => Object.freeze({ ...item }))),
    window: Object.freeze({ ...draft.window }),
    payload: Object.freeze({ ...draft.payload }),
    disposition: "not_selected",
    order,
  });
}

function moduleFreshness(input: DecisionInput, rule: DecisionRule) {
  return rule.requiredModules.map((module) => ({ module, state: input.context[module].freshness }));
}

function normalizeDraft(rule: DecisionRule, draft: RuleEvaluationDraft, input: DecisionInput, now: Date, order: number): RuleEvaluation {
  if (draft.outcome === "abstain") return abstain(rule, order, draft.reasonCode, draft);
  const windowState = resolveWindowState(draft.window, now);
  if (windowState !== "active") {
    return abstain(rule, order, windowState === "invalid" ? "invalid_context" : "outside_effective_window", {
      dedupeKey: draft.dedupeKey,
      window: draft.window,
      evidence: draft.evidence,
      freshness: draft.freshness,
    });
  }
  if (input.processedKeys.has(draft.dedupeKey)) {
    return abstain(rule, order, "already_processed", {
      dedupeKey: draft.dedupeKey,
      window: draft.window,
      evidence: draft.evidence,
      freshness: draft.freshness,
    });
  }
  return act(rule, order, draft);
}

function evaluateRule(rule: DecisionRule, input: DecisionInput, now: Date, startOrder: number): RuleEvaluation[] {
  if (!preferenceEnabled(input, rule)) return [abstain(rule, startOrder, "preference_disabled")];
  const missingCapabilities = rule.requiredCapabilities.filter((capability: DecisionCapability) => !input.context.capabilities[capability]);
  if (missingCapabilities.length > 0) {
    return [abstain(rule, startOrder, "missing_capability", { missingCapabilities, freshness: moduleFreshness(input, rule) })];
  }
  const missingModules = rule.requiredModules.filter((module) => input.context[module].status !== "available");
  if (missingModules.length > 0) {
    return [abstain(rule, startOrder, "module_unavailable", { missingModules, freshness: moduleFreshness(input, rule) })];
  }
  let drafts: readonly RuleEvaluationDraft[];
  try {
    drafts = rule.evaluate(input, new Date(now));
  } catch {
    return [abstain(rule, startOrder, "invalid_context")];
  }
  if (drafts.length === 0) return [abstain(rule, startOrder, "incomplete_context")];
  return drafts.map((draft, index) => normalizeDraft(rule, draft, input, now, startOrder + index));
}

function replaceWithAbstention(evaluation: RuleEvaluation, reasonCode: "duplicate_candidate" | "not_selected"): RuleEvaluation {
  if (evaluation.outcome !== "act") return evaluation;
  const rule: DecisionRule = {
    id: evaluation.ruleId,
    purpose: "resolution",
    enables: [],
    requiredCapabilities: [],
    requiredModules: [],
    priority: evaluation.priority,
    preference: "always",
    freshnessPolicy: "none",
    abstainReasons: [reasonCode],
    evaluate: () => [],
  };
  return abstain(rule, evaluation.order, reasonCode, {
    dedupeKey: evaluation.dedupeKey,
    window: evaluation.window,
    evidence: evaluation.evidence,
    freshness: evaluation.freshness,
    conflictingSignals: reasonCode === "not_selected" ? [evaluation.category] : [],
  });
}

function better(left: RuleEvaluation, right: RuleEvaluation): RuleEvaluation {
  if (left.outcome !== "act") return right;
  if (right.outcome !== "act") return left;
  const rankDifference = DECISION_PRIORITY_RANK[left.priority] - DECISION_PRIORITY_RANK[right.priority];
  return rankDifference < 0 || (rankDifference === 0 && left.order < right.order) ? left : right;
}

function resolveCandidates(evaluations: readonly RuleEvaluation[]): RuleEvaluation[] {
  const resolved = [...evaluations];
  const dedupeKeys = new Set<string>();
  for (let index = 0; index < resolved.length; index += 1) {
    const evaluation = resolved[index];
    if (evaluation.outcome !== "act") continue;
    if (dedupeKeys.has(evaluation.dedupeKey)) resolved[index] = replaceWithAbstention(evaluation, "duplicate_candidate");
    else dedupeKeys.add(evaluation.dedupeKey);
  }

  const categoryWinners = new Map<string, RuleEvaluation>();
  for (const evaluation of resolved) {
    if (evaluation.outcome !== "act") continue;
    const current = categoryWinners.get(evaluation.category);
    categoryWinners.set(evaluation.category, current ? better(current, evaluation) : evaluation);
  }
  for (let index = 0; index < resolved.length; index += 1) {
    const evaluation = resolved[index];
    if (evaluation.outcome === "act" && categoryWinners.get(evaluation.category)?.order !== evaluation.order) {
      resolved[index] = replaceWithAbstention(evaluation, "not_selected");
    }
  }

  const candidates = resolved.filter((evaluation): evaluation is RuleEvaluation & ActDecision => evaluation.outcome === "act");
  const selected = candidates.reduce<RuleEvaluation & ActDecision | null>((winner, candidate) => winner ? better(winner, candidate) as RuleEvaluation & ActDecision : candidate, null);
  return resolved.map((evaluation) => {
    if (evaluation.outcome !== "act") return evaluation;
    return Object.freeze({ ...evaluation, disposition: evaluation.order === selected?.order ? "selected" : "not_selected" });
  });
}

function overallAbstention(): AbstainDecision {
  return Object.freeze({
    id: "abstain:engine",
    ruleId: "engine",
    priority: null,
    outcome: "abstain",
    reasonCode: "incomplete_context",
    confidence: "insufficient",
    evidence: Object.freeze([]),
    freshness: Object.freeze([]),
    missingCapabilities: Object.freeze([]),
    missingModules: Object.freeze([]),
    staleModules: Object.freeze([]),
    conflictingSignals: Object.freeze([]),
    nextUsefulEvaluationAt: null,
    dedupeKey: null,
    window: null,
  });
}

export function createContextDecisionRun(input: DecisionInput, dependencies: DecisionDependencies): ContextDecisionRun {
  const now = dependencies.now();
  const normalizedInput = normalizeInput(input);
  const rules = dependencies.rules ?? DECISION_RULES;
  const timingNow = dependencies.timingNow ?? (() => 0);
  const startedAt = timingNow();
  const evaluations: RuleEvaluation[] = [];
  for (const rule of rules) evaluations.push(...evaluateRule(rule, normalizedInput, now, evaluations.length));
  const resolved = resolveCandidates(evaluations);
  const selectedEvaluation = resolved.find((evaluation): evaluation is RuleEvaluation & ActDecision => evaluation.outcome === "act" && evaluation.disposition === "selected") ?? null;
  const selected: ActDecision | null = selectedEvaluation
    ? Object.freeze({
        id: selectedEvaluation.id,
        ruleId: selectedEvaluation.ruleId,
        priority: selectedEvaluation.priority,
        outcome: selectedEvaluation.outcome,
        kind: selectedEvaluation.kind,
        category: selectedEvaluation.category,
        reasonCode: selectedEvaluation.reasonCode,
        confidence: selectedEvaluation.confidence,
        evidence: selectedEvaluation.evidence,
        freshness: selectedEvaluation.freshness,
        dedupeKey: selectedEvaluation.dedupeKey,
        window: selectedEvaluation.window,
        payload: selectedEvaluation.payload,
      })
    : null;
  const durationMs = timingNow() - startedAt;
  for (const evaluation of resolved) {
    try {
      dependencies.observer?.(observationFromEvaluation(evaluation, durationMs));
    } catch {
      // Observability is best-effort and cannot participate in decisions.
    }
  }
  const frozenEvaluations = Object.freeze(resolved);
  return Object.freeze({ decision: selected ?? overallAbstention(), selected, evaluations: frozenEvaluations });
}
