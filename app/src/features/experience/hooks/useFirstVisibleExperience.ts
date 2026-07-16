import { useEffect, useRef, useState } from "react";
import type { User } from "@/features/auth/types";
import type { StoryPackage } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import { acceptMemoryCandidate, type MemoryCandidate } from "@/features/context-engine/memory";
import { getPushPreferences, type PushPreferences } from "@/features/pwa/pushApi";
import { persistSemanticMemory } from "../api/semanticMemoryApi";
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
import {
  createPendingVisibleDeliveryReceipt,
  readVisibleDeliverySession,
  toVisibleDeliveryCompanionSnapshot,
  transitionVisibleDeliveryReceipt,
  writeVisibleDeliverySession,
  type DeliveryReceiptState,
  type DeliveryReceiptV1,
  type DeliverySessionDocumentV1,
  type VisibleDeliveryCompanionSnapshot,
  type VisibleDeliveryScope,
  type VisibleDeliveryStorage,
} from "../lib/visibleDeliverySession";

const browserSessionStorage: VisibleDeliveryStorage = Object.freeze({
  getStorage: () => window.sessionStorage,
});

export type FirstVisibleExperienceSource = Readonly<{
  trip: Trip;
  user: User | null;
  storyPackage: StoryPackage | null;
  storyObservedAt: string | null;
  observer?: VisibleExperienceObserver;
  storage?: VisibleDeliveryStorage;
}>;

export type FirstVisibleExperienceState = Readonly<{
  status: "loading" | "settled";
  viewModel: VisibleCompanionExperienceViewModel | null;
  observer?: VisibleExperienceObserver;
  onVisible?: () => boolean;
  onDismiss?: () => boolean;
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
  delivery?: VisibleDeliveryCompanionSnapshot,
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
      processedKeys: new Set(delivery?.decisionProcessedKeys ?? []),
      activities: [],
    },
    companion: {
      preferences: { enabled: preferences.enabled },
      processedKeys: new Set(delivery?.companionProcessedKeys ?? []),
      history: delivery?.history.map((entry) => Object.freeze({ ...entry })) ?? [],
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
  callbacks?: Readonly<{ onVisible: () => boolean; onDismiss: () => boolean }>,
): FirstVisibleExperienceState {
  return Object.freeze({ status: "settled" as const, viewModel, observer, ...callbacks });
}

function withReceipt(
  document: DeliverySessionDocumentV1,
  receipt: DeliveryReceiptV1,
): DeliverySessionDocumentV1 {
  const index = document.receipts.findIndex(({ identity }) => identity === receipt.identity);
  const receipts = index < 0
    ? [...document.receipts, receipt]
    : document.receipts.map((current, currentIndex) => currentIndex === index ? receipt : current);
  return Object.freeze({ version: 1 as const, receipts: Object.freeze(receipts) });
}

function createReceiptCallbacks(input: Readonly<{
  document: DeliverySessionDocumentV1;
  receipt: DeliveryReceiptV1;
  scope: VisibleDeliveryScope;
  storage: VisibleDeliveryStorage;
  observer: VisibleExperienceObserver | undefined;
  memory?: Readonly<{ tripId: string; candidate: MemoryCandidate }>;
}>): Readonly<{ onVisible: () => boolean; onDismiss: () => boolean }> {
  let document = input.document;
  let receipt = input.receipt;
  let persistenceStarted = false;

  const move = (target: DeliveryReceiptState): boolean => {
    const transition = transitionVisibleDeliveryReceipt(receipt, target, new Date().toISOString());
    if (transition.status !== "transitioned") {
      observeVisibleExperience(input.observer, "contextual_silence");
      return false;
    }
    const nextDocument = withReceipt(document, transition.receipt);
    const write = writeVisibleDeliverySession({
      dependencies: input.storage,
      scope: input.scope,
      document: nextDocument,
    });
    if (write.status !== "available") {
      observeVisibleExperience(input.observer, "contextual_silence");
      return false;
    }
    receipt = transition.receipt;
    document = nextDocument;
    if (receipt.state === "expired") {
      observeVisibleExperience(input.observer, "delivery_expired");
      return false;
    }
    return receipt.state === target;
  };

  return Object.freeze({
    onVisible: () => {
      const visible = move("visible");
      if (visible && input.memory && !persistenceStarted) {
        persistenceStarted = true;
        try {
          const accepted = acceptMemoryCandidate(input.memory.candidate);
          void persistSemanticMemory({ tripId: input.memory.tripId, accepted })
            .then(() => observeVisibleExperience(input.observer, "memory_persisted"))
            .catch(() => observeVisibleExperience(input.observer, "contextual_silence"));
        } catch {
          observeVisibleExperience(input.observer, "contextual_silence");
        }
      }
      return visible;
    },
    onDismiss: () => move("dismissed"),
  });
}

