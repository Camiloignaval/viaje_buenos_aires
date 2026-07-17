import { describe, expect, it } from "vitest";
import { resolveStoryMediaUrl } from "./storyMedia";

describe("resolveStoryMediaUrl", () => {
  it("resuelve media namespaced sin fallback global", () => {
    expect(resolveStoryMediaUrl("content/stories/example/media/hero.jpg"))
      .toBe("/content/stories/example/media/hero.jpg");
    expect(resolveStoryMediaUrl(undefined)).toBeNull();
    expect(resolveStoryMediaUrl(" ")).toBeNull();
  });

  it("conserva URLs remotas", () => {
    expect(resolveStoryMediaUrl("https://cdn.example/hero.jpg")).toBe("https://cdn.example/hero.jpg");
  });
});
