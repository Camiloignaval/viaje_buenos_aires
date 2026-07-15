import { EDITORIAL_V1_CATALOG, EDITORIAL_V1_KINDS } from "./catalog";
import {
  EditorialContractError,
  type EditorialCatalog,
  type EditorialChannel,
  type EditorialDecisionKind,
  type EditorialMessage,
} from "./contracts";
import { selectEditorialVariantIndex } from "./hash";
import { validateEditorialCatalog } from "./validation";

const ACTION_KEYS = [
  "outcome",
  "actionId",
  "decision",
  "channel",
  "policy",
  "reason",
  "decisionRef",
  "evaluatedGates",
] as const;
const DECISION_KEYS = [
  "outcome",
  "id",
  "ruleId",
  "kind",
  "category",
  "priority",
  "reasonCode",
  "confidence",
  "evidence",
  "freshness",
  "requiredCapabilities",
  "sourceModules",
  "dedupeKey",
  "window",
  "payload",
] as const;
const DECISION_REF_KEYS = ["id", "kind", "priority", "dedupeKey"] as const;
const WINDOW_KEYS = ["validFrom", "validUntil", "effectiveAt", "expiresAt"] as const;
const CHANNELS = new Set<EditorialChannel>(["push", "in_app", "timeline", "memory", "editorial"]);
const RULE_IDS = new Set([
  "trip-start-tomorrow",
  "trip-start-today",
  "last-day",
  "weather-attention-candidate",
  "light-moment-candidate",
]);
const CATEGORIES = new Set(["trip_lifecycle", "weather_attention", "light_moment"]);
const PRIORITIES = new Set(["high", "normal", "low"]);
const CAPABILITIES = new Set(["destination", "temporal", "financial", "narrative", "weather"]);
const MODULES = new Set(CAPABILITIES);
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
const FRESHNESS_STATES = new Set(["fresh", "stale", "unavailable"]);
const GATES = new Set([
  "preference",
  "selection",
  "decision_contract",
  "temporal_window",
  "history",
  "dedupe",
  "frequency",
  "channel",
]);

// La frontera se replica estructuralmente para no invertir la dependencia hacia Companion.
export interface EditorialCompanionAction {
  readonly outcome: "action";
  readonly actionId: string;
  readonly decision: Readonly<{
    outcome: "act";
    id: string;
    ruleId: string;
    kind: string;
    category: string;
    priority: string;
    reasonCode: "actionable";
    confidence: "sufficient";
    evidence: readonly Readonly<{ kind: string; state: string }>[];
    freshness: readonly Readonly<{ module: string; state: string }>[];
    requiredCapabilities: readonly string[];
    sourceModules: readonly string[];
    dedupeKey: string;
    window: Readonly<{
      validFrom: string;
      validUntil: string;
      effectiveAt: string;
      expiresAt: string;
    }>;
    payload: Readonly<object>;
  }>;
  readonly channel: string;
  readonly policy: "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS";
  readonly reason: "actionable";
  readonly decisionRef: Readonly<{
    id: string;
    kind: string;
    priority: string;
    dedupeKey: string;
  }>;
  readonly evaluatedGates: readonly string[];
}

function fail(code: "INVALID_ACTION" | "UNSUPPORTED_KIND" | "INVALID_CHANNEL"): never {
  throw new EditorialContractError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAllowedStringArray(value: unknown, allowed: ReadonlySet<string>): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && allowed.has(item));
}

function isEvidence(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["kind", "state"])
    && typeof value.kind === "string"
    && EVIDENCE_KINDS.has(value.kind)
    && typeof value.state === "string"
    && EVIDENCE_STATES.has(value.state);
}

function isFreshness(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, ["module", "state"])
    && typeof value.module === "string"
    && MODULES.has(value.module)
    && typeof value.state === "string"
    && FRESHNESS_STATES.has(value.state);
}

function isWindow(value: unknown): boolean {
  return isRecord(value)
    && hasExactKeys(value, WINDOW_KEYS)
    && WINDOW_KEYS.every((key) => isNonEmptyString(value[key]) && Number.isFinite(Date.parse(value[key] as string)));
}

