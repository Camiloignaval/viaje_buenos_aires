import { useEffect, useRef, useState } from "react";
import type { User } from "@/features/auth/types";
import type { StoryPackage } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import { getPushPreferences, type PushPreferences } from "@/features/pwa/pushApi";
import {
  composeFirstRealExperience,
  type FirstRealExperienceInput,
} from "../firstRealExperience";
import {
  observeVisibleExperience,
  toVisibleCompanionExperience,
  type VisibleCompanionExperienceViewModel,
  type VisibleExperienceObserver,
} from "../lib/visibleExperience";

export type FirstVisibleExperienceSource = Readonly<{
  trip: Trip;
  user: User | null;
  storyPackage: StoryPackage | null;
  storyObservedAt: string | null;
  observer?: VisibleExperienceObserver;
}>;

export type FirstVisibleExperienceState = Readonly<{
  status: "loading" | "settled";
  viewModel: VisibleCompanionExperienceViewModel | null;
  observer?: VisibleExperienceObserver;
}>;

type AuthorizedSource = FirstVisibleExperienceSource & Readonly<{
  user: User;
  storyPackage: StoryPackage;
  storyObservedAt: string;
}>;

function isAuthorizedSource(source: FirstVisibleExperienceSource): source is AuthorizedSource {
  return Boolean(
    source.user
    && source.storyPackage
    && source.storyObservedAt
    && source.trip.status === "active"
    && typeof source.trip.baseStoryId === "string",
  );
}

export function createFirstVisibleExperienceInput(
  source: AuthorizedSource,
  logicalInstant: string,
  preferences: PushPreferences,
): FirstRealExperienceInput {
  const { trip, user, storyPackage, storyObservedAt } = source;
  return {
    logicalInstant,
    livingContext: {
      trip,
      user: {
        preferredCurrency: user.preferredCurrency,
        residenceCountryCode: user.residenceCountryCode,
      },
      story: { baseStoryId: trip.baseStoryId as string, package: storyPackage },
      observedAt: { trip: trip.updatedAt, story: storyObservedAt },
    },
    decision: {
      tripId: trip.id,
      preferences: {
        enabled: preferences.enabled,
        beforeTrip: preferences.beforeTrip,
        duringTrip: preferences.duringTrip,
      },
      processedKeys: new Set<string>(),
      activities: [],
    },
    companion: {
      preferences: { enabled: preferences.enabled },
      processedKeys: new Set<string>(),
      history: [],
    },
    memory: {
      scope: { ownerUserId: user.id, tripId: trip.id, storyId: storyPackage.storyId },
      facts: { firstChapterAlreadyOpened: false },
    },
  };
}

function finalState(
  viewModel: VisibleCompanionExperienceViewModel | null,
  observer: VisibleExperienceObserver | undefined,
): FirstVisibleExperienceState {
  return Object.freeze({ status: "settled" as const, viewModel, observer });
}

export function useFirstVisibleExperience(
  source: FirstVisibleExperienceSource,
): FirstVisibleExperienceState {
  const [logicalInstant] = useState(() => new Date().toISOString());
  const [snapshot] = useState(() => source);
  const [observer] = useState(() => snapshot.observer);
  const authorized = isAuthorizedSource(snapshot);
  const runRef = useRef<Promise<VisibleCompanionExperienceViewModel | null> | null>(null);
  const [state, setState] = useState<FirstVisibleExperienceState>(() => (
    authorized
      ? Object.freeze({ status: "loading" as const, viewModel: null, observer })
      : finalState(null, observer)
  ));

  useEffect(() => {
    if (!authorized) {
      setState(finalState(null, observer));
      return;
    }
    if (!runRef.current) {
      observeVisibleExperience(observer, "flow_started");
      runRef.current = (async () => {
        try {
          const { preferences } = await getPushPreferences();
          const result = await composeFirstRealExperience(
            createFirstVisibleExperienceInput(snapshot, logicalInstant, preferences),
          );
          return toVisibleCompanionExperience(result, {
            surface: "active_trip_home",
            observer,
          });
        } catch {
          observeVisibleExperience(observer, "silence");
          return null;
        }
      })();
    }

    let active = true;
    void runRef.current.then((viewModel) => {
      if (active) setState(finalState(viewModel, observer));
    });

    return () => { active = false; };
  }, [
    authorized,
    logicalInstant,
    observer,
    snapshot,
  ]);

  return state;
}
