import { describe, it, expect } from "vitest";
import { groupMemoriesByChapter } from "./albumGrouping";
import type { Memory } from "@/features/album/data/types";
import type { StoryPackage } from "@/features/story/engine/types";

const story = {
  chapters: [
    { id: "c1", order: 1, title: "Día 1" },
    { id: "c2", order: 2, title: "Día 2" },
  ],
} as unknown as StoryPackage;

function memory(partial: Partial<Memory>): Memory {
  return {
    id: "m",
    storyId: "s",
    chapterId: "c1",
    activityId: null,
    note: "",
    photos: [],
    videos: [],
    favorite: false,
    archived: false,
    createdAt: "2026-07-18T10:00:00Z",
    updatedAt: "2026-07-18T10:00:00Z",
    ...partial,
  };
}

describe("groupMemoriesByChapter", () => {
  it("agrupa por capítulo en orden narrativo, no por fecha de archivo", () => {
    const memories = [
      memory({ id: "b", chapterId: "c2", createdAt: "2026-07-19T09:00:00Z" }),
      memory({ id: "a", chapterId: "c1", createdAt: "2026-07-20T09:00:00Z" }),
    ];
    const groups = groupMemoriesByChapter(memories, story);
    expect(groups.map((g) => g.chapterId)).toEqual(["c1", "c2"]);
    expect(groups[0].title).toBe("Día 1");
  });

  it("elige una portada representativa: la primera foto en orden narrativo", () => {
    const memories = [
      memory({ id: "sin-foto", createdAt: "2026-07-18T08:00:00Z" }),
      memory({ id: "con-foto", photos: ["photo-1", "photo-2"], createdAt: "2026-07-18T09:00:00Z" }),
    ];
    const [group] = groupMemoriesByChapter(memories, story);
    expect(group.cover).toBe("photo-1");
  });

  it("devuelve cover null si el grupo no tiene fotos", () => {
    const [group] = groupMemoriesByChapter([memory({ id: "x" })], story);
    expect(group.cover).toBeNull();
  });

  it("resume recuerdos, lugares, favoritos y notas", () => {
    const memories = [
      memory({ id: "1", activityId: "act-1", favorite: true, note: "Prometimos volver." }),
      memory({ id: "2", activityId: "act-1" }),
      memory({ id: "3", activityId: "act-2", favorite: true }),
    ];
    const [group] = groupMemoriesByChapter(memories, story);
    expect(group.summary).toEqual({ memories: 3, places: 2, favorites: 2, withNotes: 1 });
  });

  it("excluye recuerdos archivados sin eliminarlos", () => {
    const groups = groupMemoriesByChapter([memory({ id: "a", archived: true })], story);
    expect(groups).toEqual([]);
  });

  it("los recuerdos de un capítulo desconocido quedan al final, nunca se pierden", () => {
    const memories = [
      memory({ id: "x", chapterId: "desconocido" }),
      memory({ id: "y", chapterId: "c1" }),
    ];
    const groups = groupMemoriesByChapter(memories, story);
    expect(groups[groups.length - 1].chapterId).toBe("desconocido");
    expect(groups).toHaveLength(2);
  });

  it("caso vacío", () => {
    expect(groupMemoriesByChapter([], story)).toEqual([]);
  });
});
