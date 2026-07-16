import {
  MEMORY_IDENTITY_VERSION,
  createMemoryDiscard,
  type MemoryClassification,
  type MemoryClassificationFacts,
  type MemoryCompanionAction,
  type MemoryEditorialMessage,
  type MemoryInput,
  type MemoryScope,
  type MemoryType,
} from "./contracts";
import {
  containsProhibitedData,
  hasAccessor,
  hasExactKeys,
  isRecord,
  isIso,
  isSafeId,
  isValidAction,
  isValidEvent,
  isValidFacts,
  isValidMessage,
  isValidScope,
} from "./validation";
import { observeMemoryOperation, type MemoryObserverDependencies } from "./observer";

export type { MemoryCompanionAction, MemoryEditorialMessage } from "./contracts";

function freezeCandidate<T extends object>(value: T): Readonly<T> {
  for (const item of Object.values(value)) {
    if (typeof item === "object" && item !== null && !Object.isFrozen(item)) freezeCandidate(item);
  }
  return Object.freeze(value);
}

function pairCandidate(scope: MemoryScope, action: MemoryCompanionAction, message: MemoryEditorialMessage): MemoryClassification {
  const type = action.decision.kind === "trip_start_today" ? "trip_started"
    : action.decision.kind === "trip_last_day" ? "trip_last_day" : null;
  if (!type) {
    return createMemoryDiscard(action.decision.kind === "weather_attention_candidate" || action.decision.kind === "light_moment_candidate"
      ? "transient_context" : "unsupported_kind");
  }
  return freezeCandidate({
    outcome: "candidate" as const,
    lifecycle: "candidate" as const,
    type,
    origin: "companion_editorial" as const,
    occurredAt: action.decision.window.effectiveAt,
    scope: { ownerUserId: scope.ownerUserId, tripId: scope.tripId, storyId: scope.storyId },
    decisionRef: { id: action.decision.id, kind: action.decision.kind },
    editorialRef: { catalogVersion: message.catalogVersion, variantId: message.variantId },
    evidence: [{ kind: "companion_action" as const, ref: action.actionId }],
    meaning: { code: type, text: message.text },
    retention: { reason: "trip_milestone" as const, explanation: "travel_milestone_worth_recalling" as const },
    dedupe: { version: MEMORY_IDENTITY_VERSION, sourceSlot: action.decision.id },
  });
}

function classifyMemoryCore(
  scope: MemoryScope,
  input: MemoryInput,
  facts: MemoryClassificationFacts,
): MemoryClassification {
  if (containsProhibitedData(scope) || containsProhibitedData(input) || containsProhibitedData(facts)) {
    return createMemoryDiscard("privacy_rejected");
  }
  if (hasAccessor(scope) || hasAccessor(input) || hasAccessor(facts)
    || !isValidScope(scope) || !isValidFacts(facts) || !isRecord(input)) return createMemoryDiscard("invalid_input");

  if (input.source === "companion_editorial") {
    if (!hasExactKeys(input, ["source", "action", "message"]) || !isValidAction(input.action) || !isValidMessage(input.message)) {
      return createMemoryDiscard("invalid_input");
    }
    if (input.action.actionId !== input.message.actionRef.actionId
      || input.action.decision.id !== input.message.actionRef.decisionId
      || input.action.decision.kind !== input.message.actionRef.kind
      || input.action.channel !== input.message.channel) return createMemoryDiscard("lineage_mismatch");
    return pairCandidate(scope, input.action, input.message);
  }

  if (input.source !== "authorized_event" || !hasExactKeys(input, ["source", "event"])) {
    return createMemoryDiscard("invalid_input");
  }
  if (isRecord(input.event) && hasExactKeys(input.event, ["eventId", "kind", "occurredAt", "targetRef"])
    && isSafeId(input.event.eventId) && typeof input.event.kind === "string"
    && isIso(input.event.occurredAt) && isSafeId(input.event.targetRef)
    && input.event.kind !== "favorite_marked" && input.event.kind !== "chapter_opened") {
    return createMemoryDiscard("unsupported_kind");
  }
  if (!isValidEvent(input.event)) return createMemoryDiscard("invalid_input");
  const type: MemoryType = input.event.kind === "favorite_marked" ? "favorite_marked" : "first_chapter_opened";
  if (type === "first_chapter_opened" && facts.firstChapterAlreadyOpened) return createMemoryDiscard("not_first", type);
  const favorite = type === "favorite_marked";
  return freezeCandidate({
    outcome: "candidate" as const,
    lifecycle: "candidate" as const,
    type,
    origin: "authorized_event" as const,
    occurredAt: input.event.occurredAt,
    scope: { ownerUserId: scope.ownerUserId, tripId: scope.tripId, storyId: scope.storyId },
    decisionRef: null,
    editorialRef: null,
    evidence: [{ kind: favorite ? "favorite_target" as const : "chapter_target" as const, ref: input.event.targetRef }],
    meaning: { code: type, text: null },
    retention: favorite
      ? { reason: "explicit_affinity" as const, explanation: "explicit_preference_worth_recalling" as const }
      : { reason: "first_story_open" as const, explanation: "first_story_step_worth_recalling" as const },
    dedupe: { version: MEMORY_IDENTITY_VERSION, sourceSlot: favorite ? `favorite:${input.event.targetRef}` : "first-chapter" },
  });
}

export function classifyMemory(
  scope: MemoryScope,
  input: MemoryInput,
  facts: MemoryClassificationFacts,
  dependencies?: MemoryObserverDependencies,
): MemoryClassification {
  return observeMemoryOperation(() => classifyMemoryCore(scope, input, facts), dependencies);
}
