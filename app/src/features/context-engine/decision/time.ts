import type { DecisionWindow } from "./contracts";

export type WindowState = "active" | "outside" | "invalid";

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

interface CalendarDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function parseCalendarDate(value: string): CalendarDateParts | null {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() !== month - 1
    || normalized.getUTCDate() !== day
  ) return null;
  return { year, month, day };
}

function calendarDate(parts: CalendarDateParts): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function formatter(timezone: string, withTime = false): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(withTime ? { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" as const } : {}),
    });
  } catch {
    return null;
  }
}

function dateTimeParts(date: Date, timezone: string): CalendarDateParts & { hour: number; minute: number; second: number } | null {
  const dateFormatter = formatter(timezone, true);
  if (!dateFormatter || !Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date)
      .filter(({ type }) => ["year", "month", "day", "hour", "minute", "second"].includes(type))
      .map(({ type, value }) => [type, Number(value)]),
  );
  if (![parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second].every(Number.isFinite)) return null;
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function addCalendarDays(value: string, days: number): string | null {
  const parts = parseCalendarDate(value);
  if (!parts) return null;
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return calendarDate({ year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() });
}

function destinationMidnight(value: string, timezone: string): Date | null {
  const target = parseCalendarDate(value);
  if (!target || !formatter(timezone)) return null;
  const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day);
  let candidateMs = targetAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = dateTimeParts(new Date(candidateMs), timezone);
    if (!local) return null;
    const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    candidateMs += targetAsUtc - localAsUtc;
  }
  const candidate = new Date(candidateMs);
  const local = dateTimeParts(candidate, timezone);
  if (!local || calendarDate(local) !== value || local.hour !== 0 || local.minute !== 0 || local.second !== 0) return null;
  return candidate;
}

export function resolveDestinationLocalDateTime(value: string, timezone: string): Date | null {
  const match = LOCAL_DATE_TIME.exec(value);
  if (!match || !formatter(timezone)) return null;
  const target = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? "0"),
  };
  const date = parseCalendarDate(`${match[1]}-${match[2]}-${match[3]}`);
  if (!date || target.hour > 23 || target.minute > 59 || target.second > 59) return null;
  const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, target.second);
  let candidateMs = targetAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = dateTimeParts(new Date(candidateMs), timezone);
    if (!local) return null;
    const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    candidateMs += targetAsUtc - localAsUtc;
  }
  const candidate = new Date(candidateMs);
  const local = dateTimeParts(candidate, timezone);
  if (!local || Object.entries(target).some(([key, expected]) => local[key as keyof typeof local] !== expected)) return null;
  return candidate;
}

export function resolveDestinationLocalDate(now: Date, timezone: string): string | null {
  const parts = dateTimeParts(now, timezone);
  return parts ? calendarDate(parts) : null;
}

export function resolveDestinationLocalDayWindow(
  now: Date,
  timezone: string,
): Readonly<{ localDate: string; validFrom: string; validUntil: string }> | null {
  const localDate = resolveDestinationLocalDate(now, timezone);
  const followingDate = localDate ? addCalendarDays(localDate, 1) : null;
  if (!localDate || !followingDate) return null;
  const validFrom = destinationMidnight(localDate, timezone);
  const validUntil = destinationMidnight(followingDate, timezone);
  if (!validFrom || !validUntil || validUntil <= validFrom) return null;
  return Object.freeze({ localDate, validFrom: validFrom.toISOString(), validUntil: validUntil.toISOString() });
}

export function normalizedCalendarDate(value: string): string | null {
  const parts = parseCalendarDate(value);
  return parts ? calendarDate(parts) : null;
}

export function resolveWindowState(window: DecisionWindow, now: Date): WindowState {
  const validFrom = Date.parse(window.validFrom);
  const validUntil = Date.parse(window.validUntil);
  const effectiveAt = Date.parse(window.effectiveAt);
  const expiresAt = Date.parse(window.expiresAt);
  const nowMs = now.getTime();
  if (
    !Number.isFinite(nowMs)
    || ![validFrom, validUntil, effectiveAt, expiresAt].every(Number.isFinite)
    || validUntil <= validFrom
    || expiresAt <= validFrom
    || effectiveAt < validFrom
    || effectiveAt > validUntil
  ) return "invalid";
  return nowMs >= validFrom && nowMs < validUntil && nowMs < expiresAt ? "active" : "outside";
}
