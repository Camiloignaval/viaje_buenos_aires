import type { Trip } from "@/features/trips/types";
import {
  composeFirstRealExperience,
  type ExperienceTraceEvent,
  type FirstRealExperienceDependencies,
  type FirstRealExperienceInput,
  type FirstRealExperienceResult,
} from "@/features/experience/firstRealExperience";

const LOGICAL_INSTANT = "2026-10-03T15:00:00.000Z";

export const FIRST_REAL_EXPERIENCE_TRANSITION_SNAPSHOT = Object.freeze([
  Object.freeze({ stage: "living_context", outcome: "resolved", reason: "none" }),
  Object.freeze({ stage: "decision_engine", outcome: "selected", reason: "none" }),
  Object.freeze({ stage: "companion", outcome: "action", reason: "none" }),
  Object.freeze({ stage: "editorial_voice", outcome: "rendered", reason: "none" }),
  Object.freeze({ stage: "memory_engine", outcome: "candidate", reason: "trip_started" }),
] as const satisfies readonly ExperienceTraceEvent[]);

export type FirstRealExperienceSimulation = Readonly<{
  result: FirstRealExperienceResult;
  transitions: typeof FIRST_REAL_EXPERIENCE_TRANSITION_SNAPSHOT;
}>;

function canonicalTrip(): Trip {
  return {
    id: "trip-1",
    title: "Viaje canónico",
    destination: {
      countryCode: "AR",
      countryName: "Argentina",
      cityId: "buenos-aires",
      cityName: "Buenos Aires",
      latitude: -34.6037,
      longitude: -58.3816,
      timezone: "America/Argentina/Buenos_Aires",
    },
    baseStoryId: "story-1",
    status: "active",
    role: "owner",
    updatedAt: LOGICAL_INSTANT,
    startDateTime: "2026-10-03",
    endDateTime: "2026-10-06",
  };
}

function canonicalInput(): FirstRealExperienceInput {
  return {
    logicalInstant: LOGICAL_INSTANT,
    livingContext: { trip: canonicalTrip() },
    decision: {
      tripId: "trip-1",
      preferences: { enabled: true, beforeTrip: true, duringTrip: true },
      processedKeys: new Set<string>(),
      activities: [],
    },
    companion: {
      preferences: { enabled: true },
      processedKeys: new Set<string>(),
      history: [],
    },
    memory: {
      scope: { ownerUserId: "user-1", tripId: "trip-1", storyId: "story-1" },
      facts: { firstChapterAlreadyOpened: false },
    },
  };
}

export async function simulateFirstRealExperience(
  dependencies?: FirstRealExperienceDependencies,
): Promise<FirstRealExperienceSimulation> {
  const result = await composeFirstRealExperience(canonicalInput(), dependencies);
  return Object.freeze({ result, transitions: FIRST_REAL_EXPERIENCE_TRANSITION_SNAPSHOT });
}
