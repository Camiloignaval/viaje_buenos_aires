import { describe, it, expect } from "vitest";
import { loadStoryPackage, StoryPackageValidationError } from "./storyPackage";
import realStory from "@/story/data/story-ba2026.json";

function minimalPackage(overrides: Record<string, unknown> = {}) {
  return {
    storyId: "story-test-001",
    schemaVersion: "1.4",
    metadata: {
      destination: "Ciudad Ejemplo",
      title: "Un viaje",
      travelDates: { start: "2027-01-01", end: "2027-01-03" },
      language: "es",
    },
    storyMood: { primary: "adventure" },
    unlockRulesDefault: {
      requiresDateReached: true,
      requiresPreviousChapterCompleted: true,
    },
    chapters: [{ id: "chapter-1", order: 1, title: "Día 1" }],
    baseCopy: {
      welcomeMessage: "Bienvenida",
      dailyOpenTemplate: "Abrir",
      dailyCloseTemplate: "Cerrar",
    },
    ...overrides,
  };
}

describe("loadStoryPackage", () => {
  it("acepta un Story Package simulado con la forma mínima", () => {
    const pkg = loadStoryPackage(minimalPackage());
    expect(pkg.storyId).toBe("story-test-001");
  });

  it("rechaza un Story Package sin storyId", () => {
    const { storyId: _storyId, ...withoutStoryId } = minimalPackage();
    expect(() => loadStoryPackage(withoutStoryId)).toThrow(
      StoryPackageValidationError,
    );
  });

  it("rechaza metadata sin travelDates.end", () => {
    const pkg = minimalPackage();
    delete (pkg.metadata.travelDates as { end?: string }).end;
    expect(() => loadStoryPackage(pkg)).toThrow(StoryPackageValidationError);
  });

  it("rechaza storyMood sin primary", () => {
    const pkg = minimalPackage({ storyMood: {} });
    expect(() => loadStoryPackage(pkg)).toThrow(StoryPackageValidationError);
  });

  it("rechaza chapters vacío", () => {
    const pkg = minimalPackage({ chapters: [] });
    expect(() => loadStoryPackage(pkg)).toThrow(StoryPackageValidationError);
  });

  it("rechaza un capítulo sin order", () => {
    const pkg = minimalPackage({ chapters: [{ id: "chapter-1", title: "Día 1" }] });
    expect(() => loadStoryPackage(pkg)).toThrow(StoryPackageValidationError);
  });

  it("acepta un specialChapter con la forma completa", () => {
    const pkg = minimalPackage({
      specialChapter: {
        id: "chapter-epilogue",
        order: 2,
        title: "Epílogo",
        date: "2027-01-10",
        kind: "epilogue",
        breaksNarrativeRules: {
          hasSchedule: false,
          hasMap: false,
          hasItinerary: false,
        },
        prompts: [],
      },
    });
    expect(loadStoryPackage(pkg).specialChapter?.kind).toBe("epilogue");
  });

  it("rechaza un specialChapter sin date", () => {
    const pkg = minimalPackage({
      specialChapter: {
        id: "chapter-epilogue",
        order: 2,
        title: "Epílogo",
        kind: "epilogue",
        breaksNarrativeRules: {
          hasSchedule: false,
          hasMap: false,
          hasItinerary: false,
        },
        prompts: [],
      },
    });
    expect(() => loadStoryPackage(pkg)).toThrow(StoryPackageValidationError);
  });
});

describe("adaptive Story evidence", () => {
  it("curates only the five evidence-backed activities with exact structured metadata", () => {
    const pkg = loadStoryPackage(realStory);
    const curated = pkg.chapters.flatMap((chapter) => chapter.activities ?? [])
      .filter((activity) => activity.contextWindow);

    expect(curated.map(({ id }) => id)).toEqual(["act-1-3", "act-2-2", "act-2-6", "act-2-8", "act-3-5"]);
    expect(curated).toHaveLength(5);
    for (const activity of curated) {
      expect(Object.keys(activity.intelligence ?? {}).sort()).toEqual(["indoor", "outdoor", "photoMoment", "rainFriendly"]);
      expect(Object.keys(activity.contextWindow ?? {}).sort()).toEqual(["timezone", "validFrom", "validUntil"]);
    }
    expect(pkg.chapters.flatMap((chapter) => chapter.activities ?? [])).toHaveLength(28);
  });
});

describe("Buenos Aires Signature Story package", () => {
  it("keeps ARS as the only authored currency and uses supported memory prompts", () => {
    const pkg = loadStoryPackage(realStory);
    const serialized = JSON.stringify(pkg);

    expect(pkg.budget).toEqual({ currency: "ARS" });
    expect(serialized).not.toMatch(/\bCLP\b/);
    expect(pkg.chapters.flatMap((chapter) => chapter.suggestedMemories ?? []).map(({ type }) => type))
      .not.toContain("video");
    expect(serialized).not.toContain("resurfaceOnAnniversary");
  });

  it("aligns curated photo copy with the activity windows", () => {
    const pkg = loadStoryPackage(realStory);
    const activities = new Map(pkg.chapters.flatMap((chapter) => chapter.activities ?? []).map((activity) => [activity.id, activity]));
    const spots = new Map((pkg.photoSpots ?? []).map((spot) => [spot.id, spot]));

    expect(activities.get("act-1-3")).toMatchObject({ timeWindow: "17:00", contextWindow: { validFrom: "2026-07-18T19:45:00.000Z", validUntil: "2026-07-18T21:30:00.000Z" } });
    expect(activities.get("act-2-6")).toMatchObject({ timeWindow: "15:00–17:45", contextWindow: { validUntil: "2026-07-19T21:00:00.000Z" } });
    expect(activities.get("act-2-8")).toMatchObject({ title: "Caminata nocturna en Puerto Madero", timeWindow: "20:00–20:30", contextWindow: { validUntil: "2026-07-19T23:45:00.000Z" } });
    expect(spots.get("spot-caminito")?.bestTime).toBe("13:00, buscando una esquina tranquila");
    expect(spots.get("spot-puente-mujer")?.bestTime).toBe("20:15, de noche");
  });
});
