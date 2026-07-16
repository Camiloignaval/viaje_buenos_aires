import { platformRequest } from "@/services/platformClient";
import type { LocalDateTime, WeatherAdapterSnapshot, WeatherCondition, WeatherContext } from "./types";
import type { WeatherRequestInput } from "./weatherContext";

export type TripWeatherRequestInput = WeatherRequestInput & Readonly<{ tripId: string }>;

const CONDITIONS = new Set<WeatherCondition>([
  "clear", "cloudy", "fog", "rain", "storm", "snow", "freezing", "unknown",
]);
const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isoInstant(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
}

function timezone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function localDateTime(value: unknown): value is LocalDateTime {
  return exactKeys(value, ["localDateTime", "timezone"])
    && typeof value.localDateTime === "string"
    && LOCAL_DATE_TIME.test(value.localDateTime)
    && timezone(value.timezone);
}

function finiteInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function weatherValue(value: unknown): value is WeatherContext {
  if (!exactKeys(value, [
    "condition", "temperatureC", "precipitationProbability", "isRaining", "isStorm", "isSnow",
    "sunrise", "sunset", "effectiveAt", "expiresAt", "confidence",
  ])) return false;
  return typeof value.condition === "string"
    && CONDITIONS.has(value.condition as WeatherCondition)
    && finiteInRange(value.temperatureC, -100, 70)
    && (value.precipitationProbability === null || finiteInRange(value.precipitationProbability, 0, 100))
    && typeof value.isRaining === "boolean"
    && typeof value.isStorm === "boolean"
    && typeof value.isSnow === "boolean"
    && (value.sunrise === null || localDateTime(value.sunrise))
    && (value.sunset === null || localDateTime(value.sunset))
    && localDateTime(value.effectiveAt)
    && isoInstant(value.expiresAt)
    && value.confidence === "unknown";
}

export function isWeatherAdapterSnapshot(
  value: unknown,
  expected?: Pick<WeatherRequestInput, "timezone" | "localDate">,
): value is WeatherAdapterSnapshot {
  if (!exactKeys(value, ["value", "fetchedAt", "source"])) return false;
  const snapshotValue = value.value;
  if (
    !weatherValue(snapshotValue)
    || !isoInstant(value.fetchedAt)
    || typeof value.source !== "string"
    || value.source.length === 0
    || Date.parse(snapshotValue.expiresAt) - Date.parse(value.fetchedAt) !== 900_000
  ) return false;
  if (!expected) return true;
  const times = [snapshotValue.effectiveAt, snapshotValue.sunrise, snapshotValue.sunset].filter(
    (item): item is LocalDateTime => item !== null,
  );
  return snapshotValue.effectiveAt.localDateTime.startsWith(`${expected.localDate}T`)
    && times.every((item) => item.timezone === expected.timezone && item.localDateTime.startsWith(`${expected.localDate}T`));
}

function publicWeatherSnapshot(value: unknown, expected: Pick<WeatherRequestInput, "timezone" | "localDate">): WeatherAdapterSnapshot | null {
  if (!exactKeys(value, ["available", "value", "fetchedAt"]) || value.available !== true) return null;
  const snapshot = { value: value.value, fetchedAt: value.fetchedAt, source: "weather" };
  return isWeatherAdapterSnapshot(snapshot, expected) ? snapshot : null;
}

export async function fetchWeatherContext(input: TripWeatherRequestInput & { signal?: AbortSignal }): Promise<WeatherAdapterSnapshot | null> {
  const { signal, ...body } = input;
  try {
    const snapshot = await platformRequest<unknown>("/api/context/weather", { method: "POST", body, signal });
    return publicWeatherSnapshot(snapshot, body);
  } catch {
    return null;
  }
}
