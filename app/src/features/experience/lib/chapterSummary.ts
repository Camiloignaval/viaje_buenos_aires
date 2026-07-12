// Resumen del estado de cada capítulo para el índice, y la imagen hero por día.
// Port verbatim de render.js (buildChapterSummary / heroImageForChapter).

import { ChapterStatus, getChapterReferenceDate } from "@/features/story/engine/storyProgress";
import type { Chapter, ChapterStatusValue, StoryPackage, StoryView } from "@/features/story/engine/types";

export interface ChapterSummaryEntry {
  id: string;
  title: string;
  order: number;
  status: ChapterStatusValue;
  referenceDate: Date;
}

export function buildChapterSummary(
  view: StoryView,
  storyPackage: StoryPackage,
): ChapterSummaryEntry[] {
  return storyPackage.chapters.map((chapter) => {
    let status: ChapterStatusValue = ChapterStatus.LOCKED;
    if (view.completedChapters.includes(chapter.id)) {
      status = ChapterStatus.COMPLETED;
    } else if (view.visibleChapter?.id === chapter.id) {
      status = view.visibleChapter.status;
    } else if (view.availableChapters.includes(chapter.id)) {
      status = ChapterStatus.AVAILABLE;
    }
    return {
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      status,
      referenceDate: getChapterReferenceDate(chapter, storyPackage),
    };
  });
}

export function heroImageForChapter(chapter: Chapter): string {
  const day = Math.min(Math.max(Number(chapter.order ?? 1), 1), 4);
  return `/dia${day}-hero.jpg`;
}
