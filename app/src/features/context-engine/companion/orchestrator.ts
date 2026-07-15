import type { ActDecision, DecisionKind, DecisionPriority } from "../decision";
import {
  COMPANION_POLICY,
  type CompanionAction,
  type CompanionChannel,
  type CompanionDecisionRef,
  type CompanionDependencies,
  type CompanionGate,
  type CompanionInput,
  type CompanionResult,
  type CompanionSilence,
  type CompanionSilenceReason,
} from "./contracts";
import {
  evaluateCompanionFrequency,
  resolveCompanionChannel,
  validateCompanionHistory,
} from "./policy";
import { notifyCompanionObserver, readCompanionTiming } from "./observer";

const RULE_IDS = new Set([
  "trip-start-tomorrow",
  "trip-start-today",
  "last-day",
  "weather-attention-candidate",
  "light-moment-candidate",
]);
const CATEGORIES = new Set(["trip_lifecycle", "weather_attention", "light_moment"]);
const PRIORITIES = new Set<DecisionPriority>(["high", "normal", "low"]);
const CAPABILITIES = new Set(["destination", "temporal", "financial", "narrative", "weather"]);
const MODULES = new Set(["destination", "temporal", "financial", "narrative", "weather"]);
const FRESHNESS_STATES = new Set(["fresh", "stale", "unavailable"]);
const EVIDENCE_KINDS = new Set([
  "capability",
  "module",
  "freshness",
  "preference",
  "window",
  "signal",
  "activity_metadata",
]);
const EVIDENCE_STATES = new Set([
  "available",
  "unavailable",
  "fresh",
  "stale",
  "enabled",
  "disabled",
  "inside",
  "outside",
  "present",
  "missing",
  "coherent",
  "conflicting",
]);
interface ValidatedSelection {
  readonly decision: ActDecision;
  readonly decisionRef: CompanionDecisionRef;
  readonly channel: CompanionChannel;
  readonly validFromMs: number;
  readonly validUntilMs: number;
  readonly expiresAtMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown, allowed: ReadonlySet<string>): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && allowed.has(item));
}

function isEvidence(value: unknown): boolean {
  return isRecord(value)
    && typeof value.kind === "string"
    && EVIDENCE_KINDS.has(value.kind)
    && typeof value.state === "string"
    && EVIDENCE_STATES.has(value.state);
}

function isFreshness(value: unknown): boolean {
  return isRecord(value)
    && typeof value.module === "string"
    && MODULES.has(value.module)
    && typeof value.state === "string"
    && FRESHNESS_STATES.has(value.state);
}

function parseInstant(value: unknown): number | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function cloneSelected(selected: unknown): ActDecision | null {
  try {
    return deepFreeze(structuredClone(selected)) as ActDecision;
  } catch {
    return null;
  }
}

function validateSelection(selected: unknown): ValidatedSelection | null {
  try {
    const channel = isRecord(selected) ? resolveCompanionChannel(selected.kind) : null;
    if (!isRecord(selected)
      || selected.outcome !== "act"
      || !isNonEmptyString(selected.id)
      || !selected.id.startsWith("decision:")
      || typeof selected.ruleId !== "string"
      || !RULE_IDS.has(selected.ruleId)
      || typeof selected.kind !== "string"
      || channel === null
      || typeof selected.category !== "string"
      || !CATEGORIES.has(selected.category)
      || typeof selected.priority !== "string"
      || !PRIORITIES.has(selected.priority as DecisionPriority)
      || selected.reasonCode !== "actionable"
      || selected.confidence !== "sufficient"
      || !Array.isArray(selected.evidence)
      || !selected.evidence.every(isEvidence)
      || !Array.isArray(selected.freshness)
      || !selected.freshness.every(isFreshness)
      || !isStringArray(selected.requiredCapabilities, CAPABILITIES)
      || !isStringArray(selected.sourceModules, MODULES)
      || !isNonEmptyString(selected.dedupeKey)
      || !isRecord(selected.window)
      || !isRecord(selected.payload)) return null;

    const validFromMs = parseInstant(selected.window.validFrom);
    const validUntilMs = parseInstant(selected.window.validUntil);
    const effectiveAtMs = parseInstant(selected.window.effectiveAt);
    const expiresAtMs = parseInstant(selected.window.expiresAt);
    if (validFromMs === null
      || validUntilMs === null
      || effectiveAtMs === null
      || expiresAtMs === null
      || validUntilMs <= validFromMs
      || expiresAtMs <= validFromMs
      || effectiveAtMs < validFromMs
      || effectiveAtMs > validUntilMs) return null;

    const decision = cloneSelected(selected);
    if (!decision) return null;
    const kind = selected.kind as DecisionKind;
    const priority = selected.priority as DecisionPriority;
    return {
      decision,
      decisionRef: deepFreeze({
        id: selected.id as ActDecision["id"],
        kind,
        priority,
        dedupeKey: selected.dedupeKey,
      }),
      channel,
      validFromMs,
      validUntilMs,
      expiresAtMs,
    };
  } catch {
    return null;
  }
}

