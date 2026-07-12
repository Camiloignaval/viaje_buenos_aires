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

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function calendarDateParts(calendarDate: string): [number, number, number] {
  const match = CALENDAR_DATE_PATTERN.exec(calendarDate);
  if (!match) {
    throw new Error(`Fecha calendario inválida: ${calendarDate}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Fecha calendario percibida: YYYY-MM-DD, sin horas ni conversión UTC. */
export function calendarDateFrom(value: Date | string): string {
  if (typeof value === "string") {
    const match = CALENDAR_DATE_PATTERN.exec(value);
    if (!match) {
      throw new Error(`Fecha calendario inválida: ${value}`);
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
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

export function calendarDaysBetween(start: Date | string, end: Date | string): number {
  return calendarOrdinal(calendarDateFrom(end)) - calendarOrdinal(calendarDateFrom(start));
}

function isCalendarOnOrAfter(now: Date | string, referenceDate: Date | string): boolean {
  return calendarDaysBetween(referenceDate, now) >= 0;
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
    !unlockRule.requiresDateReached || isCalendarOnOrAfter(now, referenceDate);
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
  { now, chapterStatuses = {} }: StoryContext,
): ChapterStatuses {
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
    });
  }

  return progress;
}
