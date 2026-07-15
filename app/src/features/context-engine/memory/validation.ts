import type {
  AuthorizedMemoryEvent,
  MemoryCandidate,
  MemoryClassificationFacts,
  MemoryCompanionAction,
  MemoryEditorialMessage,
  MemoryRecord,
  MemoryScope,
} from "./contracts";

const ID = /^[A-Za-z0-9._:-]{1,128}$/u;
const ACTION_KEYS = ["outcome", "actionId", "decision", "channel", "policy", "reason", "decisionRef", "evaluatedGates"] as const;
const DECISION_KEYS = ["outcome", "id", "ruleId", "kind", "category", "priority", "reasonCode", "confidence", "evidence", "freshness", "requiredCapabilities", "sourceModules", "dedupeKey", "window", "payload"] as const;
const MESSAGE_KEYS = ["locale", "catalogVersion", "variantId", "text", "actionRef", "channel"] as const;
const KINDS = new Set(["trip_start_tomorrow", "trip_start_today", "trip_last_day", "weather_attention_candidate", "light_moment_candidate"]);
const CHANNELS = new Set(["push", "in_app", "timeline", "memory", "editorial"]);
const PRIORITIES = new Set(["high", "normal", "low"]);
const GATES = new Set(["preference", "selection", "decision_contract", "temporal_window", "history", "dedupe", "frequency", "channel"]);
const VARIANTS: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  trip_start_tomorrow: Object.freeze({ "tomorrow-01": "Mañana comienza este viaje.", "tomorrow-02": "Falta poco: el viaje empieza mañana." }),
  trip_start_today: Object.freeze({ "today-01": "Hoy comienza una nueva historia.", "today-02": "El viaje empieza hoy, a su propio ritmo." }),
  trip_last_day: Object.freeze({ "last-day-01": "Hoy es el último día de este viaje.", "last-day-02": "Este viaje llega hoy a su último día." }),
  weather_attention_candidate: Object.freeze({ "weather-01": "Quizás sea un buen momento para considerar el clima.", "weather-02": "El clima puede ser relevante para este momento del viaje." }),
  light_moment_candidate: Object.freeze({ "light-01": "Puede ser un buen momento para disfrutar la luz natural.", "light-02": "La luz natural acompaña este momento del viaje." }),
});
const PRIVACY_KEY = /(?:email|e-mail|token|secret|password|credential|coordinate|latitude|longitude|\blat\b|\blng\b|rawerror|stack|quote|note|weather|observation|fullpayload|pii|usertext|freetext|fullname|address|phone)/iu;
const CANDIDATE_KEYS = ["outcome", "lifecycle", "type", "origin", "occurredAt", "scope", "decisionRef", "editorialRef", "evidence", "meaning", "retention", "dedupe"] as const;
const RECORD_KEYS = ["recordKind", "memoryKey", "identityVersion", "type", "origin", "occurredAt", "createdAt", "owner", "tripRef", "storyRef", "decisionRef", "editorialRef", "evidence", "meaning", "state", "retention"] as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function isSafeId(value: unknown): value is string {
  return typeof value === "string" && ID.test(value);
}

export function isIso(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

export function containsProhibitedData(value: unknown, seen = new Set<object>()): boolean {
  if (typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) return true;
  if (typeof value !== "object" || value === null) return false;
  if (seen.has(value)) return false;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return true;
    if (PRIVACY_KEY.test(key)) return true;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.get || descriptor.set) return false;
    if (containsProhibitedData(descriptor.value, seen)) return true;
  }
  return false;
}

export function hasAccessor(value: unknown, seen = new Set<object>()): boolean {
  if (typeof value !== "object" || value === null) return false;
  if (seen.has(value)) return true;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.get || descriptor.set) return true;
    if (hasAccessor(descriptor.value, seen)) return true;
  }
  seen.delete(value);
  return false;
}

export function isValidScope(value: unknown): value is MemoryScope {
  return isRecord(value)
    && hasExactKeys(value, ["ownerUserId", "tripId", "storyId"])
    && isSafeId(value.ownerUserId)
    && isSafeId(value.tripId)
    && (value.storyId === null || isSafeId(value.storyId));
}

export function isValidFacts(value: unknown): value is MemoryClassificationFacts {
  return isRecord(value)
    && hasExactKeys(value, ["firstChapterAlreadyOpened"])
    && typeof value.firstChapterAlreadyOpened === "boolean";
}

function validPairs(value: unknown, keys: readonly string[]): boolean {
  return Array.isArray(value) && value.every((item) => isRecord(item)
    && hasExactKeys(item, keys)
    && keys.every((key) => typeof item[key] === "string" && (item[key] as string).length > 0));
}

function validStringArray(value: unknown, allowed?: ReadonlySet<string>): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && (!allowed || allowed.has(item)));
}