function silence(
  reason: CompanionSilenceReason,
  decisionRef: CompanionDecisionRef | null,
  evaluatedGates: readonly CompanionGate[],
  nextUsefulAt?: string,
): CompanionSilence {
  return deepFreeze({
    outcome: "silence",
    reason,
    decisionRef,
    evaluatedGates: [...evaluatedGates],
    ...(nextUsefulAt === undefined ? {} : { nextUsefulAt }),
    policy: COMPANION_POLICY,
  });
}

function action(selection: ValidatedSelection, evaluatedGates: readonly CompanionGate[]): CompanionAction {
  return deepFreeze({
    outcome: "action",
    actionId: selection.decision.id,
    decision: selection.decision,
    channel: selection.channel,
    policy: COMPANION_POLICY,
    reason: "actionable",
    decisionRef: selection.decisionRef,
    evaluatedGates: [...evaluatedGates],
  });
}

function resolveCompanion(
  input: CompanionInput,
  dependencies: CompanionDependencies,
): CompanionResult {
  const gates: CompanionGate[] = ["preference"];
  if (input.preferences.enabled !== true) {
    return silence("preference_disabled", null, gates);
  }

  gates.push("selection");
  let selected: unknown;
  try {
    selected = input.decisionRun.selected;
  } catch {
    return silence("invalid_selected_decision", null, [...gates, "decision_contract"]);
  }
  if (selected === null) return silence("no_selected_decision", null, gates);

  gates.push("decision_contract");
  const validated = validateSelection(selected);
  if (!validated) return silence("invalid_selected_decision", null, gates);

  let nowMs: number;
  try {
    nowMs = dependencies.now().getTime();
  } catch {
    return silence("invalid_selected_decision", validated.decisionRef, gates);
  }
  if (!Number.isFinite(nowMs)) return silence("invalid_selected_decision", validated.decisionRef, gates);

  gates.push("temporal_window");
  if (nowMs < validated.validFromMs) {
    return silence("not_yet_valid", validated.decisionRef, gates, validated.decision.window.validFrom);
  }
  if (nowMs >= validated.validUntilMs || nowMs >= validated.expiresAtMs) {
    return silence("decision_expired", validated.decisionRef, gates);
  }

  gates.push("history");
  let history;
  try {
    history = validateCompanionHistory(input.processedKeys, input.history, nowMs);
  } catch {
    return silence("invalid_history", validated.decisionRef, gates);
  }
  if (!history.valid) return silence("invalid_history", validated.decisionRef, gates);

  gates.push("dedupe");
  if (history.value.dedupeKeys.has(validated.decisionRef.dedupeKey)) {
    return silence("already_processed", validated.decisionRef, gates);
  }

  gates.push("frequency");
  const frequency = evaluateCompanionFrequency(validated.decisionRef.priority, history.value, nowMs);
  if (!frequency.allowed) {
    return silence(frequency.reason, validated.decisionRef, gates, frequency.nextUsefulAt);
  }

  gates.push("channel");
  return action(validated, gates);
}

export function orchestrateCompanion(
  input: CompanionInput,
  dependencies: CompanionDependencies,
): CompanionResult {
  const startedAt = readCompanionTiming(dependencies);
  const result = resolveCompanion(input, dependencies);
  notifyCompanionObserver(result, dependencies, startedAt);
  return result;
}
