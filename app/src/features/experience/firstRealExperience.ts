import {
  createLivingContextResolution,
  type LivingContextInput,
  type LivingTravelContext,
} from "@/features/context-engine/livingContext";
import {
  createContextDecisionRun,
  type ActDecision,
  type ContextDecisionRun,
  type DecisionReason,
  type DecisionInput,
} from "@/features/context-engine/decision";
import {
  orchestrateCompanion,
  type CompanionAction,
  type CompanionInput,
  type CompanionSilence,
  type CompanionSilenceReason,
} from "@/features/context-engine/companion";
import {
  createEditorialMessage,
  type EditorialMessage,
} from "@/features/context-engine/editorial";
import {
  classifyMemory,
  type MemoryCandidate,
  type MemoryClassificationFacts,
  type MemoryDiscard,
  type MemoryScope,
  type MemoryType,
  type DiscardReason,
} from "@/features/context-engine/memory";

export type DeliveryDestination = "push" | "in_app" | "timeline" | "memory";
export type FirstRealExperienceErrorCode =
  | "invalid_input"
  | "unsettled_context"
  | "dependency_error"
  | "lineage_error"
  | "unsupported_destination";
export type ExperienceStage =
  | "living_context"
  | "decision_engine"
  | "companion"
  | "editorial_voice"
  | "memory_engine";
export type ExperienceTraceOutcome =
  | "resolved"
  | "selected"
  | "abstained"
  | "action"
  | "rendered"
  | "candidate"
  | "silence"
  | "discard"
  | "error";
export type ExperienceTraceReason =
  | "none"
  | DecisionReason
  | CompanionSilenceReason
  | DiscardReason
  | MemoryType
  | FirstRealExperienceErrorCode;

export type DeliveryIntent = Readonly<{
  destination: DeliveryDestination;
  state: "pending";
  references: readonly ["editorial_message", "memory_candidate"];
}>;

export type ExperienceTraceEvent = Readonly<{
  stage: ExperienceStage;
  outcome: ExperienceTraceOutcome;
  reason: ExperienceTraceReason;
}>;

export type FirstRealExperienceInput = Readonly<{
  logicalInstant: string;
  livingContext: LivingContextInput;
  decision: Omit<DecisionInput, "context">;
  companion: Omit<CompanionInput, "context" | "decisionRun">;
  memory: Readonly<{ scope: MemoryScope; facts: MemoryClassificationFacts }>;
}>;

type TerminalBase = Readonly<{
  deliveryIntents: readonly [];
  trace: readonly ExperienceTraceEvent[];
}>;

export type FirstRealExperienceComposed = Readonly<{
  outcome: "composed";
  livingContext: LivingTravelContext;
  decisionRun: ContextDecisionRun & Readonly<{ selected: ActDecision }>;
  action: CompanionAction;
  message: EditorialMessage;
  memoryCandidate: MemoryCandidate;
  deliveryIntents: readonly [DeliveryIntent];
  trace: readonly ExperienceTraceEvent[];
}>;

export type FirstRealExperienceResult =
  | FirstRealExperienceComposed
  | (TerminalBase & Readonly<{
      outcome: "decision_abstain";
      livingContext: LivingTravelContext;
      decisionRun: ContextDecisionRun;
    }>)
  | (TerminalBase & Readonly<{
      outcome: "companion_silence";
      livingContext: LivingTravelContext;
      decisionRun: ContextDecisionRun;
      silence: CompanionSilence;
    }>)
  | (TerminalBase & Readonly<{
      outcome: "memory_discard";
      livingContext: LivingTravelContext;
      decisionRun: ContextDecisionRun;
      action: CompanionAction;
      message: EditorialMessage;
      memoryDiscard: MemoryDiscard;
    }>)
  | (TerminalBase & Readonly<{
      outcome: "error";
      stage: ExperienceStage;
      errorCode: FirstRealExperienceErrorCode;
    }>);

