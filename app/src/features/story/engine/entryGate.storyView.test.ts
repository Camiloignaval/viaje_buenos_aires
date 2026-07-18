import { describe, it, expect } from "vitest";
import { getStoryView, StoryMode } from "./storyEngine";
import { getStoryProgress, ChapterStatus } from "./storyProgress";
import type { StoryPackage } from "./types";

// Reproducción del caso real: origen Santiago (dispositivo en UTC-4), destino
// Buenos Aires (UTC-3), inicio del viaje 2026-07-18T09:00 (hora de destino).
// La historia tiene el mismo unlockRulesDefault que story.json (localTime 07:00).
const TZ = "America/Argentina/Buenos_Aires";
function realLikePackage(): StoryPackage {
  return {
    storyId: "story-ba-2026",
    metadata: {
      destination: "Buenos Aires",
      title: "Buenos Aires, 2026",
      language: "es",
      travelDates: { start: "2026-07-18", end: "2026-07-21" },
      experienceTimezone: TZ,
    },
    unlockRulesDefault: {
      requiresDateReached: true,
      requiresPreviousChapterCompleted: true,
      localTime: "07:00",
    },
    chapters: [
      { id: "cap-1", order: 1, title: "Capítulo I", unlockRule: { requiresPreviousChapterCompleted: false } },
      { id: "cap-2", order: 2, title: "Capítulo II" },
    ],
  } as unknown as StoryPackage;
}

describe("Caso real — aeropuerto de Santiago, viaje ya iniciado", () => {
  it("antes del startDateTime: sigue PRE_TRIP (se ve 'Nos estamos acercando')", () => {
    // 08:00 en Santiago (UTC-4) = 12:00Z; el startDateTime es 09:00 BA = 12:00Z.
    // Un minuto antes: 07:59 Santiago = 11:59Z, aún no arranca.
    const ctx = { now: "2026-07-18T07:59:00-04:00", timezone: TZ, tripStartDateTime: "2026-07-18T09:00" };
    const view = getStoryView(realLikePackage(), ctx);
    expect(view.currentMode).toBe(StoryMode.PRE_TRIP);
    expect(getStoryProgress(realLikePackage(), ctx)["cap-1"]).toBe(ChapterStatus.LOCKED);
  });

  it("alcanzado el startDateTime desde Chile: el viaje se activa, Capítulo I visible, sin llegada", () => {
    // 08:00 en Santiago (UTC-4) = 12:00Z = 09:00 en Buenos Aires. El vuelo aún
    // no despega, pero el viaje ya empezó según trip.startDateTime.
    const ctx = { now: "2026-07-18T08:00:00-04:00", timezone: TZ, tripStartDateTime: "2026-07-18T09:00" };
    const view = getStoryView(realLikePackage(), ctx);

    // Ya NO es PRE_TRIP → "Nos estamos acercando al viaje" no se renderiza.
    expect(view.currentMode).toBe(StoryMode.IN_PROGRESS);
    // El Capítulo I es el capítulo visible y está disponible.
    expect(view.visibleChapter?.id).toBe("cap-1");
    expect(view.availableChapters).toContain("cap-1");
    // La llegada es un momento aparte: el engine no crea la clave de arribo.
    const progress = getStoryProgress(realLikePackage(), ctx);
    expect(progress["cap-1::arrival"]).toBeUndefined();
    // El Capítulo II sigue esperando su ritmo editorial.
    expect(progress["cap-2"]).toBe(ChapterStatus.LOCKED);
  });
});
