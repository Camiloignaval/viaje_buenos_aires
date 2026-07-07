// Calcula el estado de cada capítulo de un Story Package (ver 07_Business_Rules.md).
// Asume que el Story Package ya fue validado por storyPackage.js — no vuelve a validarlo.

export const ChapterStatus = Object.freeze({
  LOCKED: 'locked',
  AVAILABLE: 'available',
  STARTED: 'started',
  COMPLETED: 'completed',
});

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function addDays(date, days) {
  const result = new Date(toDate(date).getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isOnOrAfter(now, referenceDate) {
  return toDate(now).getTime() >= toDate(referenceDate).getTime();
}

/**
 * Fecha de referencia de un capítulo para efectos de desbloqueo.
 * Si el capítulo trae su propia `date` (caso del capítulo especial), se usa tal cual —
 * nunca se deriva de `travelDates.end` (ver SPECIAL_CHAPTER_DESIGN.md §4).
 * Si no, se calcula como travelDates.start + (order - 1) días.
 */
export function getChapterReferenceDate(chapter, storyPackage) {
  if (chapter.date) {
    return toDate(chapter.date);
  }
  return addDays(storyPackage.metadata.travelDates.start, chapter.order - 1);
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
  const referenceDate = getChapterReferenceDate(chapter, storyPackage);

  const dateSatisfied = !unlockRule.requiresDateReached || isOnOrAfter(now, referenceDate);
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
