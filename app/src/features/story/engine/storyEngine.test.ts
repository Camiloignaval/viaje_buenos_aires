import { describe, it, expect } from "vitest";
import { getStoryView, StoryMode } from "./storyEngine";
import { ChapterStatus } from "./storyProgress";
import type { StoryPackage } from "./types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function fixturePackage({ withSpecialChapter = true } = {}): StoryPackage {
  return {
    metadata: { travelDates: { start: "2026-07-18", end: "2026-07-19" } },
    unlockRulesDefault: {
      requiresDateReached: true,
      requiresPreviousChapterCompleted: true,
    },
    chapters: [
      {
        id: "chapter-1",
        order: 1,
        title: "Día 1",
        unlockRule: { requiresPreviousChapterCompleted: false },
      },
      { id: "chapter-2", order: 2, title: "Día 2" },
    ],
    ...(withSpecialChapter
      ? {
          specialChapter: {
            id: "chapter-epilogue",
            order: 3,
            title: "Epílogo",
            date: "2026-07-22",
          },
        }
      : {}),
  } as unknown as StoryPackage;
}

function countdownDays(date: Date, now: string): number {
  return Math.max(0, Math.ceil((date.getTime() - new Date(now).getTime()) / DAY_IN_MS));
}

describe("getStoryView", () => {
  it("currentMode es pre_trip antes de que el primer capítulo se desbloquee", () => {
    const view = getStoryView(fixturePackage(), { now: "2026-07-01" });
    expect(view.currentMode).toBe(StoryMode.PRE_TRIP);
    expect(view.visibleChapter).toBe(null);
    expect(view.lockedChapters).toEqual(["chapter-1", "chapter-2"]);
  });

  it("currentMode es in_progress con un capítulo disponible, y visibleChapter trae su estado", () => {
    const view = getStoryView(fixturePackage(), { now: "2026-07-18" });
    expect(view.currentMode).toBe(StoryMode.IN_PROGRESS);
    expect(view.visibleChapter?.id).toBe("chapter-1");
    expect(view.visibleChapter?.status).toBe(ChapterStatus.AVAILABLE);
    expect(view.visibleChapter?.title).toBe("Día 1");
    expect(view.availableChapters).toEqual(["chapter-1"]);
  });

  it("un capítulo started se sigue viendo como visibleChapter, con status started", () => {
    const view = getStoryView(fixturePackage(), {
      now: "2026-07-18",
      chapterStatuses: { "chapter-1": ChapterStatus.STARTED },
    });
    expect(view.visibleChapter?.id).toBe("chapter-1");
    expect(view.visibleChapter?.status).toBe(ChapterStatus.STARTED);
    expect(view.availableChapters).toEqual(["chapter-1"]);
  });

  it("currentMode es epilogue cuando los capítulos regulares están completos y el especial no", () => {
    const view = getStoryView(fixturePackage(), {
      now: "2026-07-20",
      chapterStatuses: {
        "chapter-1": ChapterStatus.COMPLETED,
        "chapter-2": ChapterStatus.COMPLETED,
      },
    });
    expect(view.currentMode).toBe(StoryMode.EPILOGUE);
    expect(view.visibleChapter?.id).toBe("chapter-epilogue");
    expect(view.visibleChapter?.status).toBe(ChapterStatus.LOCKED);
    expect(view.specialChapterStatus).toBe(ChapterStatus.LOCKED);
    expect(view.memoryModeAvailable).toBe(false);
  });

  it("currentMode es memory_mode cuando el capítulo especial está completado", () => {
    const view = getStoryView(fixturePackage(), {
      now: "2026-07-22",
      chapterStatuses: {
        "chapter-1": ChapterStatus.COMPLETED,
        "chapter-2": ChapterStatus.COMPLETED,
        "chapter-epilogue": ChapterStatus.COMPLETED,
      },
    });
    expect(view.currentMode).toBe(StoryMode.MEMORY_MODE);
    expect(view.visibleChapter).toBe(null);
    expect(view.memoryModeAvailable).toBe(true);
  });

  it("currentMode es memory_mode sin capítulo especial, al completar todos los regulares", () => {
    const view = getStoryView(fixturePackage({ withSpecialChapter: false }), {
      now: "2026-07-19",
      chapterStatuses: {
        "chapter-1": ChapterStatus.COMPLETED,
        "chapter-2": ChapterStatus.COMPLETED,
      },
    });
    expect(view.currentMode).toBe(StoryMode.MEMORY_MODE);
    expect(view.specialChapterStatus).toBe(null);
    expect(view.memoryModeAvailable).toBe(true);
  });

  it("nextUnlock alimenta el contador con 8 días calendario para 10 julio → 18 julio", () => {
    const now = "2026-07-10T20:00:00-04:00";
    const view = getStoryView(fixturePackage(), { now });
    expect(view.nextUnlock?.chapterId).toBe("chapter-1");
    expect(countdownDays(view.nextUnlock!.date, now)).toBe(8);
  });

  it("nextUnlock alimenta el contador con hoy, mañana y 30 días", () => {
    const tomorrowNow = "2026-07-17T23:59:00-04:00";
    const tomorrow = getStoryView(fixturePackage(), { now: tomorrowNow });
    expect(countdownDays(tomorrow.nextUnlock!.date, tomorrowNow)).toBe(1);

    const monthNow = "2026-06-18T08:00:00-04:00";
    const monthAway = getStoryView(fixturePackage(), { now: monthNow });
    expect(countdownDays(monthAway.nextUnlock!.date, monthNow)).toBe(30);

    const today = getStoryView(fixturePackage(), {
      now: "2026-07-18T00:01:00-04:00",
    });
    expect(today.currentMode).toBe(StoryMode.IN_PROGRESS);
    expect(today.nextUnlock?.chapterId).toBe("chapter-2");
  });

  it("nextUnlock es null cuando ya no queda ningún capítulo bloqueado", () => {
    const view = getStoryView(fixturePackage(), {
      now: "2026-07-22",
      chapterStatuses: {
        "chapter-1": ChapterStatus.COMPLETED,
        "chapter-2": ChapterStatus.COMPLETED,
        "chapter-epilogue": ChapterStatus.COMPLETED,
      },
    });
    expect(view.nextUnlock).toBe(null);
  });
});
