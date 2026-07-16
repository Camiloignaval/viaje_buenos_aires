import { useMemo, useRef } from "react";
import type { User } from "@/features/auth/types";
import type { LivingFinancialSnapshot, LivingTravelContext } from "@/features/context-engine/livingContext";
import { useLivingContext } from "@/features/context-engine/useLivingContext";
import type { NormalizedActivityCandidate } from "@/features/context-engine/decision";
import type { StoryPackage, StoryView } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import { adaptStoryActivity } from "../lib/adaptiveJourney";

export type AdaptiveJourneySource = Readonly<{
  trip: Trip;
  user: User;
  storyPackage: StoryPackage;
  storyObservedAt: string | null;
  storyView?: StoryView | null;
  financial?: LivingFinancialSnapshot | null;
}>;

export type AdaptiveJourneyPreparation = Readonly<{
  logicalInstant: string;
  livingContext: LivingTravelContext;
  activities: readonly NormalizedActivityCandidate[];
}>;

export type AdaptiveJourneyDependencies = Readonly<{ now?: () => Date }>;

export function collectAdaptiveJourneyActivities(storyPackage: StoryPackage): readonly NormalizedActivityCandidate[] {
  const candidates = storyPackage.chapters.flatMap((chapter) => chapter.activities ?? [])
    .flatMap((activity) => {
      const adapted = adaptStoryActivity(activity);
      return adapted ? [adapted.candidate] : [];
    });
  return Object.freeze(candidates);
}

export function useAdaptiveJourney(
  source: AdaptiveJourneySource,
  dependencies: AdaptiveJourneyDependencies = {},
): AdaptiveJourneyPreparation {
  const scopeIdentity = `${source.user.id}\u001f${source.trip.id}\u001f${source.storyPackage.storyId}`;
  const scope = useRef<Readonly<{ identity: string; logicalInstant: string }> | null>(null);
  if (!scope.current || scope.current.identity !== scopeIdentity) {
    const instant = (dependencies.now ?? (() => new Date()))();
    scope.current = Object.freeze({ identity: scopeIdentity, logicalInstant: instant.toISOString() });
  }
  const logicalInstant = scope.current.logicalInstant;
  const activities = useMemo(
    () => collectAdaptiveJourneyActivities(source.storyPackage),
    [source.storyPackage],
  );
  const livingContext = useLivingContext({
    trip: source.trip,
    user: {
      preferredCurrency: source.user.preferredCurrency,
      residenceCountryCode: source.user.residenceCountryCode,
    },
    story: typeof source.trip.baseStoryId === "string"
      ? { baseStoryId: source.trip.baseStoryId, package: source.storyPackage, view: source.storyView }
      : null,
    financial: source.financial,
    observedAt: { trip: source.trip.updatedAt, story: source.storyObservedAt },
    now: new Date(logicalInstant),
  });

  return Object.freeze({ logicalInstant, livingContext, activities });
}
