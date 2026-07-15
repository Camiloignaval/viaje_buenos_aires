import { safeTripTemporalState } from "@/features/trips/lib/countdown";
import type { Trip } from "@/features/trips/types";

export type PersonalMessageKind =
  | "empty"
  | "before-trip"
  | "during-trip"
  | "last-day"
  | "after-trip"
  | "distant-memory";

const MESSAGES: Record<PersonalMessageKind, string> = {
  empty: "Toda historia empieza con una primera decisión. Cuando llegue el momento, este será un lugar al que volver.",
  "before-trip": "La próxima historia ya tiene un lugar en el horizonte. Alaia estará cerca cuando sea momento de empezar.",
  "during-trip": "La historia está ocurriendo ahora. Que el día encuentre su propio ritmo.",
  "last-day": "Todavía queda historia por vivir. Dejen que este último día conserve su propio ritmo.",
  "after-trip": "El viaje acaba de volver con ustedes. Lo vivido va encontrando su lugar, sin apuro.",
  "distant-memory": "Algunas historias siguen haciendo compañía mucho después. Esta ya forma parte de ustedes.",
};

function kindForTrip(trip: Trip, now: Date): PersonalMessageKind | null {
  if (trip.status !== "active") return null;
  if (!trip.startDateTime || !trip.endDateTime || typeof trip.destination !== "object") return "before-trip";

  const state = safeTripTemporalState(now, trip.startDateTime, trip.endDateTime, trip.destination.timezone);
  if (!state) return "before-trip";

  switch (state.kind) {
    case "upcoming":
    case "tomorrow":
      return "before-trip";
    case "today":
      return "during-trip";
    case "in-progress":
      return state.isLastDay ? "last-day" : "during-trip";
    case "just-finished":
      return "after-trip";
    case "memory":
      return "distant-memory";
  }
}

export function personalEditorialMessage(trips: Trip[], now = new Date()) {
  const kind = trips.length === 0
    ? "empty"
    : trips.map((trip) => kindForTrip(trip, now)).find((value): value is PersonalMessageKind => value != null)
      ?? "distant-memory";

  return { kind, text: MESSAGES[kind] };
}