function validateActionStructure(value: unknown): asserts value is EditorialCompanionAction {
  if (!isRecord(value)
    || !hasExactKeys(value, ACTION_KEYS)
    || value.outcome !== "action"
    || !isNonEmptyString(value.actionId)
    || !isRecord(value.decision)
    || !hasExactKeys(value.decision, DECISION_KEYS)
    || value.decision.outcome !== "act"
    || !isNonEmptyString(value.decision.id)
    || !isNonEmptyString(value.decision.ruleId)
    || !RULE_IDS.has(value.decision.ruleId)
    || !isNonEmptyString(value.decision.kind)
    || !isNonEmptyString(value.decision.category)
    || !CATEGORIES.has(value.decision.category)
    || !isNonEmptyString(value.decision.priority)
    || !PRIORITIES.has(value.decision.priority)
    || value.decision.reasonCode !== "actionable"
    || value.decision.confidence !== "sufficient"
    || !Array.isArray(value.decision.evidence)
    || !value.decision.evidence.every(isEvidence)
    || !Array.isArray(value.decision.freshness)
    || !value.decision.freshness.every(isFreshness)
    || !isAllowedStringArray(value.decision.requiredCapabilities, CAPABILITIES)
    || !isAllowedStringArray(value.decision.sourceModules, MODULES)
    || !isNonEmptyString(value.decision.dedupeKey)
    || !isWindow(value.decision.window)
    || !isRecord(value.decision.payload)
    || value.policy !== "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS"
    || value.reason !== "actionable"
    || !isRecord(value.decisionRef)
    || !hasExactKeys(value.decisionRef, DECISION_REF_KEYS)
    || !isNonEmptyString(value.decisionRef.id)
    || !isNonEmptyString(value.decisionRef.kind)
    || !isNonEmptyString(value.decisionRef.priority)
    || !PRIORITIES.has(value.decisionRef.priority)
    || !isNonEmptyString(value.decisionRef.dedupeKey)
    || !Array.isArray(value.evaluatedGates)
    || !value.evaluatedGates.every((gate) => typeof gate === "string" && GATES.has(gate))
    || value.actionId !== value.decision.id
    || value.actionId !== value.decisionRef.id
    || value.decision.kind !== value.decisionRef.kind
    || value.decision.priority !== value.decisionRef.priority
    || value.decision.dedupeKey !== value.decisionRef.dedupeKey) {
    fail("INVALID_ACTION");
  }
}

function validateKind(kind: string): asserts kind is EditorialDecisionKind {
  if (!EDITORIAL_V1_KINDS.includes(kind as EditorialDecisionKind)) fail("UNSUPPORTED_KIND");
}

function validateChannel(channel: string): asserts channel is EditorialChannel {
  if (!CHANNELS.has(channel as EditorialChannel)) fail("INVALID_CHANNEL");
}

export function createEditorialMessage(
  action: EditorialCompanionAction,
  catalog: EditorialCatalog = EDITORIAL_V1_CATALOG,
): EditorialMessage {
  try {
    validateActionStructure(action);
  } catch (error) {
    if (error instanceof EditorialContractError) throw error;
    fail("INVALID_ACTION");
  }
  validateKind(action.decision.kind);
  validateChannel(action.channel);
  let validCatalog: EditorialCatalog;
  try {
    validCatalog = validateEditorialCatalog(catalog);
  } catch (error) {
    if (error instanceof EditorialContractError) throw error;
    throw new EditorialContractError("INVALID_CATALOG");
  }
  const variants = validCatalog.entries[action.decision.kind];
  const index = selectEditorialVariantIndex(validCatalog.version, action.actionId, variants.length);
  const variant = variants[index];

  return Object.freeze({
    locale: validCatalog.locale,
    catalogVersion: validCatalog.version,
    variantId: variant.id,
    text: variant.text,
    actionRef: Object.freeze({
      actionId: action.actionId,
      decisionId: action.decision.id,
      kind: action.decision.kind,
    }),
    channel: action.channel,
  });
}
