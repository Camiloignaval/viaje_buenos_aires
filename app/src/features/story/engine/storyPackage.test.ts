import { describe, it, expect } from "vitest";
import { loadStoryPackage, StoryPackageValidationError } from "./storyPackage";

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