export type FirstRealExperienceDependencies = Readonly<{
  observer?: (event: ExperienceTraceEvent) => void;
}>;

const DELIVERY_DESTINATIONS = new Set<DeliveryDestination>(["push", "in_app", "timeline", "memory"]);

function deepFreeze<T>(value: T, seen = new Set<object>()): Readonly<T> {
  if (typeof value !== "object" || value === null || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function safeObserver(dependencies: FirstRealExperienceDependencies | undefined) {
  try {
    return typeof dependencies?.observer === "function" ? dependencies.observer : undefined;
  } catch {
    return undefined;
  }
}

function notify(observer: ((event: ExperienceTraceEvent) => void) | undefined, event: ExperienceTraceEvent): void {
  try {
    observer?.(event);
  } catch {
    // Application observability is best-effort and cannot participate in composition.
  }
}

function addTrace(
  trace: ExperienceTraceEvent[],
  observer: ((event: ExperienceTraceEvent) => void) | undefined,
  stage: ExperienceStage,
  outcome: ExperienceTraceOutcome,
  reason: ExperienceTraceReason,
): void {
  const event = Object.freeze({ stage, outcome, reason });
  trace.push(event);
  notify(observer, event);
}

function emptyIntents(): readonly [] {
  return Object.freeze([]);
}

function finish<T extends object>(value: T): Readonly<T> {
  return deepFreeze(value);
}

function errorResult(
  trace: ExperienceTraceEvent[],
  observer: ((event: ExperienceTraceEvent) => void) | undefined,
  stage: ExperienceStage,
  errorCode: FirstRealExperienceErrorCode,
): FirstRealExperienceResult {
  addTrace(trace, observer, stage, "error", errorCode);
  return finish({ outcome: "error" as const, stage, errorCode, deliveryIntents: emptyIntents(), trace });
}

function validInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function hasPendingModule(context: LivingTravelContext): boolean {
  return context.destination.status !== "available"
    || context.temporal.status !== "available"
    || [context.financial, context.weather].some(({ reason }) => reason === "pending" || reason === "weather_pending");
}

function lineageMatchesTrip(input: FirstRealExperienceInput): boolean {
  const trip = input.livingContext.trip;
  return Boolean(trip && typeof trip.id === "string" && trip.id === input.decision.tripId && trip.id === input.memory.scope.tripId);
}

export async function composeFirstRealExperience(
  input: FirstRealExperienceInput,
  dependencies?: FirstRealExperienceDependencies,
): Promise<FirstRealExperienceResult> {
  const observer = safeObserver(dependencies);
  const trace: ExperienceTraceEvent[] = [];
  let instant: Date;

  try {
    if (!input || !validInstant(input.logicalInstant)) {
      return errorResult(trace, observer, "living_context", "invalid_input");
    }
    instant = new Date(input.logicalInstant);
  } catch {
    return errorResult(trace, observer, "living_context", "invalid_input");
  }

  let livingContext: LivingTravelContext;
  try {
    livingContext = await createLivingContextResolution(input.livingContext, {
      now: () => new Date(instant.getTime()),
    }).settled;
  } catch {
    return errorResult(trace, observer, "living_context", "dependency_error");
  }
  if (hasPendingModule(livingContext)) {
    return errorResult(trace, observer, "living_context", "unsettled_context");
  }
  addTrace(trace, observer, "living_context", "resolved", "none");

  try {
    if (!lineageMatchesTrip(input)) {
      return errorResult(trace, observer, "decision_engine", "lineage_error");
    }
  } catch {
    return errorResult(trace, observer, "decision_engine", "invalid_input");
  }

  let decisionRun: ContextDecisionRun;
  try {
    decisionRun = createContextDecisionRun({ ...input.decision, context: livingContext }, {
      now: () => new Date(instant.getTime()),
    });
  } catch {
    return errorResult(trace, observer, "decision_engine", "dependency_error");
  }
  if (!decisionRun.selected) {
    addTrace(trace, observer, "decision_engine", "abstained", decisionRun.decision.reasonCode);
    return finish({
      outcome: "decision_abstain" as const,
      livingContext,
      decisionRun,
      deliveryIntents: emptyIntents(),
      trace,
    });
  }
  addTrace(trace, observer, "decision_engine", "selected", "none");
  const selectedDecisionRun = decisionRun as ContextDecisionRun & Readonly<{ selected: ActDecision }>;

  let companionResult: CompanionAction | CompanionSilence;
  try {
    companionResult = orchestrateCompanion({ ...input.companion, context: livingContext, decisionRun: selectedDecisionRun }, {
      now: () => new Date(instant.getTime()),
    });
  } catch {
    return errorResult(trace, observer, "companion", "dependency_error");
  }
  if (companionResult.outcome === "silence") {
    addTrace(trace, observer, "companion", "silence", companionResult.reason);
    return finish({
      outcome: "companion_silence" as const,
      livingContext,
      decisionRun,
      silence: companionResult,
      deliveryIntents: emptyIntents(),
      trace,
    });
  }
  if (companionResult.decision.id !== selectedDecisionRun.selected.id
    || companionResult.decisionRef.id !== selectedDecisionRun.selected.id
    || companionResult.decision.kind !== selectedDecisionRun.selected.kind
    || companionResult.decision.dedupeKey !== selectedDecisionRun.selected.dedupeKey) {
    return errorResult(trace, observer, "companion", "lineage_error");
  }
  if (!DELIVERY_DESTINATIONS.has(companionResult.channel as DeliveryDestination)) {
    return errorResult(trace, observer, "companion", "unsupported_destination");
  }
  addTrace(trace, observer, "companion", "action", "none");

  let message: EditorialMessage;
  try {
    message = createEditorialMessage(companionResult);
  } catch {
    return errorResult(trace, observer, "editorial_voice", "dependency_error");
  }
  if (message.actionRef.actionId !== companionResult.actionId
    || message.actionRef.decisionId !== companionResult.decision.id
    || message.actionRef.kind !== companionResult.decision.kind
    || message.channel !== companionResult.channel) {
    return errorResult(trace, observer, "editorial_voice", "lineage_error");
  }
  addTrace(trace, observer, "editorial_voice", "rendered", "none");

  let memoryResult: MemoryCandidate | MemoryDiscard;
  try {
    memoryResult = classifyMemory(input.memory.scope, {
      source: "companion_editorial",
      action: companionResult,
      message,
    }, input.memory.facts);
  } catch {
    return errorResult(trace, observer, "memory_engine", "dependency_error");
  }
  if (memoryResult.outcome === "discard") {
    addTrace(trace, observer, "memory_engine", "discard", memoryResult.reason);
    return finish({
      outcome: "memory_discard" as const,
      livingContext,
      decisionRun: selectedDecisionRun,
      action: companionResult,
      message,
      memoryDiscard: memoryResult,
      deliveryIntents: emptyIntents(),
      trace,
    });
  }
  if (memoryResult.decisionRef?.id !== companionResult.decision.id
    || memoryResult.editorialRef?.catalogVersion !== message.catalogVersion
    || memoryResult.editorialRef?.variantId !== message.variantId) {
    return errorResult(trace, observer, "memory_engine", "lineage_error");
  }
  addTrace(trace, observer, "memory_engine", "candidate", memoryResult.type);

  const intent = Object.freeze({
    destination: companionResult.channel as DeliveryDestination,
    state: "pending" as const,
    references: Object.freeze(["editorial_message", "memory_candidate"] as const),
  });
  return finish({
    outcome: "composed" as const,
    livingContext,
    decisionRun: selectedDecisionRun,
    action: companionResult,
    message,
    memoryCandidate: memoryResult,
    deliveryIntents: Object.freeze([intent] as const),
    trace,
  });
}
