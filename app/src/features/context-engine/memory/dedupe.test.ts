import { describe, expect, it } from "vitest";
import type { MemoryCandidate } from "./contracts";
import { createMemoryKey, sha256Utf8 } from "./dedupe";
import { classifyMemory } from "./policy";

const tripCandidate: MemoryCandidate = {
  outcome: "candidate", lifecycle: "candidate", type: "trip_started", origin: "companion_editorial",
  occurredAt: "2026-10-03T15:00:00.000Z",
  scope: { ownerUserId: "user-1", tripId: "trip-1", storyId: "story-1" },
  decisionRef: { id: "decision:trip_start_today:trip-1", kind: "trip_start_today" },
  editorialRef: { catalogVersion: "editorial-v1", variantId: "today-01" },
  evidence: [{ kind: "companion_action", ref: "decision:trip_start_today:trip-1" }],
  meaning: { code: "trip_started", text: "Hoy comienza una nueva historia." },
  retention: { reason: "trip_milestone", explanation: "travel_milestone_worth_recalling" },
  dedupe: { version: "memory-key-v1", sourceSlot: "decision:trip_start_today:trip-1" },
};

describe("Memory identity", () => {
  it("matches the stable UTF-8 SHA-256 v1 fixture", () => {
    expect(createMemoryKey(tripCandidate)).toBe(
      "mk1_d817b3af43ef69e22d51b7b51a46a0a7d30e4cfa184bd2112df4a6c17e8d282a",
    );
    expect(createMemoryKey(tripCandidate)).toBe(createMemoryKey({ ...tripCandidate }));
    expect(sha256Utf8("Alaia-ñ")).toBe("bec93afa7ee9a2155a6c3d5f1ece2d8430c99d2492d9758f753dbd9ebc2da52a");
  });

  it("separates ownership and meaning while keeping identity opaque", () => {
    const otherOwner = { ...tripCandidate, scope: { ...tripCandidate.scope, ownerUserId: "user-2" } };
    const otherMeaning: MemoryCandidate = {
      ...tripCandidate,
      type: "trip_last_day",
      decisionRef: { id: "decision:trip_last_day:trip-1", kind: "trip_last_day" },
      editorialRef: { catalogVersion: "editorial-v1", variantId: "last-day-01" },
      evidence: [{ kind: "companion_action", ref: "decision:trip_last_day:trip-1" }],
      meaning: { code: "trip_last_day", text: "Hoy es el último día de este viaje." },
      dedupe: { version: "memory-key-v1", sourceSlot: "decision:trip_last_day:trip-1" },
    };

    expect(createMemoryKey(otherOwner)).not.toBe(createMemoryKey(tripCandidate));
    expect(createMemoryKey(otherMeaning)).not.toBe(createMemoryKey(tripCandidate));
    expect(createMemoryKey(tripCandidate)).not.toContain("user-1");
  });

  it("dedupes repeated chapter openings into the first-chapter semantic slot", () => {
    const scope = { ownerUserId: "user-1", tripId: "trip-1", storyId: "story-1" };
    const first = classifyMemory(scope, {
      source: "authorized_event",
      event: { eventId: "event-1", kind: "chapter_opened", occurredAt: "2026-10-03T16:00:00.000Z", targetRef: "chapter-1" },
    }, { firstChapterAlreadyOpened: false });
    const retry = classifyMemory(scope, {
      source: "authorized_event",
      event: { eventId: "event-2", kind: "chapter_opened", occurredAt: "2026-10-04T16:00:00.000Z", targetRef: "chapter-2" },
    }, { firstChapterAlreadyOpened: false });

    expect(first.outcome).toBe("candidate");
    expect(retry.outcome).toBe("candidate");
    expect(first.outcome === "candidate" && retry.outcome === "candidate" && createMemoryKey(first))
      .toBe(retry.outcome === "candidate" ? createMemoryKey(retry) : "unreachable");
  });
});
