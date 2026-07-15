export const MEMORY_RECORD_KIND = "alaia_memory_record_v1" as const;
export const MEMORY_IDENTITY_VERSION = "memory-key-v1" as const;

export type MemoryType = "trip_started" | "trip_last_day" | "favorite_marked" | "first_chapter_opened";
export type MemoryOrigin = "companion_editorial" | "authorized_event";
export type RetentionReason = "trip_milestone" | "explicit_affinity" | "first_story_open";
export type DiscardReason =
  | "invalid_input"
  | "lineage_mismatch"
  | "unsupported_kind"
  | "transient_context"
  | "not_first"
  | "duplicate"
  | "privacy_rejected";
export type MemoryEngineErrorCode =
  | "OWNERSHIP_DENIED"
  | "SCHEMA_REJECTED"
  | "REPOSITORY_FAILURE"
  | "INVALID_LIFECYCLE_TRANSITION";

export type MemoryScope = Readonly<{ ownerUserId: string; tripId: string; storyId: string | null }>;
export type AuthorizedMemoryEvent = Readonly<{
  eventId: string;
  kind: "favorite_marked" | "chapter_opened";
  occurredAt: string;
  targetRef: string;
}>;
export type MemoryClassificationFacts = Readonly<{ firstChapterAlreadyOpened: boolean }>;

export type MemoryCompanionAction = Readonly<{
  outcome: "action";
  actionId: string;
  decision: Readonly<{
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
    window: Readonly<{ validFrom: string; validUntil: string; effectiveAt: string; expiresAt: string }>;
    payload: Readonly<object>;
  }>;
  channel: string;
  policy: "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS";
  reason: "actionable";
  decisionRef: Readonly<{ id: string; kind: string; priority: string; dedupeKey: string }>;
  evaluatedGates: readonly string[];
}>;

export type MemoryEditorialMessage = Readonly<{
  locale: "es-CL";
  catalogVersion: "editorial-v1";
  variantId: string;
  text: string;
  actionRef: Readonly<{ actionId: string; decisionId: string; kind: string }>;
  channel: string;
}>;

export type MemoryInput =
  | Readonly<{ source: "companion_editorial"; action: MemoryCompanionAction; message: MemoryEditorialMessage }>
  | Readonly<{ source: "authorized_event"; event: AuthorizedMemoryEvent }>;

export type MemoryDecisionRef = Readonly<{ id: string; kind: string }>;
export type MemoryEditorialRef = Readonly<{ catalogVersion: string; variantId: string }>;
export type MemoryEvidence = Readonly<{ kind: "companion_action" | "favorite_target" | "chapter_target"; ref: string }>;
export type MemoryMeaning = Readonly<{ code: MemoryType; text: string | null }>;
export type MemoryRetention = Readonly<{
  reason: RetentionReason;
  explanation:
    | "travel_milestone_worth_recalling"
    | "explicit_preference_worth_recalling"
    | "first_story_step_worth_recalling";
}>;

export type MemoryCandidate = Readonly<{
  outcome: "candidate";
  lifecycle: "candidate";
  type: MemoryType;
  origin: MemoryOrigin;
  occurredAt: string;
  scope: MemoryScope;
  decisionRef: MemoryDecisionRef | null;
  editorialRef: MemoryEditorialRef | null;
  evidence: readonly MemoryEvidence[];
  meaning: MemoryMeaning;
  retention: MemoryRetention;
  dedupe: Readonly<{ version: "memory-key-v1"; sourceSlot: string }>;
}>;

export type MemoryAccepted = Readonly<Omit<MemoryCandidate, "outcome" | "lifecycle"> & {
  outcome: "accepted";
  lifecycle: "accepted";
}>;

export type MemoryRecordState = "persisted" | "remembered" | "archived";
export type MemoryRecord = Readonly<{
  recordKind: "alaia_memory_record_v1";
  memoryKey: string;
  identityVersion: "memory-key-v1";
  type: MemoryType;
  origin: MemoryOrigin;
  occurredAt: string;
  createdAt: string;
  owner: Readonly<{ userId: string }>;
  tripRef: Readonly<{ tripId: string }>;
  storyRef: Readonly<{ storyId: string }> | null;
  decisionRef: MemoryDecisionRef | null;
  editorialRef: MemoryEditorialRef | null;
  evidence: readonly MemoryEvidence[];
  meaning: MemoryMeaning;
  state: MemoryRecordState;
  retention: MemoryRetention;
}>;

export type MemoryDiscard = Readonly<{ outcome: "discard"; reason: DiscardReason; type: MemoryType | null }>;
export type MemoryClassification = MemoryCandidate | MemoryDiscard;
export type MemoryArchiveAuthorization = Readonly<{
  kind: "archive_authorized";
  authorizedBy: string;
  authorizedAt: string;
}>;

export class MemoryEngineError extends Error {
  readonly name = "MemoryEngineError";

  constructor(readonly code: MemoryEngineErrorCode) {
    super(code);
  }
}

export function createMemoryDiscard(reason: DiscardReason, type: MemoryType | null = null): MemoryDiscard {
  return Object.freeze({ outcome: "discard", reason, type });
}
