import { safeTripTemporalState } from "@/features/trips/lib/countdown";
import type { TemporalLivingContext } from "./livingContext";
import { availableResult, unavailableResult } from "./livingContextResult";
import type { ModuleResult } from "./types";

export interface TemporalContextInput { startDateTime?: string | null; endDateTime?: string | null; timezone?: string | null; observedAt?: string | null }

function validTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(0); return true; } catch { return false; }
}

export function resolveTemporalContext(input: TemporalContextInput, now: Date): ModuleResult<TemporalLivingContext> {
  if (!input.startDateTime || !input.endDateTime) return unavailableResult("missing_dates", "trip.dates", "trip");
  if (!input.timezone || !validTimezone(input.timezone)) return unavailableResult("invalid_timezone", "trip.destination", "trip");
  const state = safeTripTemporalState(now, input.startDateTime, input.endDateTime, input.timezone);
  if (!state) return unavailableResult("missing_dates", "trip.dates", "trip");
  return availableResult("temporal", { startDateTime: input.startDateTime, endDateTime: input.endDateTime, timezone: input.timezone, state }, "trip", "trip.dates", input.observedAt, now);
}
