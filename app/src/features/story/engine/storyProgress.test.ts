import { describe, it, expect } from "vitest";
import {
  calendarDaysBetween,
  countdownAnchorForCalendarDate,
  getStoryProgress,
  ChapterStatus,
} from "./storyProgress";
import type { StoryPackage } from "./types";

function twoChapterPackage(overrides: Record<string, unknown> = {}): StoryPackage {
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
    ...overrides,
  } as unknown as StoryPackage;
}

describe("getStoryProgress", () => {
  it("un capítulo permanece bloqueado si la fecha todavía no llegó", () => {
    const pkg = twoChapterPackage();
    const progress = getStoryProgress(pkg, { now: "2026-07-17" });
    expect(progress["chapter-1"]).toBe(ChapterStatus.LOCKED);
  });

  it("trata hoy como el día del viaje aunque la hora sea temprano o tarde", () => {
    const pkg = twoChapterPackage();

    expect(getStoryProgress(pkg, { now: "2026-07-18T00:01:00-04:00" })["chapter-1"]).toBe(
      ChapterStatus.AVAILABLE,
    );
    expect(getStoryProgress(pkg, { now: "2026-07-18T23:59:00-04:00" })["chapter-1"]).toBe(
      ChapterStatus.AVAILABLE,
    );
  });

  it("trata mañana como 1 día calendario pendiente", () => {
    expect(calendarDaysBetween("2026-07-17T23:59:00-04:00", "2026-07-18")).toBe(1);
  });

  it("calcula 8 y 30 días como calendario percibido", () => {
    expect(calendarDaysBetween("2026-07-10T23:59:00-04:00", "2026-07-18")).toBe(8);
    expect(calendarDaysBetween("2026-07-10T00:01:00-04:00", "2026-08-09")).toBe(30);
  });

  it("un capítulo pasa a disponible cuando la fecha llega y el anterior está finalizado", () => {
    const pkg = twoChapterPackage();
    const progress = getStoryProgress(pkg, {
      now: "2026-07-19",
      chapterStatuses: { "chapter-1": ChapterStatus.COMPLETED },
    });
    expect(progress["chapter-2"]).toBe(ChapterStatus.AVAILABLE);
  });

  it("un capítulo permanece bloqueado si la fecha llegó pero el anterior no está finalizado", () => {
    const pkg = twoChapterPackage();
    const progress = getStoryProgress(pkg, { now: "2026-07-19" });
    expect(progress["chapter-2"]).toBe(ChapterStatus.LOCKED);
  });

  it("un capítulo Started nunca vuelve a Locked ni a Available", () => {
    const pkg = twoChapterPackage();
    const progress = getStoryProgress(pkg, {
      now: "2026-07-10",
      chapterStatuses: { "chapter-1": ChapterStatus.STARTED },
    });
    expect(progress["chapter-1"]).toBe(ChapterStatus.STARTED);
  });

  it("mantiene disponible un viaje iniciado aunque todavía haya capítulos futuros bloqueados", () => {
    const pkg = twoChapterPackage();
    const progress = getStoryProgress(pkg, {
      now: "2026-07-18T12:00:00-04:00",
    });
    expect(progress["chapter-1"]).toBe(ChapterStatus.AVAILABLE);
    expect(progress["chapter-2"]).toBe(ChapterStatus.LOCKED);
  });

  it("permite representar un viaje terminado con todos los capítulos completos", () => {
    const pkg = twoChapterPackage();
    const progress = getStoryProgress(pkg, {
      now: "2026-07-20T12:00:00-04:00",
      chapterStatuses: {
        "chapter-1": ChapterStatus.COMPLETED,
        "chapter-2": ChapterStatus.COMPLETED,
      },
    });
    expect(progress["chapter-1"]).toBe(ChapterStatus.COMPLETED);
    expect(progress["chapter-2"]).toBe(ChapterStatus.COMPLETED);
  });

  it("ignora diferencias UTC/local cuando el string trae timezone explícito", () => {
    const pkg = twoChapterPackage();

    expect(getStoryProgress(pkg, { now: "2026-07-18T00:15:00+14:00" })["chapter-1"]).toBe(
      ChapterStatus.AVAILABLE,
    );
    expect(getStoryProgress(pkg, { now: "2026-07-17T23:45:00-10:00" })["chapter-1"]).toBe(
      ChapterStatus.LOCKED,
    );
  });

  it("el anchor del contador devuelve días calendario exactos, no horas restantes", () => {
    const now = "2026-07-10T20:00:00-04:00";
    const anchor = countdownAnchorForCalendarDate("2026-07-18", now);
    const days = Math.ceil((anchor.getTime() - new Date(now).getTime()) / (24 * 60 * 60 * 1000));
    expect(days).toBe(8);
  });

  it("el capítulo especial se desbloquea contra su propia date, no contra travelDates.end", () => {
    const pkg = twoChapterPackage({
      specialChapter: {
        id: "chapter-epilogue",
        order: 3,
        title: "Epílogo",
        date: "2026-07-22",
      },
    });

    const stillLocked = getStoryProgress(pkg, {
      now: "2026-07-20",
      chapterStatuses: {
        "chapter-1": ChapterStatus.COMPLETED,
        "chapter-2": ChapterStatus.COMPLETED,
      },
    });
    expect(stillLocked["chapter-epilogue"]).toBe(ChapterStatus.LOCKED);

    const available = getStoryProgress(pkg, {
      now: "2026-07-22",
      chapterStatuses: {
        "chapter-1": ChapterStatus.COMPLETED,
        "chapter-2": ChapterStatus.COMPLETED,
      },
    });
    expect(available["chapter-epilogue"]).toBe(ChapterStatus.AVAILABLE);
  });

  it("el capítulo especial permanece bloqueado si el último regular no está finalizado, aunque llegue su fecha", () => {
    const pkg = twoChapterPackage({
      specialChapter: {
        id: "chapter-epilogue",
        order: 3,
        title: "Epílogo",
        date: "2026-07-22",
      },
    });
    const progress = getStoryProgress(pkg, {
      now: "2026-07-22",
      chapterStatuses: { "chapter-1": ChapterStatus.COMPLETED },
    });
    expect(progress["chapter-epilogue"]).toBe(ChapterStatus.LOCKED);
  });
});
