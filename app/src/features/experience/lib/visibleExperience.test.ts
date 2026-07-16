import { beforeAll, describe, expect, it } from "vitest";
import type { Trip } from "@/features/trips/types";
import {
  composeFirstRealExperience,
  type FirstRealExperienceComposed,
  type FirstRealExperienceInput,
  type FirstRealExperienceResult,
} from "../firstRealExperience";
import {
  observeVisibleExperience,
  toVisibleCompanionExperience,
  type VisibleExperienceEvent,
} from "./visibleExperience";

const NOW = "2026-10-03T15:00:00.000Z";
let composed: FirstRealExperienceComposed;

function trip(): Trip {
  return {
    id: "trip-private",
    title: "Viaje privado",
    destination: {
      countryCode: "AR",
      countryName: "Argentina",
      cityId: "buenos-aires",
      cityName: "Buenos Aires",
      latitude: -34.6037,
      longitude: -58.3816,
      timezone: "America/Argentina/Buenos_Aires",
    },
    baseStoryId: "story-private",
    status: "active",
    role: "owner",
    updatedAt: NOW,
    startDateTime: "2026-10-03",
    endDateTime: "2026-10-06",
  };
}

function input(): FirstRealExperienceInput {
  return {
    logicalInstant: NOW,
    livingContext: { trip: trip() },
    decision: {
      tripId: "trip-private",
      preferences: { enabled: true, beforeTrip: true, duringTrip: true },
      processedKeys: new Set(),
      activities: [],
    },
    companion: { preferences: { enabled: true }, processedKeys: new Set(), history: [] },
    memory: {
      scope: { ownerUserId: "user-private", tripId: "trip-private", storyId: "story-private" },
      facts: { firstChapterAlreadyOpened: false },
    },
  };
}

function project(
  result: FirstRealExperienceResult,
  surface: "active_trip_home" | "other" = "active_trip_home",
  observer?: (event: VisibleExperienceEvent) => void,
) {
  return toVisibleCompanionExperience(result, { surface, observer });
}

beforeAll(async () => {
  const result = await composeFirstRealExperience(input());
  if (result.outcome !== "composed") throw new Error("Expected composed fixture");
  composed = result;
});

describe("toVisibleCompanionExperience", () => {
  it.each(["delivery_pending", "delivery_expired"] as const)("allows the frozen categorical event %s", (kind) => {
    const events: VisibleExperienceEvent[] = [];
    observeVisibleExperience((event) => events.push(event), kind);

    expect(events).toEqual([{ kind }]);
    expect(Object.isFrozen(events[0])).toBe(true);
    expect(Object.keys(events[0])).toEqual(["kind"]);
  });
  it("Approved moment / Literal copy: projects only label and untouched editorial text", () => {
    const events: VisibleExperienceEvent[] = [];
    const viewModel = project(composed, "active_trip_home", (event) => events.push(event));

    expect(viewModel).toEqual({ label: "Alaia", text: "Hoy comienza una nueva historia." });
    expect(Object.keys(viewModel ?? {})).toEqual(["label", "text"]);
    expect(Object.isFrozen(viewModel)).toBe(true);
    expect(events).toEqual([{ kind: "result_layer" }]);
    expect(events.every(Object.isFrozen)).toBe(true);
    expect(JSON.stringify(viewModel)).not.toMatch(/trip-private|user-private|story-private|2026-/);
  });

  it("Wrong surface: rejects the same approved result outside active trip home", () => {
    const approved = project(composed, "active_trip_home");
    const rejected = project(composed, "other");

    expect(approved).toEqual({ label: "Alaia", text: composed.message.text });
    expect(rejected).toBeNull();
  });

  it.each([
    ["Abstention", "decision_abstain"],
    ["Silence", "companion_silence"],
    ["Discard", "memory_discard"],
    ["Error", "error"],
  ] as const)("%s: rejects terminal outcome %s", (_scenario, outcome) => {
    const result = { ...composed, outcome, deliveryIntents: [] } as unknown as FirstRealExperienceResult;

    expect(project(composed)).not.toBeNull();
    expect(project(result)).toBeNull();
  });

  it("Missing intent: rejects composed without an intent", () => {
    const result = { ...composed, deliveryIntents: [] } as unknown as FirstRealExperienceResult;

    expect(project(composed)).not.toBeNull();
    expect(project(result)).toBeNull();
  });

  it.each([
    ["unsupported destination", "destination", "timeline"],
    ["unsupported state", "state", "sent"],
  ] as const)("Unsupported intent: rejects %s", (_scenario, field, value) => {
    const intent = { ...composed.deliveryIntents[0], [field]: value };
    const result = { ...composed, deliveryIntents: [intent] } as unknown as FirstRealExperienceResult;

    expect(project(composed)).not.toBeNull();
    expect(project(result)).toBeNull();
  });

  it("Multiple intents: rejects ambiguity rather than choosing one", () => {
    const result = {
      ...composed,
      deliveryIntents: [composed.deliveryIntents[0], composed.deliveryIntents[0]],
    } as unknown as FirstRealExperienceResult;

    expect(project(composed)).not.toBeNull();
    expect(project(result)).toBeNull();
  });

  it.each([
    ["destination", "push", ["editorial_message", "memory_candidate"]],
    ["reference order", "in_app", ["memory_candidate", "editorial_message"]],
    ["missing reference", "in_app", ["editorial_message"]],
  ] as const)("Mismatch: rejects an intent with mismatched %s", (_scenario, destination, references) => {
    const intent = { ...composed.deliveryIntents[0], destination, references };
    const result = { ...composed, deliveryIntents: [intent] } as unknown as FirstRealExperienceResult;

    expect(project(composed)).not.toBeNull();
    expect(project(result)).toBeNull();
  });

  it("Safe observation: emits only categorical frozen events and ignores hostile observers", () => {
    const hostile = (event: VisibleExperienceEvent) => {
      (event as { kind: string }).kind = "private-value";
      throw new Error("observer failure with private payload");
    };
    const hostileOptions = Object.defineProperty({ surface: "active_trip_home" }, "observer", {
      get: () => { throw new Error("hostile getter"); },
    });

    expect(project(composed, "active_trip_home", hostile)).toEqual({ label: "Alaia", text: composed.message.text });
    expect(toVisibleCompanionExperience(composed, hostileOptions as never)).toEqual({ label: "Alaia", text: composed.message.text });
  });

  it("Fail closed: hostile result getters emit silence without leaking or throwing", () => {
    const events: VisibleExperienceEvent[] = [];
    const hostileResult = Object.defineProperty({}, "outcome", {
      get: () => { throw new Error("kari@example.com trip-private"); },
    });

    expect(project(hostileResult as FirstRealExperienceResult, "active_trip_home", (event) => events.push(event))).toBeNull();
    expect(events).toEqual([{ kind: "silence" }]);
    expect(JSON.stringify(events)).not.toMatch(/kari@|trip-private/);
  });
});
