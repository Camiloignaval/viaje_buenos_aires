import {
  MEMORY_IDENTITY_VERSION,
  MEMORY_RECORD_KIND,
  MemoryEngineError,
  type MemoryAccepted,
  type MemoryArchiveAuthorization,
  type MemoryCandidate,
  type MemoryRecord,
} from "./contracts";
import { createMemoryKey } from "./dedupe";
import { hasExactKeys, isIso, isRecord, isSafeId, isValidCandidate, isValidRecord } from "./validation";

export type MemoryLifecycleEvent =
  | Readonly<{ kind: "retrieval_confirmed"; retrievedAt: string }>
  | Readonly<{ kind: "archive_authorized"; authorization: MemoryArchiveAuthorization }>
  | Readonly<{ kind: "time_elapsed"; at: string }>;

function freeze<T extends object>(value: T): Readonly<T> {
  for (const item of Object.values(value)) {
    if (typeof item === "object" && item !== null && !Object.isFrozen(item)) freeze(item);
  }
  return Object.freeze(value);
}

function cloneCandidate(candidate: MemoryCandidate): Omit<MemoryCandidate, "outcome" | "lifecycle"> {
  return {
    type: candidate.type,
    origin: candidate.origin,
    occurredAt: candidate.occurredAt,
    scope: { ...candidate.scope },
    decisionRef: candidate.decisionRef ? { ...candidate.decisionRef } : null,
    editorialRef: candidate.editorialRef ? { ...candidate.editorialRef } : null,
    evidence: candidate.evidence.map((item) => ({ ...item })),
    meaning: { ...candidate.meaning },
    retention: { ...candidate.retention },
    dedupe: { ...candidate.dedupe },
  };
}

export function acceptMemoryCandidate(candidate: MemoryCandidate): MemoryAccepted {
  if (!isRecord(candidate) || candidate.outcome !== "candidate" || candidate.lifecycle !== "candidate") {
    throw new MemoryEngineError("INVALID_LIFECYCLE_TRANSITION");
  }
  if (!isValidCandidate(candidate)) throw new MemoryEngineError("SCHEMA_REJECTED");
  return freeze({ outcome: "accepted" as const, lifecycle: "accepted" as const, ...cloneCandidate(candidate) });
}

export function createPersistedMemoryRecord(accepted: MemoryAccepted, createdAt: string): MemoryRecord {
  if (!isRecord(accepted) || accepted.outcome !== "accepted" || accepted.lifecycle !== "accepted" || !isIso(createdAt)) {
    throw new MemoryEngineError("INVALID_LIFECYCLE_TRANSITION");
  }
  const candidate = { ...accepted, outcome: "candidate" as const, lifecycle: "candidate" as const };
  if (!isValidCandidate(candidate)) throw new MemoryEngineError("SCHEMA_REJECTED");
  const memoryKey = createMemoryKey(candidate);
  return freeze({
    recordKind: MEMORY_RECORD_KIND,
    memoryKey,
    identityVersion: MEMORY_IDENTITY_VERSION,
    type: accepted.type,
    origin: accepted.origin,
    occurredAt: accepted.occurredAt,
    createdAt,
    owner: { userId: accepted.scope.ownerUserId },
    tripRef: { tripId: accepted.scope.tripId },
    storyRef: accepted.scope.storyId ? { storyId: accepted.scope.storyId } : null,
    decisionRef: accepted.decisionRef ? { ...accepted.decisionRef } : null,
    editorialRef: accepted.editorialRef ? { ...accepted.editorialRef } : null,
    evidence: accepted.evidence.map((item) => ({ ...item })),
    meaning: { ...accepted.meaning },
    state: "persisted" as const,
    retention: { ...accepted.retention },
  });
}

function cloneRecord(record: MemoryRecord, state: MemoryRecord["state"]): MemoryRecord {
  return freeze({
    ...record,
    owner: { ...record.owner }, tripRef: { ...record.tripRef },
    storyRef: record.storyRef ? { ...record.storyRef } : null,
    decisionRef: record.decisionRef ? { ...record.decisionRef } : null,
    editorialRef: record.editorialRef ? { ...record.editorialRef } : null,
    evidence: record.evidence.map((item) => ({ ...item })), meaning: { ...record.meaning },
    retention: { ...record.retention }, state,
  });
}

function validAuthorization(value: unknown): value is MemoryArchiveAuthorization {
  return isRecord(value)
    && hasExactKeys(value, ["kind", "authorizedBy", "authorizedAt"])
    && value.kind === "archive_authorized"
    && isSafeId(value.authorizedBy)
    && isIso(value.authorizedAt);
}

export function transitionMemoryRecord(record: MemoryRecord, event: MemoryLifecycleEvent): MemoryRecord {
  if (!isValidRecord(record)) throw new MemoryEngineError("SCHEMA_REJECTED");
  if (!isRecord(event)) {
    throw new MemoryEngineError("INVALID_LIFECYCLE_TRANSITION");
  }
  if (event.kind === "time_elapsed" && hasExactKeys(event, ["kind", "at"]) && isIso(event.at)) return record;
  if (event.kind === "retrieval_confirmed" && hasExactKeys(event, ["kind", "retrievedAt"])
    && isIso(event.retrievedAt) && record.state === "persisted") return cloneRecord(record, "remembered");
  if (event.kind === "archive_authorized" && hasExactKeys(event, ["kind", "authorization"])
    && validAuthorization(event.authorization) && record.state === "remembered"
    && event.authorization.authorizedBy === record.owner.userId) return cloneRecord(record, "archived");
  throw new MemoryEngineError("INVALID_LIFECYCLE_TRANSITION");
}
