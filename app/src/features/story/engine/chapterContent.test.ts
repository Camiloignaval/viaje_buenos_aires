import { describe, it, expect } from "vitest";
import {
  getPlaceById,
  getUnreferencedRelatedPlaces,
  getChapterPhotoSpots,
  getChapterCollectionItems,
  resolveChapterContent,
} from "./chapterContent";
import type { Chapter, StoryPackage } from "./types";

function fixturePackage(): StoryPackage {
  return {
    placesCatalog: {
      restaurants: [
        { id: "rest-1", name: "Restaurante de prueba", relatedChapterId: "chapter-1" },
      ],
      cafes: [{ id: "cafe-1", name: "Café de prueba" }],
    },
    photoSpots: [
      { id: "spot-1", title: "Spot 1", relatedChapterId: "chapter-1" },
      { id: "spot-2", title: "Spot 2", relatedChapterId: "chapter-2" },
    ],
    collections: [
      {
        id: "col-1",
        title: "Colección de prueba",
        items: [
          { id: "item-1", name: "Ítem 1", relatedChapterId: "chapter-1" },
          { id: "item-2", name: "Ítem 2", relatedChapterId: "chapter-2" },
        ],
      },
    ],
  } as unknown as StoryPackage;
}

const chapter1: Chapter = {
  id: "chapter-1",
  order: 1,
  title: "",
  activities: [{ id: "act-1", title: "Actividad", relatedPlaceId: "cafe-1" }],
};

describe("chapterContent", () => {
  it("getPlaceById encuentra un lugar en restaurantes o cafeterías", () => {
    const pkg = fixturePackage();
    expect(getPlaceById(pkg, "cafe-1")?.name).toBe("Café de prueba");
    expect(getPlaceById(pkg, "rest-1")?.name).toBe("Restaurante de prueba");
  });

  it("getPlaceById devuelve null si no existe", () => {
    expect(getPlaceById(fixturePackage(), "no-existe")).toBe(null);
  });

  it("getPlaceById no rompe si no hay placesCatalog", () => {
    expect(getPlaceById({} as StoryPackage, "cafe-1")).toBe(null);
  });

  it("getUnreferencedRelatedPlaces devuelve solo lugares no referenciados", () => {
    const pkg = fixturePackage();
    const result = getUnreferencedRelatedPlaces(pkg, chapter1, new Set(["cafe-1"]));
    expect(result.map((p) => p.id)).toEqual(["rest-1"]);
  });

  it("getChapterPhotoSpots filtra por relatedChapterId", () => {
    const pkg = fixturePackage();
    expect(getChapterPhotoSpots(pkg, chapter1).map((s) => s.id)).toEqual(["spot-1"]);
  });

  it("getChapterCollectionItems filtra por relatedChapterId entre todas las colecciones", () => {
    const pkg = fixturePackage();
    expect(getChapterCollectionItems(pkg, chapter1).map((i) => i.id)).toEqual([
      "item-1",
    ]);
  });

  it("resolveChapterContent no rompe sin placesCatalog, photoSpots ni collections", () => {
    const content = resolveChapterContent({} as StoryPackage, chapter1);
    expect(content.relatedPlaces).toEqual([]);
    expect(content.photoSpots).toEqual([]);
    expect(content.collectionItems).toEqual([]);
    expect(content.activitiesWithPlaces[0].place).toBe(null);
  });

  it("resolveChapterContent une actividad con su lugar y separa el no referenciado", () => {
    const pkg = fixturePackage();
    const content = resolveChapterContent(pkg, chapter1);
    expect(content.activitiesWithPlaces[0].place?.id).toBe("cafe-1");
    expect(content.relatedPlaces.map((p) => p.id)).toEqual(["rest-1"]);
  });

  it("resolveChapterContent agrupa los recuerdos sugeridos por actividad", () => {
    const chapterWithMemories: Chapter = {
      id: "chapter-1",
      order: 1,
      title: "",
      activities: [
        { id: "act-1", title: "Actividad 1" },
        { id: "act-2", title: "Actividad 2" },
      ],
      suggestedMemories: [
        { id: "mem-1", relatedActivityId: "act-1", type: "photo", prompt: "Prompt 1" },
        { id: "mem-2", relatedActivityId: "act-1", type: "video", prompt: "Prompt 2" },
        { id: "mem-3", relatedActivityId: null, type: "photo", prompt: "Prompt sin actividad" },
        { id: "mem-4", relatedActivityId: "act-no-existe", type: "photo", prompt: "Prompt huérfano" },
      ],
    };
    const content = resolveChapterContent({} as StoryPackage, chapterWithMemories);
    const act1 = content.activitiesWithPlaces.find((a) => a.activity.id === "act-1");
    const act2 = content.activitiesWithPlaces.find((a) => a.activity.id === "act-2");
    expect(act1?.suggestedMemories.map((m) => m.id)).toEqual(["mem-1", "mem-2"]);
    expect(act2?.suggestedMemories).toEqual([]);
    expect(content.unassignedSuggestedMemories.map((m) => m.id)).toEqual([
      "mem-3",
      "mem-4",
    ]);
  });
});
