// Calcula el estado de cada capítulo de un Story Package (ver 07_Business_Rules.md).
// Asume que el Story Package ya fue validado por storyPackage.js — no vuelve a validarlo.

export const ChapterStatus = Object.freeze({
  LOCKED: 'locked',
  AVAILABLE: 'available',
  STARTED: 'started',
  COMPLETED: 'completed',
});

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function calendarDateParts(calendarDate) {
  const match = CALENDAR_DATE_PATTERN.exec(calendarDate);
  if (!match) throw new Error(`Fecha calendario inválida: ${calendarDate}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Fecha calendario percibida: YYYY-MM-DD, sin horas ni conversión UTC. */
export function calendarDateFrom(value) {
  if (typeof value === 'string') {
    const match = CALENDAR_DATE_PATTERN.exec(value);
    if (!match) throw new Error(`Fecha calendario inválida: ${value}`);
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

export function calendarOrdinal(calendarDate) {
  const [year, month, day] = calendarDateParts(calendarDate);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
}

export function calendarDateFromOrdinal(ordinal) {
  const date = new Date(ordinal * DAY_IN_MS);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function addCalendarDays(date, days) {
  return calendarDateFromOrdinal(calendarOrdinal(calendarDateFrom(date)) + days);
}

export function calendarDaysBetween(start, end) {
  return calendarOrdinal(calendarDateFrom(end)) - calendarOrdinal(calendarDateFrom(start));
}

function isCalendarOnOrAfter(now, referenceDate) {
  return calendarDaysBetween(referenceDate, now) >= 0;
}

/**
 * Date estable para presentación: mediodía UTC del día calendario.
 * No representa una hora real del viaje; evita que el formato cambie de día
 * por el timezone local del navegador o del servidor.
 */
function calendarDateToDisplayDate(calendarDate) {
  const [year, month, day] = calendarDateParts(calendarDate);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/**
 * Anchor sintético para el countdown actual, que ya divide milisegundos.
 * La fecha se calcula desde `now + díasCalendario * 24h` para que el resultado sea
 * exactamente días de calendario, sin depender de la hora ni de cambios DST.
 */
export function countdownAnchorForCalendarDate(targetDate, now) {
  const days = Math.max(0, calendarDaysBetween(now, targetDate));
  return new Date(toDate(now).getTime() + days * DAY_IN_MS);
}

export function getChapterReferenceCalendarDate(chapter, storyPackage) {
  if (chapter.date) return calendarDateFrom(chapter.date);
  return addCalendarDays(storyPackage.metadata.travelDates.start, chapter.order - 1);
}

/**
 * Fecha de referencia de un capítulo para presentación.
 * Si el capítulo trae su propia `date` (caso del capítulo especial), se usa tal cual —
 * nunca se deriva de `travelDates.end` (ver SPECIAL_CHAPTER_DESIGN.md §4).
 * Si no, se calcula como travelDates.start + (order - 1) días de calendario.
 */
export function getChapterReferenceDate(chapter, storyPackage) {
  return calendarDateToDisplayDate(getChapterReferenceCalendarDate(chapter, storyPackage));
}

function resolveUnlockRule(chapter, storyPackage) {
  return { ...storyPackage.unlockRulesDefault, ...(chapter.unlockRule ?? {}) };
}

/**
 * Estado de un único capítulo.
 * `priorStatus` es "pegajoso": una vez Started o Completed, nunca vuelve atrás
 * aunque cambien las condiciones de fecha/progreso (ver 08_State_machine.md).
 */
export function getChapterStatus({ chapter, storyPackage, now, previousChapterCompleted, priorStatus }) {
  if (priorStatus === ChapterStatus.STARTED || priorStatus === ChapterStatus.COMPLETED) {
    return priorStatus;
  }

  const unlockRule = resolveUnlockRule(chapter, storyPackage);
  const referenceDate = getChapterReferenceCalendarDate(chapter, storyPackage);

  const dateSatisfied = !unlockRule.requiresDateReached || isCalendarOnOrAfter(now, referenceDate);
  const previousSatisfied = !unlockRule.requiresPreviousChapterCompleted || previousChapterCompleted === true;

  return dateSatisfied && previousSatisfied ? ChapterStatus.AVAILABLE : ChapterStatus.LOCKED;
}

/**
 * Estado de todos los capítulos (incluido el capítulo especial, si existe) para un momento dado.
 *
 * @param {object} storyPackage - Story Package ya validado.
 * @param {object} context
 * @param {Date|string} context.now - Momento contra el que se evalúan las fechas.
 * @param {Record<string, string>} [context.chapterStatuses] - Estado ya conocido por capítulo
 *   (solo hace falta informar 'started' o 'completed'; el resto se calcula).
 */
export function getStoryProgress(storyPackage, { now, chapterStatuses = {} }) {
  const orderedChapters = [...storyPackage.chapters].sort((a, b) => a.order - b.order);
  const progress = {};
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