function isValidPayload(kind: string, value: Record<string, unknown>): boolean {
  if (kind === "trip_start_tomorrow" || kind === "trip_start_today" || kind === "trip_last_day") {
    return hasExactKeys(value, ["attentionSignal", "temporalState"])
      && value.attentionSignal === "trip_lifecycle"
      && value.temporalState === (kind === "trip_start_tomorrow" ? "before" : "active");
  }
  return hasExactKeys(value, ["attentionSignal", "activityCandidate"])
    && value.attentionSignal === (kind === "weather_attention_candidate" ? "weather" : "light")
    && value.activityCandidate === "curated";
}

export function isValidAction(value: unknown): value is MemoryCompanionAction {
  if (!isRecord(value) || !hasExactKeys(value, ACTION_KEYS) || value.outcome !== "action" || !isSafeId(value.actionId)
    || !isRecord(value.decision) || !hasExactKeys(value.decision, DECISION_KEYS)
    || value.decision.outcome !== "act" || !isSafeId(value.decision.id) || !isSafeId(value.decision.ruleId)
    || typeof value.decision.kind !== "string" || !KINDS.has(value.decision.kind)
    || typeof value.decision.category !== "string" || !["trip_lifecycle", "weather_attention", "light_moment"].includes(value.decision.category)
    || typeof value.decision.priority !== "string" || !PRIORITIES.has(value.decision.priority)
    || value.decision.reasonCode !== "actionable" || value.decision.confidence !== "sufficient"
    || !validPairs(value.decision.evidence, ["kind", "state"])
    || !validPairs(value.decision.freshness, ["module", "state"])
    || !validStringArray(value.decision.requiredCapabilities) || !validStringArray(value.decision.sourceModules)
    || !isSafeId(value.decision.dedupeKey) || !isRecord(value.decision.window)
    || !hasExactKeys(value.decision.window, ["validFrom", "validUntil", "effectiveAt", "expiresAt"])
    || ![value.decision.window.validFrom, value.decision.window.validUntil, value.decision.window.effectiveAt, value.decision.window.expiresAt].every(isIso)
    || !isRecord(value.decision.payload) || !isValidPayload(value.decision.kind, value.decision.payload)
    || !CHANNELS.has(value.channel as string)
    || value.policy !== "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS" || value.reason !== "actionable"
    || !isRecord(value.decisionRef) || !hasExactKeys(value.decisionRef, ["id", "kind", "priority", "dedupeKey"])
    || !isSafeId(value.decisionRef.id) || typeof value.decisionRef.kind !== "string"
    || typeof value.decisionRef.priority !== "string" || !PRIORITIES.has(value.decisionRef.priority)
    || !isSafeId(value.decisionRef.dedupeKey) || !validStringArray(value.evaluatedGates, GATES)) return false;
  return value.actionId === value.decision.id
    && value.actionId === value.decisionRef.id
    && value.decision.kind === value.decisionRef.kind
    && value.decision.priority === value.decisionRef.priority
    && value.decision.dedupeKey === value.decisionRef.dedupeKey;
}

export function isValidMessage(value: unknown): value is MemoryEditorialMessage {
  if (!isRecord(value) || !hasExactKeys(value, MESSAGE_KEYS) || value.locale !== "es-CL"
    || value.catalogVersion !== "editorial-v1" || typeof value.variantId !== "string"
    || typeof value.text !== "string" || !isRecord(value.actionRef)
    || !hasExactKeys(value.actionRef, ["actionId", "decisionId", "kind"])
    || !isSafeId(value.actionRef.actionId) || !isSafeId(value.actionRef.decisionId)
    || typeof value.actionRef.kind !== "string" || !CHANNELS.has(value.channel as string)) return false;
  return VARIANTS[value.actionRef.kind]?.[value.variantId] === value.text;
}

export function isValidEvent(value: unknown): value is AuthorizedMemoryEvent {
  return isRecord(value)
    && hasExactKeys(value, ["eventId", "kind", "occurredAt", "targetRef"])
    && isSafeId(value.eventId)
    && (value.kind === "favorite_marked" || value.kind === "chapter_opened")
    && isIso(value.occurredAt)
    && isSafeId(value.targetRef);
}

function exactOptionalRef(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && hasExactKeys(value, keys) && keys.every((key) => isSafeId(value[key]));
}

