import { describe, expect, it } from "vitest";
import { heroImageForChapter } from "./chapterSummary";
import type { Chapter } from "@/features/story/engine/types";

describe("heroImageForChapter", () => {
  it("no supone cuatro capítulos ni inventa un fallback global", () => {
    expect(heroImageForChapter({ id: "c5", order: 5, title: "Cinco" } as Chapter)).toBeNull();
  });

  it("resuelve solamente la media declarada por el package", () => {
    const chapter = {
      id: "c5",
      order: 5,
      title: "Cinco",
      assets: { heroImage: "content/stories/example/media/day-5.jpg" },
    } as Chapter;
    expect(heroImageForChapter(chapter)).toBe("/content/stories/example/media/day-5.jpg");
  });
});
