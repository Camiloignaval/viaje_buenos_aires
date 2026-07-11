import { describe, it, expect } from "vitest";
import {
  progressKey,
  loadProgress,
  saveProgress,
  markChapterStarted,
  markChapterCompleted,
} from "./progressStore";
import type { KeyValueStorage } from "./progressStore";
import { ChapterStatus } from "./storyProgress";

function fakeStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("progressStore", () => {
  it("progressKey namespacea por storyId", () => {
    expect(progressKey("story-a")).toBe("aurora:progress:story-a");
    expect(progressKey("story-a")).not.toBe(progressKey("story-b"));
  });

  it("loadProgress devuelve {} si no hay nada guardado", () => {
    expect(loadProgress("story-a", fakeStorage())).toEqual({});
  });

  it("saveProgress + loadProgress hacen round-trip", () => {
    const storage = fakeStorage();
    saveProgress("story-a", { "chapter-1": ChapterStatus.STARTED }, storage);
    expect(loadProgress("story-a", storage)).toEqual({
      "chapter-1": ChapterStatus.STARTED,
    });
  });

  it("loadProgress tolera JSON corrupto y devuelve {}", () => {
    const storage = fakeStorage();
    storage.setItem(progressKey("story-a"), "{ esto no es json");
    expect(loadProgress("story-a", storage)).toEqual({});
  });

  it("markChapterStarted guarda started", () => {
    const storage = fakeStorage();
    const updated = markChapterStarted("story-a", "chapter-1", storage);
    expect(updated["chapter-1"]).toBe(ChapterStatus.STARTED);
    expect(loadProgress("story-a", storage)).toEqual({
      "chapter-1": ChapterStatus.STARTED,
    });
  });

  it("markChapterStarted no degrada un capítulo ya completed", () => {
    const storage = fakeStorage();
    markChapterCompleted("story-a", "chapter-1", storage);
    const updated = markChapterStarted("story-a", "chapter-1", storage);
    expect(updated["chapter-1"]).toBe(ChapterStatus.COMPLETED);
  });

  it("markChapterCompleted se permite aunque nunca haya pasado por started", () => {
    const storage = fakeStorage();
    const updated = markChapterCompleted("story-a", "chapter-1", storage);
    expect(updated["chapter-1"]).toBe(ChapterStatus.COMPLETED);
  });

  it("Épica 2: si el storage no acepta escrituras, saveProgress no rompe", () => {
    const storage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => markChapterStarted("story-a", "chapter-1", storage)).not.toThrow();
  });

  it("dos storyId distintos no se pisan entre sí", () => {
    const storage = fakeStorage();
    markChapterStarted("story-a", "chapter-1", storage);
    markChapterCompleted("story-b", "chapter-1", storage);
    expect(loadProgress("story-a", storage)["chapter-1"]).toBe(
      ChapterStatus.STARTED,
    );
    expect(loadProgress("story-b", storage)["chapter-1"]).toBe(
      ChapterStatus.COMPLETED,
    );
  });
});
