// Calcula el estado de cada capítulo de un Story Package (ver 07_Business_Rules.md).
// Asume que el Story Package ya fue validado por storyPackage.ts — no lo revalida.
// Port TS 1:1 de story/storyProgress/storyProgress.js.

import { ChapterStatus } from "./types";
import type {
  Chapter,
  ChapterStatuses,
  ChapterStatusValue,
  StoryContext,
  StoryPackage,
} from "./types";

export { ChapterStatus };
export type { ChapterStatusValue };

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2})(?::(\d{2}))?(?::\d{2}(?:\.\d+)?)?)?$/;
const LOCAL_TIME_PATTERN = /^(\d{2}):(\d{2})$/;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function validTimezone(timezone?: string): timezone is string {
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

interface NarrativeDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function literalDateTimeParts(value: string): NarrativeDateTimeParts | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4] === undefined ? 12 : Number(match[4]),
    minute: match[5] === undefined ? 0 : Number(match[5]),
  };
}

function zonedDateTimeParts(value: Date | string, timezone?: string): NarrativeDateTimeParts {
  if (typeof value === "string") {
    const literal = literalDateTimeParts(value);
    if (literal) return literal;
  }

  const date = toDate(value);
  if (validTimezone(timezone)) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour"), minute: read("minute") };
  }
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

export function resolveStoryTimezone(storyPackage: StoryPackage, override?: string): string | undefined {
  const candidate = override ?? storyPackage.metadata.experienceTimezone ?? storyPackage.metadata.livingContext?.timezone;
  return validTimezone(candidate) ? candidate : undefined;
}