export function isValidCandidate(value: unknown): value is MemoryCandidate {
  if (containsProhibitedData(value) || hasAccessor(value) || !isRecord(value)
    || !hasExactKeys(value, CANDIDATE_KEYS) || value.outcome !== "candidate" || value.lifecycle !== "candidate"
    || !["trip_started", "trip_last_day", "favorite_marked", "first_chapter_opened"].includes(value.type as string)
    || !["companion_editorial", "authorized_event"].includes(value.origin as string)
    || !isIso(value.occurredAt) || !isValidScope(value.scope)
    || !isRecord(value.meaning) || !hasExactKeys(value.meaning, ["code", "text"])
    || value.meaning.code !== value.type || (value.meaning.text !== null && typeof value.meaning.text !== "string")
    || !isRecord(value.retention) || !hasExactKeys(value.retention, ["reason", "explanation"])
    || !isRecord(value.dedupe) || !hasExactKeys(value.dedupe, ["version", "sourceSlot"])
    || value.dedupe.version !== "memory-key-v1" || !isSafeId(value.dedupe.sourceSlot)
    || !Array.isArray(value.evidence) || value.evidence.length !== 1
    || !exactOptionalRef(value.evidence[0], ["kind", "ref"])) return false;

  if (value.origin === "companion_editorial") {
    if (value.type !== "trip_started" && value.type !== "trip_last_day") return false;
    if (!exactOptionalRef(value.decisionRef, ["id", "kind"])
      || !exactOptionalRef(value.editorialRef, ["catalogVersion", "variantId"])
      || value.editorialRef.catalogVersion !== "editorial-v1"
      || value.evidence[0].kind !== "companion_action"
      || value.evidence[0].ref !== value.decisionRef.id
      || value.dedupe.sourceSlot !== value.decisionRef.id
      || value.retention.reason !== "trip_milestone"
      || value.retention.explanation !== "travel_milestone_worth_recalling") return false;
    const decisionKind = value.decisionRef.kind as string;
    const variantId = value.editorialRef.variantId as string;
    const expectedType = decisionKind === "trip_start_today" ? "trip_started"
      : decisionKind === "trip_last_day" ? "trip_last_day" : null;
    return expectedType === value.type
      && VARIANTS[decisionKind]?.[variantId] === value.meaning.text;
  }

  if (value.decisionRef !== null || value.editorialRef !== null || value.meaning.text !== null) return false;
  if (value.type === "favorite_marked") {
    return value.evidence[0].kind === "favorite_target"
      && value.dedupe.sourceSlot === `favorite:${value.evidence[0].ref}`
      && value.retention.reason === "explicit_affinity"
      && value.retention.explanation === "explicit_preference_worth_recalling";
  }
  return value.type === "first_chapter_opened"
    && value.evidence[0].kind === "chapter_target"
    && value.dedupe.sourceSlot === "first-chapter"
    && value.retention.reason === "first_story_open"
    && value.retention.explanation === "first_story_step_worth_recalling";
}

export function isValidRecord(value: unknown): value is MemoryRecord {
  if (containsProhibitedData(value) || hasAccessor(value) || !isRecord(value)
    || !hasExactKeys(value, RECORD_KEYS) || value.recordKind !== "alaia_memory_record_v1"
    || typeof value.memoryKey !== "string" || !/^mk1_[a-f0-9]{64}$/u.test(value.memoryKey)
    || value.identityVersion !== "memory-key-v1"
    || !["trip_started", "trip_last_day", "favorite_marked", "first_chapter_opened"].includes(value.type as string)
    || !["companion_editorial", "authorized_event"].includes(value.origin as string)
    || !isIso(value.occurredAt) || !isIso(value.createdAt)
    || !exactOptionalRef(value.owner, ["userId"]) || !exactOptionalRef(value.tripRef, ["tripId"])
    || (value.storyRef !== null && !exactOptionalRef(value.storyRef, ["storyId"]))
    || !isRecord(value.meaning) || !hasExactKeys(value.meaning, ["code", "text"])
    || value.meaning.code !== value.type || (value.meaning.text !== null && typeof value.meaning.text !== "string")
    || !isRecord(value.retention) || !hasExactKeys(value.retention, ["reason", "explanation"])
    || !Array.isArray(value.evidence) || value.evidence.length !== 1
    || !exactOptionalRef(value.evidence[0], ["kind", "ref"])
    || !["persisted", "remembered", "archived"].includes(value.state as string)) return false;

  if (value.origin === "companion_editorial") {
    if (value.type !== "trip_started" && value.type !== "trip_last_day") return false;
    if (!exactOptionalRef(value.decisionRef, ["id", "kind"])
      || !exactOptionalRef(value.editorialRef, ["catalogVersion", "variantId"])
      || value.editorialRef.catalogVersion !== "editorial-v1"
      || value.evidence[0].kind !== "companion_action"
      || value.evidence[0].ref !== value.decisionRef.id
      || value.retention.reason !== "trip_milestone"
      || value.retention.explanation !== "travel_milestone_worth_recalling") return false;
    const decisionKind = value.decisionRef.kind as string;
    const expectedType = decisionKind === "trip_start_today" ? "trip_started"
      : decisionKind === "trip_last_day" ? "trip_last_day" : null;
    return expectedType === value.type
      && VARIANTS[decisionKind]?.[value.editorialRef.variantId as string] === value.meaning.text;
  }

  if (value.decisionRef !== null || value.editorialRef !== null || value.meaning.text !== null) return false;
  if (value.type === "favorite_marked") {
    return value.evidence[0].kind === "favorite_target"
      && value.retention.reason === "explicit_affinity"
      && value.retention.explanation === "explicit_preference_worth_recalling";
  }
  return value.type === "first_chapter_opened"
    && value.evidence[0].kind === "chapter_target"
    && value.retention.reason === "first_story_open"
    && value.retention.explanation === "first_story_step_worth_recalling";
}
