import { describe, expect, it, vi } from "vitest";
import {
  MemoryEngineError,
  type MemoryCandidate,
  type MemoryScope,
} from "./contracts";
import {
  observeMemoryOperation,
  observeMemoryOperationAsync,
  type MemoryObservation,
} from "./observer";
import { classifyMemory } from "./policy";
import { acceptMemoryCandidate, createPersistedMemoryRecord } from "./lifecycle";

const scope: MemoryScope = { ownerUserId: "user-1", tripId: "trip-1", storyId: "story-1" };

function favoriteCandidate(): MemoryCandidate {
  const result = classifyMemory(scope, {
    source: "authorized_event",
    event: {
      eventId: "event-favorite-1",
      kind: "favorite_marked",
      occurredAt: "2026-10-03T15:00:00.000Z",
      targetRef: "place-1",
    },
  }, { firstChapterAlreadyOpened: false });
  if (result.outcome !== "candidate") throw new Error("fixture must be candidate");
  return result;
}

describe("Memory observer", () => {
  it("emits only exact categorical fields for candidate and discard outcomes", () => {
    const observations: MemoryObservation[] = [];
    const candidate = classifyMemory(scope, {
      source: "authorized_event",
      event: {
        eventId: "PRIVATE_EVENT_ID",
        kind: "favorite_marked",
        occurredAt: "2026-10-03T15:00:00.000Z",
        targetRef: "PRIVATE_TARGET_ID",
      },
    }, { firstChapterAlreadyOpened: false }, { observer: (value) => observations.push(value) });
    const discard = classifyMemory(scope, { source: "invalid" } as never, { firstChapterAlreadyOpened: false }, {
      observer: (value) => observations.push(value),
    });

    expect(candidate).toMatchObject({ outcome: "candidate", type: "favorite_marked" });
    expect(discard).toEqual({ outcome: "discard", reason: "invalid_input", type: null });
    expect(observations).toEqual([
      {
        outcome: "candidate", discardReason: "none", errorCode: "none", category: "favorite_marked",
        lifecycle: "candidate", catalogVersion: "none", identityVersion: "memory-key-v1", durationMs: 0,
      },
      {
        outcome: "discard", discardReason: "invalid_input", errorCode: "none", category: "none",
        lifecycle: "none", catalogVersion: "none", identityVersion: "none", durationMs: 0,
      },
    ]);
    expect(JSON.stringify(observations)).not.toMatch(/PRIVATE_|eventId|targetRef|owner|trip|story|evidence|payload|text/i);
  });

  it("reports prohibited data only as privacy_rejected without retaining it", () => {
    const observer = vi.fn<(value: MemoryObservation) => void>();
    const result = classifyMemory(scope, {
      source: "authorized_event",
      event: {
        eventId: "event-1", kind: "favorite_marked", occurredAt: "2026-10-03T15:00:00.000Z", targetRef: "place-1",
      },
      accessToken: "PRIVATE_TOKEN",
    } as never, { firstChapterAlreadyOpened: false }, { observer });

    expect(result).toEqual({ outcome: "discard", reason: "privacy_rejected", type: null });
    expect(observer).toHaveBeenCalledWith({
      outcome: "discard", discardReason: "privacy_rejected", errorCode: "none", category: "none",
      lifecycle: "none", catalogVersion: "none", identityVersion: "none", durationMs: 0,
    });
    expect(JSON.stringify(observer.mock.calls)).not.toContain("PRIVATE_TOKEN");
  });

  it("preserves results when observer callback, dependency getter or timing fail", () => {
    const expected = favoriteCandidate();
    const callbackFailure = observeMemoryOperation(() => expected, {
      observer: () => { throw new Error("observer failed"); },
      timingNow: () => { throw new Error("clock failed"); },
    });
    const dependencies = Object.defineProperty({}, "observer", {
      get: () => { throw new Error("observer getter failed"); },
    });
    const getterFailure = observeMemoryOperation(() => expected, dependencies);

    expect(callbackFailure).toBe(expected);
    expect(getterFailure).toBe(expected);
  });

  it("clamps finite durations to the closed 0..60000 range", () => {
    const observations: MemoryObservation[] = [];
    const values = [100, 70_101, 500, 400];
    const timingNow = () => values.shift() ?? Number.POSITIVE_INFINITY;

    observeMemoryOperation(() => favoriteCandidate(), { observer: (value) => observations.push(value), timingNow });
    observeMemoryOperation(() => favoriteCandidate(), { observer: (value) => observations.push(value), timingNow });

    expect(observations.map(({ durationMs }) => durationMs)).toEqual([60_000, 0]);
  });

  it("reports catalog/identity/lifecycle categories without references or copy", () => {
    const candidate: MemoryCandidate = {
      outcome: "candidate", lifecycle: "candidate", type: "trip_started", origin: "companion_editorial",
      occurredAt: "2026-10-03T15:00:00.000Z", scope,
      decisionRef: { id: "PRIVATE_DECISION", kind: "trip_start_today" },
      editorialRef: { catalogVersion: "editorial-v1", variantId: "today-01" },
      evidence: [{ kind: "companion_action", ref: "PRIVATE_ACTION" }],
      meaning: { code: "trip_started", text: "PRIVATE_EDITORIAL_TEXT" },
      retention: { reason: "trip_milestone", explanation: "travel_milestone_worth_recalling" },
      dedupe: { version: "memory-key-v1", sourceSlot: "PRIVATE_DECISION" },
    };
    const observations: MemoryObservation[] = [];

    observeMemoryOperation(() => candidate, { observer: (value) => observations.push(value) });
    const record = createPersistedMemoryRecord(acceptMemoryCandidate(favoriteCandidate()), "2026-10-03T15:01:00.000Z");
    observeMemoryOperation(() => record, { observer: (value) => observations.push(value) });

    expect(observations).toEqual([
      {
        outcome: "candidate", discardReason: "none", errorCode: "none", category: "trip_started",
        lifecycle: "candidate", catalogVersion: "editorial-v1", identityVersion: "memory-key-v1", durationMs: 0,
      },
      {
        outcome: "record", discardReason: "none", errorCode: "none", category: "favorite_marked",
        lifecycle: "persisted", catalogVersion: "none", identityVersion: "memory-key-v1", durationMs: 0,
      },
    ]);
    expect(JSON.stringify(observations)).not.toMatch(/PRIVATE_|decisionRef|editorialRef|variantId|meaning/i);
  });

  it("preserves the original typed repository error when observation fails", async () => {
    const original = new MemoryEngineError("REPOSITORY_FAILURE");
    const observations: MemoryObservation[] = [];

    await expect(observeMemoryOperationAsync(async () => { throw original; }, {
      observer: (value) => {
        observations.push(value);
        throw new Error("observer failure");
      },
    })).rejects.toBe(original);
    expect(observations).toEqual([{
      outcome: "error", discardReason: "none", errorCode: "REPOSITORY_FAILURE", category: "none",
      lifecycle: "none", catalogVersion: "none", identityVersion: "none", durationMs: 0,
    }]);
    expect(JSON.stringify(observations)).not.toMatch(/stack|raw|repository failure|payload/i);
  });
});