export function useFirstVisibleExperience(
  source: FirstVisibleExperienceSource,
): FirstVisibleExperienceState {
  const [logicalInstant] = useState(() => new Date().toISOString());
  const [snapshot] = useState(() => source);
  const [observer] = useState(() => snapshot.observer);
  const authorized = isAuthorizedSource(snapshot);
  const runRef = useRef<Promise<FirstVisibleExperienceState> | null>(null);
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
      observeVisibleExperience(observer, "adaptive_flow_started");
      runRef.current = (async () => {
        try {
          const storage = snapshot.storage ?? browserSessionStorage;
          const scope = Object.freeze({ userId: snapshot.user.id, tripId: snapshot.trip.id });
          const stored = readVisibleDeliverySession({
            dependencies: storage,
            scope,
            now: logicalInstant,
          });
          if (stored.status !== "available") {
            observeVisibleExperience(observer, "contextual_silence");
            return finalState(null, observer);
          }
          if (stored.document.receipts.some(({ state }) => state === "expired")) {
            observeVisibleExperience(observer, "delivery_expired");
          }
          const delivery = toVisibleDeliveryCompanionSnapshot(stored.document);
          const { preferences } = await getPushPreferences();
          const result = await composeFirstRealExperience(
            createFirstVisibleExperienceInput(snapshot, logicalInstant, preferences, delivery),
          );
          const viewModel = toVisibleCompanionExperience(result, {
            surface: "active_trip_home",
            observer,
          });
          if (!viewModel || result.outcome !== "composed") return finalState(null, observer);
          const intent = result.deliveryIntents[0];
          const receipt = createPendingVisibleDeliveryReceipt({
            scope,
            actionId: result.action.actionId,
            destination: "in_app",
            references: intent.references,
            dedupeKey: result.decisionRun.selected.dedupeKey,
            priority: result.decisionRun.selected.priority,
            pendingAt: logicalInstant,
            expiryBoundaries: [
              result.decisionRun.selected.window.validUntil,
              result.decisionRun.selected.window.expiresAt,
              ...(typeof snapshot.trip.endDateTime === "string" ? [snapshot.trip.endDateTime] : []),
            ],
          });
          if (!receipt) {
            observeVisibleExperience(observer, "contextual_silence");
            return finalState(null, observer);
          }
          const document = withReceipt(stored.document, receipt);
          const write = writeVisibleDeliverySession({ dependencies: storage, scope, document });
          if (write.status !== "available") {
            observeVisibleExperience(observer, "contextual_silence");
            return finalState(null, observer);
          }
          return finalState(viewModel, observer, createReceiptCallbacks({
            document,
            receipt,
            scope,
            storage,
            observer,
            memory: result.memoryCandidate.type === "trip_started"
              ? { tripId: snapshot.trip.id, candidate: result.memoryCandidate }
              : undefined,
          }));
        } catch {
          observeVisibleExperience(observer, "contextual_silence");
          return finalState(null, observer);
        }
      })();
    }

    let active = true;
    void runRef.current.then((settled) => {
      if (active) setState(settled);
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
