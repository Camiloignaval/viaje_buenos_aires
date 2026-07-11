import { tripTemporalState, type TripTemporalState } from "./countdown";
import type { Trip } from "../types";

export type TripLifecycle =
  | "upcoming"
  | "starting-today"
  | "in-progress"
  | "finished"
  | "legacy-active"
  | "archived";

export type InitialAlaiaDestination =
  | {
      kind: "general-home";
      route: "/trips";
      reason: "no-trips" | "no-active-trip";
    }
  | {
      kind: "active-trip-home";
      route: "/trips";
      trip: Trip;
      lifecycle: Exclude<TripLifecycle, "finished" | "archived">;
      temporalState: TripTemporalState | null;
    };

export function resolveTripLifecycle(trip: Trip, now: Date): {
  lifecycle: TripLifecycle;
  temporalState: TripTemporalState | null;
} {
  if (trip.status !== "active") {
    return { lifecycle: "archived", temporalState: null };
  }

  if (!trip.startDateTime || !trip.endDateTime || typeof trip.destination !== "object") {
    return { lifecycle: "legacy-active", temporalState: null };
  }

  const temporalState = tripTemporalState(
    now,
    trip.startDateTime,
    trip.endDateTime,
    trip.destination.timezone,
  );

  switch (temporalState.kind) {
    case "past":
      return { lifecycle: "finished", temporalState };
    case "today":
      return { lifecycle: "starting-today", temporalState };
    case "in-progress":
      return { lifecycle: "in-progress", temporalState };
    case "tomorrow":
    case "upcoming":
      return { lifecycle: "upcoming", temporalState };
  }
}

export function resolveInitialAlaiaDestination(
  trips: Trip[],
  now = new Date(),
): InitialAlaiaDestination {
  if (trips.length === 0) {
    return { kind: "general-home", route: "/trips", reason: "no-trips" };
  }

  for (const trip of trips) {
    const { lifecycle, temporalState } = resolveTripLifecycle(trip, now);
    if (lifecycle === "archived" || lifecycle === "finished") continue;

    return {
      kind: "active-trip-home",
      route: "/trips",
      trip,
      lifecycle,
      temporalState,
    };
  }

  return { kind: "general-home", route: "/trips", reason: "no-active-trip" };
}
