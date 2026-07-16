import { describe, expect, it } from "vitest";
import { adaptStoryActivity } from "./adaptiveJourney";

function activity(overrides: Record<string, unknown> = {}) {
  return {
    id: "act-curated-1",
    title: "Texto privado que no debe cruzar",
    description: "Otro texto privado",
    intelligence: {
      outdoor: true,
      indoor: false,
      rainFriendly: false,
      photoMoment: true,
    },
    contextWindow: {
      validFrom: "2026-10-03T14:00:00.000Z",
      validUntil: "2026-10-03T16:00:00.000Z",
      timezone: "America/Argentina/Buenos_Aires",
    },
    ...overrides,
  };
}

describe("adaptStoryActivity", () => {
  it("copia solamente evidencia estructurada y autoriza la superficie cerrada", () => {
    const result = adaptStoryActivity(activity());

    expect(result).toEqual({
      candidate: {
        activityId: "act-curated-1",
        intelligence: { outdoor: true, indoor: false, rainFriendly: false, photoMoment: true },
        window: {
          validFrom: "2026-10-03T14:00:00.000Z",
          validUntil: "2026-10-03T16:00:00.000Z",
          timezone: "America/Argentina/Buenos_Aires",
        },
      },
      authorization: {
        surface: "active_story_chapter",
        destination: "in_app",
        references: ["editorial_message"],
        kinds: ["weather_attention_candidate", "light_moment_candidate"],
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/Texto privado|Otro texto privado|title|description/);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.candidate.intelligence)).toBe(true);
  });

  it.each([
    ["missing metadata", activity({ intelligence: undefined })],
    ["legacy timeWindow", activity({ contextWindow: undefined, timeWindow: "14:00" })],
    ["partial intelligence", activity({ intelligence: { outdoor: true, indoor: false, rainFriendly: false } })],
    ["unknown intelligence", activity({ intelligence: { outdoor: true, indoor: false, rainFriendly: false, photoMoment: true, copy: "private" } })],
    ["contradictory intelligence", activity({ intelligence: { outdoor: true, indoor: true, rainFriendly: false, photoMoment: true } })],
    ["invalid window", activity({ contextWindow: { validFrom: "2026-10-03T16:00:00.000Z", validUntil: "2026-10-03T14:00:00.000Z", timezone: "America/Argentina/Buenos_Aires" } })],
  ])("fails closed for %s", (_case, value) => {
    expect(adaptStoryActivity(value)).toBeNull();
  });

  it("does not leak hostile accessors", () => {
    const hostile = Object.defineProperty({}, "intelligence", {
      enumerable: true,
      get: () => { throw new Error("private payload"); },
    });

    expect(adaptStoryActivity(hostile)).toBeNull();
  });
});
