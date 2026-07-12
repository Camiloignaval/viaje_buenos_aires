import { describe, it, expect } from "vitest";
import { mergeChapterStatuses, mergeMemories } from "./syncMerge";
import type { Memory } from "@/features/album/data/types";

/** Los fixtures usan Memorias mínimas (el merge solo mira id/updatedAt/createdAt). */
function mem(partial: Partial<Memory>): Memory {
  return partial as Memory;
}

describe("mergeChapterStatuses", () => {
  it("un capítulo solo de un lado se conserva tal cual", () => {
    expect(mergeChapterStatuses({ "chapter-1": "available" }, {})).toEqual({
      "chapter-1": "available",
    });
  });

  it("ante conflicto, gana el estado más avanzado (nunca retrocede)", () => {
    expect(
      mergeChapterStatuses({ "chapter-1": "completed" }, { "chapter-1": "started" }),
    ).toEqual({ "chapter-1": "completed" });
    expect(
      mergeChapterStatuses({ "chapter-1": "available" }, { "chapter-1": "completed" }),
    ).toEqual({ "chapter-1": "completed" });
  });

  it("capítulos de ambos lados se combinan todos", () => {
    expect(
      mergeChapterStatuses({ "chapter-1": "completed" }, { "chapter-2": "available" }),
    ).toEqual({ "chapter-1": "completed", "chapter-2": "available" });
  });
});

describe("mergeMemories", () => {
  it("una Memoria que solo existe de un lado se conserva", () => {
    const local = [mem({ id: "mem-1", note: "Local.", createdAt: "2027-01-10T09:00:00Z" })];
    expect(mergeMemories(local, [])).toEqual(local);
  });

  it("ante el mismo id en ambos lados, gana la más reciente por updatedAt", () => {
    const local = [mem({ id: "mem-1", note: "Vieja.", favorite: false, createdAt: "2027-01-10T09:00:00Z", updatedAt: "2027-01-10T09:00:00Z" })];
    const remote = [mem({ id: "mem-1", note: "Vieja.", favorite: true, createdAt: "2027-01-10T09:00:00Z", updatedAt: "2027-01-10T10:00:00Z" })];
    const merged = mergeMemories(local, remote);
    expect(merged.length).toBe(1);
    expect(merged[0].favorite).toBe(true);
  });

  it("sin updatedAt, usa createdAt como respaldo", () => {
    const local = [mem({ id: "mem-1", note: "A.", createdAt: "2027-01-10T09:00:00Z" })];
    const remote = [mem({ id: "mem-1", note: "B.", createdAt: "2027-01-10T10:00:00Z" })];
    expect(mergeMemories(local, remote)[0].note).toBe("B.");
  });

  it("Memorias con ids distintos de ambos lados se combinan todas", () => {
    const local = [mem({ id: "mem-1", note: "Local.", createdAt: "2027-01-10T09:00:00Z" })];
    const remote = [mem({ id: "mem-2", note: "Remota.", createdAt: "2027-01-10T09:00:00Z" })];
    expect(mergeMemories(local, remote).length).toBe(2);
  });
});
