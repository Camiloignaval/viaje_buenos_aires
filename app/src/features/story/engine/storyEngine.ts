// Capa delgada que combina Story Package + Story Progress + contexto en una única
// respuesta lista para Presentation (ver IMPLEMENTATION_PHASE_2.md).
// No implementa ninguna regla de desbloqueo propia — todas viven en storyProgress.ts.
// Port TS 1:1 de story/storyEngine/storyEngine.js.

import {
  getStoryProgress,
  getChapterReferenceCalendarDate,
  countdownAnchorForCalendarDate,
  calendarOrdinal,
  ChapterStatus,
} from "./storyProgress";
import { StoryMode } from "./types";
import type {
  Chapter,
  ChapterStatuses,
  SpecialChapter,
  StoryContext,
  StoryModeValue,
  StoryPackage,
  StoryView,
  VisibleChapter,
} from "./types";

export { StoryMode };

function getOrderedChapters(storyPackage: StoryPackage): Chapter[] {
  return [...storyPackage.chapters].sort((a, b) => a.order - b.order);
}

function withStatus(
  chapter: Chapter,
  status: StoryView["specialChapterStatus"],
): VisibleChapter {
  return { ...chapter, status: status as VisibleChapter["status"] };
}

interface ModeArgs {
  orderedChapters: Chapter[];
  specialChapter: SpecialChapter | null;
  progress: ChapterStatuses;
  completedCount: number;
}

function resolveCurrentMode({
  orderedChapters,
  specialChapter,
  progress,
  completedCount,
}: ModeArgs): StoryModeValue {
  const firstChapterStatus = progress[orderedChapters[0].id];
  const allRegularCompleted = completedCount === orderedChapters.length;

  if (firstChapterStatus === ChapterStatus.LOCKED) {
    return StoryMode.PRE_TRIP;
  }
  if (!allRegularCompleted) {
    return StoryMode.IN_PROGRESS;
  }
  if (
    specialChapter &&
    progress[specialChapter.id] !== ChapterStatus.COMPLETED
  ) {
    return StoryMode.EPILOGUE;
  }
  return StoryMode.MEMORY_MODE;
}

interface VisibleArgs {
  currentMode: StoryModeValue;
  orderedChapters: Chapter[];
  specialChapter: SpecialChapter | null;
  progress: ChapterStatuses;
}

function resolveVisibleChapter({
  currentMode,
  orderedChapters,
  specialChapter,
  progress,
}: VisibleArgs): VisibleChapter | null {
  if (
    currentMode === StoryMode.PRE_TRIP ||
    currentMode === StoryMode.MEMORY_MODE
  ) {
    return null;
  }

  if (currentMode === StoryMode.EPILOGUE) {
    return withStatus(specialChapter as SpecialChapter, progress[(specialChapter as SpecialChapter).id]);
  }

  const current = orderedChapters.find((chapter) => {
    const status = progress[chapter.id];
    return (
      status === ChapterStatus.AVAILABLE || status === ChapterStatus.STARTED
    );
  });

  return current ? withStatus(current, progress[current.id]) : null;
}

interface NextUnlockArgs {
  orderedChapters: Chapter[];
  specialChapter: SpecialChapter | null;
  progress: ChapterStatuses;
  storyPackage: StoryPackage;
  now: StoryContext["now"];
}

function resolveNextUnlock({
  orderedChapters,
  specialChapter,
  progress,
  storyPackage,
  now,
}: NextUnlockArgs): StoryView["nextUnlock"] {
  const candidates = [...orderedChapters, ...(specialChapter ? [specialChapter] : [])]
    .map((chapter) => ({
      chapter,
      calendarDate: getChapterReferenceCalendarDate(chapter, storyPackage),
    }))
    .sort((a, b) => calendarOrdinal(a.calendarDate) - calendarOrdinal(b.calendarDate));

  const next = candidates.find(
    ({ chapter }) => progress[chapter.id] === ChapterStatus.LOCKED,
  );
  if (!next) {
    return null;
  }
  return {
    chapterId: next.chapter.id,
    date: countdownAnchorForCalendarDate(next.calendarDate, now),
  };
}

/**
 * Vista completa de la historia para un momento dado, lista para Presentation.
 */
export function getStoryView(
  storyPackage: StoryPackage,
  context: StoryContext,
): StoryView {
  const progress = getStoryProgress(storyPackage, context);
  const orderedChapters = getOrderedChapters(storyPackage);
  const specialChapter = storyPackage.specialChapter ?? null;

  const lockedChapters: string[] = [];
  const availableChapters: string[] = [];
  const completedChapters: string[] = [];

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
    visibleChapter: resolveVisibleChapter({
      currentMode,
      orderedChapters,
      specialChapter,
      progress,
    }),
    lockedChapters,
    availableChapters,
    completedChapters,
    nextUnlock: resolveNextUnlock({
      orderedChapters,
      specialChapter,
      progress,
      storyPackage,
      now: context.now,
    }),
    specialChapterStatus: specialChapter ? progress[specialChapter.id] : null,
    memoryModeAvailable: currentMode === StoryMode.MEMORY_MODE,
  };
}
