import type { LivingStorySnapshot, NarrativeLivingContext } from "./livingContext";
import { availableResult, unavailableResult } from "./livingContextResult";
import type { ModuleResult } from "./types";

export interface NarrativeContextInput { tripBaseStoryId?: string | null; story?: LivingStorySnapshot | null; observedAt?: string | null }

export function resolveNarrativeContext(input: NarrativeContextInput, now: Date): ModuleResult<NarrativeLivingContext> {
  if (!input.story) return unavailableResult("missing_story");
  if (!input.tripBaseStoryId || input.story.baseStoryId !== input.tripBaseStoryId) return unavailableResult("story_mismatch", "story.package", "story");
  return availableResult("narrative", {
    baseStoryId: input.story.baseStoryId, storyId: input.story.package.storyId,
    storyMood: input.story.package.storyMood, baseCopy: input.story.package.baseCopy,
    currentChapter: input.story.view?.visibleChapter ?? null,
  }, "story", "story.package", input.observedAt, now);
}
