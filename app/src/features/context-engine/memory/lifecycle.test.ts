import { describe, expect, it } from "vitest";
import { MemoryEngineError, type MemoryCandidate } from "./contracts";
import {
  acceptMemoryCandidate,
  createPersistedMemoryRecord,
  transitionMemoryRecord,
} from "./lifecycle";

function candidate(): MemoryCandidate {
  return {
    outcome: "candidate", lifecycle: "candidate", type: "favorite_marked", origin: "authorized_event",
    occurredAt: "2026-10-03T15:00:00.000Z",
    scope: { ownerUserId: "user-1", tripId: "trip-1", storyId: null },
    decisionRef: null, editorialRef: null,
    evidence: [{ kind: "favorite_target", ref: "place-1" }],
    meaning: { code: "favorite_marked", text: null },
    retention: { reason: "explicit_affinity", explanation: "explicit_preference_worth_recalling" },
    dedupe: { version: "memory-key-v1", sourceSlot: "favorite:place-1" },
  };
}

function errorCode(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    expect(error).toBeInstanceOf(MemoryEngineError);
    return (error as MemoryEngineError).code;
  }
}

describe("Memory lifecycle", () => {
  it("moves candidate through accepted, persisted and confirmed remembered states", () => {
    const accepted = acceptMemoryCandidate(candidate());
    const persisted = createPersistedMemoryRecord(accepted, "2026-10-03T15:01:00.000Z");
    const remembered = transitionMemoryRecord(persisted, {
      kind: "retrieval_confirmed", retrievedAt: "2026-10-04T12:00:00.000Z",
    });

    expect(accepted).toMatchObject({ outcome: "accepted", lifecycle: "accepted" });
    expect(persisted).toMatchObject({ recordKind: "alaia_memory_record_v1", state: "persisted" });
    expect(Object.keys(persisted)).toEqual([
      "recordKind", "memoryKey", "identityVersion", "type", "origin", "occurredAt", "createdAt",
      "owner", "tripRef", "storyRef", "decisionRef", "editorialRef", "evidence", "meaning", "state", "retention",
    ]);
    expect(remembered).toMatchObject({ state: "remembered", meaning: { code: "favorite_marked" } });
    expect(Object.isFrozen(remembered.evidence)).toBe(true);
    expect(Object.isFrozen(remembered)).toBe(true);
  });

  it("keeps a remembered record remembered when time passes", () => {
    const persisted = createPersistedMemoryRecord(acceptMemoryCandidate(candidate()), "2026-10-03T15:01:00.000Z");
    const remembered = transitionMemoryRecord(persisted, { kind: "retrieval_confirmed", retrievedAt: "2026-10-04T12:00:00.000Z" });
    const later = transitionMemoryRecord(remembered, { kind: "time_elapsed", at: "2030-10-04T12:00:00.000Z" });

    expect(later).toBe(remembered);
    expect(later.state).toBe("remembered");
  });

  it("archives only a remembered record with an exact explicit authorization", () => {
    const persisted = createPersistedMemoryRecord(acceptMemoryCandidate(candidate()), "2026-10-03T15:01:00.000Z");
    const remembered = transitionMemoryRecord(persisted, { kind: "retrieval_confirmed", retrievedAt: "2026-10-04T12:00:00.000Z" });
    const archived = transitionMemoryRecord(remembered, {
      kind: "archive_authorized",
      authorization: { kind: "archive_authorized", authorizedBy: "user-1", authorizedAt: "2026-10-05T12:00:00.000Z" },
    });

    expect(archived.state).toBe("archived");
    expect(Object.keys(archived)).not.toContain("authorization");
  });

  it.each([
    ["archive persisted", () => transitionMemoryRecord(
      createPersistedMemoryRecord(acceptMemoryCandidate(candidate()), "2026-10-03T15:01:00.000Z"),
      { kind: "archive_authorized", authorization: { kind: "archive_authorized", authorizedBy: "user-1", authorizedAt: "2026-10-05T12:00:00.000Z" } },
    )],
    ["remember archived", () => {
      const persisted = createPersistedMemoryRecord(acceptMemoryCandidate(candidate()), "2026-10-03T15:01:00.000Z");
      const remembered = transitionMemoryRecord(persisted, { kind: "retrieval_confirmed", retrievedAt: "2026-10-04T12:00:00.000Z" });
      const archived = transitionMemoryRecord(remembered, { kind: "archive_authorized", authorization: { kind: "archive_authorized", authorizedBy: "user-1", authorizedAt: "2026-10-05T12:00:00.000Z" } });
      return transitionMemoryRecord(archived, { kind: "retrieval_confirmed", retrievedAt: "2026-10-06T12:00:00.000Z" });
    }],
  ] as const)("rejects illegal transition: %s", (_name, run) => {
    expect(errorCode(run)).toBe("INVALID_LIFECYCLE_TRANSITION");
  });

  it("rejects malformed candidate contracts instead of retaining extra or contradictory data", () => {
    const extra = { ...candidate(), unexpected: "PRIVATE_MARKER" } as unknown as MemoryCandidate;
    const contradictory = { ...candidate(), meaning: { code: "trip_started", text: null } } as unknown as MemoryCandidate;

    expect(errorCode(() => acceptMemoryCandidate(extra))).toBe("SCHEMA_REJECTED");
    expect(errorCode(() => acceptMemoryCandidate(contradictory))).toBe("SCHEMA_REJECTED");
  });

  it("rejects malformed persisted records before any lifecycle operation", () => {
    const persisted = createPersistedMemoryRecord(acceptMemoryCandidate(candidate()), "2026-10-03T15:01:00.000Z");
    const malformed = { ...persisted, accessToken: "PRIVATE_MARKER" } as unknown as typeof persisted;

    expect(errorCode(() => transitionMemoryRecord(malformed, { kind: "time_elapsed", at: "2030-10-04T12:00:00.000Z" })))
      .toBe("SCHEMA_REJECTED");
  });
});
