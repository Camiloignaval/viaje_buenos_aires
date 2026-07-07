// Capa delgada que combina Story Package + Story Progress + contexto en una única
// respuesta lista para Presentation (ver IMPLEMENTATION_PHASE_2.md).
// No implementa ninguna regla de desbloqueo propia — todas viven en storyProgress.js.

import { getStoryProgress, getChapterReferenceDate, ChapterStatus } from '../storyProgress/storyProgress.js';

export const StoryMode = Object.freeze({
  PRE_TRIP: 'pre_trip',
  IN_PROGRESS: 'in_progress',
  EPILOGUE: 'epilogue',
  MEMORY_MODE: 'memory_mode',
});

function getOrderedChapters(storyPackage) {
  return [...storyPackage.chapters].sort((a, b) => a.order - b.order);
}

function withStatus(chapter, status) {
  return { ...chapter, status };
}

function resolveCurrentMode({ orderedChapters, specialChapter, progress, completedCount }) {
  const firstChapterStatus = progress[orderedChapters[0].id];
  const allRegularCompleted = completedCount === orderedChapters.length;

  if (firstChapterStatus === ChapterStatus.LOCKED) {
    return StoryMode.PRE_TRIP;
  }
  if (!allRegularCompleted) {
    return StoryMode.IN_PROGRESS;
  }
  if (specialChapter && progress[specialChapter.id] !== ChapterStatus.COMPLETED) {
    return StoryMode.EPILOGUE;
  }
  return StoryMode.MEMORY_MODE;
}

function resolveVisibleChapter({ currentMode, orderedChapters, specialChapter, progress }) {
  if (currentMode === StoryMode.PRE_TRIP || currentMode === StoryMode.MEMORY_MODE) {
    return null;
  }

  if (currentMode === StoryMode.EPILOGUE) {
    return withStatus(specialChapter, progress[specialChapter.id]);
  }

  const current = orderedChapters.find((chapter) => {
    const status = progress[chapter.id];
    return status === ChapterStatus.AVAILABLE || status === ChapterStatus.STARTED;
  });

  return current ? withStatus(current, progress[current.id]) : null;
}

function resolveNextUnlock({ orderedChapters, specialChapter, progress, storyPackage }) {
  const candidates = [...orderedChapters, ...(specialChapter ? [specialChapter] : [])]
    .map((chapter) => ({ chapter, date: getChapterReferenceDate(chapter, storyPackage) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const next = candidates.find(({ chapter }) => progress[chapter.id] === ChapterStatus.LOCKED);
  if (!next) {
    return null;
  }
  return { chapterId: next.chapter.id, date: next.date };
}

/**
 * Vista completa de la historia para un momento dado, lista para Presentation.
 *
 * @param {object} storyPackage - Story Package ya validado (storyPackage.js).
 * @param {object} context
 * @param {Date|string} context.now
 * @param {Record<string, string>} [context.chapterStatuses]
 */
export function getStoryView(storyPackage, context) {
  const progress = getStoryProgress(storyPackage, context);
  const orderedChapters = getOrderedChapters(storyPackage);
  const specialChapter = storyPackage.specialChapter ?? null;

  const lockedChapters = [];
  const availableChapters = [];
  const completedChapters = [];

  for (const chapter of orderedChapters) {
    const status = progress[chapter.id];
    if (status === ChapterStatus.LOCKED) {
      lockedChapters.push(chapter.id);
    } else if (status === ChapterStatus.COMPLETED) {
      completedChapters.push(chapter.id);
    } else {
      availableChapters.push(chapter.id); // available o started
    }
  }

  const currentMode = resolveCurrentMode({
    orderedChapters,
    specialChapter,
    progress,
    completedCount: completedChapters.length,
  });

  return {
    currentMode,
    visibleChapter: resolveVisibleChapter({ currentMode, orderedChapters, specialChapter, progress }),
    lockedChapters,
    availableChapters,
    completedChapters,
    nextUnlock: resolveNextUnlock({ orderedChapters, specialChapter, progress, storyPackage }),
    specialChapterStatus: specialChapter ? progress[specialChapter.id] : null,
    memoryModeAvailable: currentMode === StoryMode.MEMORY_MODE,
  };
}
