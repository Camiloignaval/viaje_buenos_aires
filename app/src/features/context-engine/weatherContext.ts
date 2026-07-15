import { safeTripTemporalState } from "@/features/trips/lib/countdown";
import type { Trip } from "@/features/trips/types";
import { availableResult, categoricalWeatherSource } from "./livingContextResult";
import type { LivingContextReason, ModuleResult, WeatherAdapterSnapshot, WeatherContext } from "./types";

export interface WeatherRequestInput {
  latitude: number;
  longitude: number;
  timezone: string;
  localDate: string;
}

export type WeatherEligibility =
  | { eligible: true; request: WeatherRequestInput }
  | { eligible: false; reason: Extract<LivingContextReason, "missing_weather_input" | "weather_outside_window"> };

function validTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function localCalendarDate(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function resolveWeatherEligibility({
  trip,
  now,
  targetLocalDate,
}: {
  trip?: Trip | null;
  now: Date;
  targetLocalDate?: string;
}): WeatherEligibility {
  const destination = trip?.destination && typeof trip.destination === "object" ? trip.destination : null;
  if (
    !destination ||
    !Number.isFinite(destination.latitude) || destination.latitude < -90 || destination.latitude > 90 ||
    !Number.isFinite(destination.longitude) || destination.longitude < -180 || destination.longitude > 180 ||
    !validTimezone(destination.timezone) ||
    !trip?.startDateTime ||
    !trip.endDateTime
  ) {
    return { eligible: false, reason: "missing_weather_input" };
  }

  const today = localCalendarDate(now, destination.timezone);
  const requestedDate = targetLocalDate ?? today;
  const temporalState = safeTripTemporalState(now, trip.startDateTime, trip.endDateTime, destination.timezone);
  const tripInProgress = temporalState?.kind === "today" || temporalState?.kind === "in-progress";
  if (trip.status !== "active" || !tripInProgress || requestedDate !== today) {
    return { eligible: false, reason: "weather_outside_window" };
  }

  return {
    eligible: true,
    request: {
      latitude: destination.latitude,
      longitude: destination.longitude,
      timezone: destination.timezone,
      localDate: requestedDate,
    },
  };
}

export function resolveWeatherSnapshot(snapshot: WeatherAdapterSnapshot, now: Date): ModuleResult<WeatherContext> {
  const expiresAt = Date.parse(snapshot.value.expiresAt);
  const stale = !Number.isFinite(expiresAt) || now.getTime() >= expiresAt;
  return availableResult(
    "weather",
    snapshot.value,
    "adapter",
    categoricalWeatherSource(snapshot.source),
    snapshot.fetchedAt,
    now,
    stale ? "stale" : undefined,
  );
}
