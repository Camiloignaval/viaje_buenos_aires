import { describe, expect, it } from "vitest";
import type { StoryPackage } from "@/features/story/engine/types";
import { resolveNarrativeContext } from "./narrativeContext";

const pkg = {
  storyId: "story-ba-2026", schemaVersion: "1.4",
  metadata: { destination: "Buenos Aires", title: "T", travelDates: { start: "2026-01-01", end: "2026-01-02" }, language: "es" },
  storyMood: { primary: "íntima" }, unlockRulesDefault: {}, chapters: [],
  baseCopy: { welcomeMessage: "Copy literal", dailyOpenTemplate: "Abrir", dailyCloseTemplate: "Cerrar" },
} satisfies StoryPackage;

describe("resolveNarrativeContext", () => {
  it("preserva literalmente baseStoryId, storyId, mood y copy", () => {
    const result = resolveNarrativeContext({ tripBaseStoryId: "ba-2026", story: { baseStoryId: "ba-2026", package: pkg }, observedAt: "2026-07-15T00:00:00Z" }, new Date("2026-07-15T00:01:00Z"));
    expect(result.value).toEqual({ baseStoryId: "ba-2026", storyId: "story-ba-2026", storyMood: pkg.storyMood, baseCopy: pkg.baseCopy, currentChapter: null });
  });

  it("rechaza un package cargado para otro baseStoryId", () => {
    expect(resolveNarrativeContext({ tripBaseStoryId: "rio-2027", story: { baseStoryId: "ba-2026", package: pkg } }, new Date())).toMatchObject({ status: "unavailable", reason: "story_mismatch" });
  });
});