/** Convierte el valor de Director Mode, entendido como hora local del destino, a un instante real. */
export function narrativeNowFrom(value: string, timezone?: string): Date | null {
  const literal = literalDateTimeParts(value);
  if (!literal) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (!validTimezone(timezone)) {
    const parsed = new Date(`${value}${value.includes("T") ? "" : "T12:00:00"}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const targetMinutes = calendarOrdinal(`${literal.year}-${pad2(literal.month)}-${pad2(literal.day)}`) * 1440
    + literal.hour * 60 + literal.minute;
  let candidate = new Date(Date.UTC(literal.year, literal.month - 1, literal.day, literal.hour, literal.minute));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedDateTimeParts(candidate, timezone);
    const actualMinutes = calendarOrdinal(`${actual.year}-${pad2(actual.month)}-${pad2(actual.day)}`) * 1440
      + actual.hour * 60 + actual.minute;
    candidate = new Date(candidate.getTime() + (targetMinutes - actualMinutes) * 60_000);
  }
  return candidate;
}

function calendarDateParts(calendarDate: string): [number, number, number] {
  const match = CALENDAR_DATE_PATTERN.exec(calendarDate);
  if (!match) {
    throw new Error(`Fecha calendario inválida: ${calendarDate}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Fecha calendario percibida: YYYY-MM-DD, sin horas ni conversión UTC. */
export function calendarDateFrom(value: Date | string, timezone?: string): string {
  if (typeof value === "string") {
    const literal = literalDateTimeParts(value);
    if (literal) return `${literal.year}-${pad2(literal.month)}-${pad2(literal.day)}`;
    if (!validTimezone(timezone)) {
      const match = CALENDAR_DATE_PATTERN.exec(value);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
      throw new Error(`Fecha calendario inválida: ${value}`);
    }
  }
  const parts = zonedDateTimeParts(value, timezone);
  if (![parts.year, parts.month, parts.day].every(Number.isFinite)) {
    throw new Error(`Fecha calendario inválida: ${String(value)}`);
  }
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function calendarOrdinal(calendarDate: string): number {
  const [year, month, day] = calendarDateParts(calendarDate);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
}

export function calendarDateFromOrdinal(ordinal: number): string {
  const date = new Date(ordinal * DAY_IN_MS);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function addCalendarDays(date: Date | string, days: number): string {
  return calendarDateFromOrdinal(calendarOrdinal(calendarDateFrom(date)) + days);
}

export function calendarDaysBetween(start: Date | string, end: Date | string, timezone?: string): number {
  return calendarOrdinal(calendarDateFrom(end, timezone)) - calendarOrdinal(calendarDateFrom(start, timezone));
}

function isCalendarOnOrAfter(now: Date | string, referenceDate: Date | string, timezone?: string): boolean {
  return calendarDaysBetween(referenceDate, now, timezone) >= 0;
}

function isLocalUnlockReached(now: Date | string, referenceDate: string, localTime: string, timezone?: string): boolean {
  const match = LOCAL_TIME_PATTERN.exec(localTime);
  if (!match) return isCalendarOnOrAfter(now, referenceDate, timezone);
  const nowParts = zonedDateTimeParts(now, timezone);
  const nowMinutes = calendarOrdinal(`${nowParts.year}-${pad2(nowParts.month)}-${pad2(nowParts.day)}`) * 1440
    + nowParts.hour * 60 + nowParts.minute;
  const targetMinutes = calendarOrdinal(referenceDate) * 1440 + Number(match[1]) * 60 + Number(match[2]);
  return nowMinutes >= targetMinutes;
}

/**
 * Date estable para presentación: mediodía UTC del día calendario.
 * No representa una hora real del viaje; evita que `formatChapterDate` cambie de día
 * por el timezone local del navegador o del servidor.
 */
function calendarDateToDisplayDate(calendarDate: string): Date {
  const [year, month, day] = calendarDateParts(calendarDate);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/**
 * Anchor sintético para el countdown actual, que ya divide milisegundos.
 * La fecha se calcula desde `now + díasCalendario * 24h` para que el resultado sea
 * exactamente días de calendario, sin depender de la hora ni de cambios DST.
 */
export function countdownAnchorForCalendarDate(targetDate: Date | string, now: Date | string): Date {
  const days = Math.max(0, calendarDaysBetween(now, targetDate));
  return new Date(toDate(now).getTime() + days * DAY_IN_MS);
}

export function getChapterReferenceCalendarDate(
  chapter: Chapter,
  storyPackage: StoryPackage,
): string {
  if (chapter.date) {
    return calendarDateFrom(chapter.date);
  }
  return addCalendarDays(storyPackage.metadata.travelDates.start, chapter.order - 1);
}

/**
 * Fecha de referencia de un capítulo para presentación.
 * Si el capítulo trae su propia `date` (caso del capítulo especial), se usa tal cual —
 * nunca se deriva de `travelDates.end` (ver SPECIAL_CHAPTER_DESIGN.md §4).
 * Si no, se calcula como travelDates.start + (order - 1) días de calendario.
 */
export function getChapterReferenceDate(
  chapter: Chapter,
  storyPackage: StoryPackage,
): Date {
  return calendarDateToDisplayDate(getChapterReferenceCalendarDate(chapter, storyPackage));
}

function resolveUnlockRule(chapter: Chapter, storyPackage: StoryPackage) {
  return { ...storyPackage.unlockRulesDefault, ...(chapter.unlockRule ?? {}) };
}

interface ChapterStatusArgs {
  chapter: Chapter;
  storyPackage: StoryPackage;
  now: Date | string;
  previousChapterCompleted: boolean;
  priorStatus?: ChapterStatusValue;
  timezone?: string;
}

/**
 * Estado de un único capítulo.
 * `priorStatus` es "pegajoso": una vez Started o Completed, nunca vuelve atrás
 * aunque cambien las condiciones de fecha/progreso (ver 08_State_machine.md).
 */
export function getChapterStatus({
  chapter,
  storyPackage,
  now,
  previousChapterCompleted,
  priorStatus,
  timezone,
}: ChapterStatusArgs): ChapterStatusValue {
  if (
    priorStatus === ChapterStatus.STARTED ||
    priorStatus === ChapterStatus.COMPLETED
  ) {
    return priorStatus;
  }

  const unlockRule = resolveUnlockRule(chapter, storyPackage);
  const referenceDate = getChapterReferenceCalendarDate(chapter, storyPackage);

  const dateSatisfied =
    !unlockRule.requiresDateReached || (unlockRule.localTime
      ? isLocalUnlockReached(now, referenceDate, unlockRule.localTime, timezone)
      : isCalendarOnOrAfter(now, referenceDate, timezone));
  const previousSatisfied =
    !unlockRule.requiresPreviousChapterCompleted ||
    previousChapterCompleted === true;

  return dateSatisfied && previousSatisfied
    ? ChapterStatus.AVAILABLE
    : ChapterStatus.LOCKED;
}

/**
 * Estado de todos los capítulos (incluido el capítulo especial, si existe) para un momento dado.
 */
export function getStoryProgress(
  storyPackage: StoryPackage,
  { now, chapterStatuses = {}, timezone: timezoneOverride }: StoryContext,
): ChapterStatuses {
  const timezone = resolveStoryTimezone(storyPackage, timezoneOverride);
  const orderedChapters = [...storyPackage.chapters].sort(
    (a, b) => a.order - b.order,
  );
  const progress: ChapterStatuses = {};
  let previousChapterCompleted = true; // no existe capítulo anterior al primero

  for (const chapter of orderedChapters) {
    const status = getChapterStatus({
      chapter,
      storyPackage,
      now,
      previousChapterCompleted,
      priorStatus: chapterStatuses[chapter.id],
      timezone,
    });
    progress[chapter.id] = status;
    previousChapterCompleted = status === ChapterStatus.COMPLETED;
  }

  if (storyPackage.specialChapter) {
    progress[storyPackage.specialChapter.id] = getChapterStatus({
      chapter: storyPackage.specialChapter,
      storyPackage,
      now,
      previousChapterCompleted,
      priorStatus: chapterStatuses[storyPackage.specialChapter.id],
      timezone,
    });
  }

  return progress;
}
