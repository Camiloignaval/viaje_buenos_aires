import { useEffect, useRef, useState } from "react";
import type { User } from "@/features/auth/types";
import { acceptMemoryCandidate } from "@/features/context-engine/memory";
import type { StoryPackage, StoryView } from "@/features/story/engine/types";
import type { Trip } from "@/features/trips/types";
import { getPushPreferences } from "@/features/pwa/pushApi";
import { persistSemanticMemory } from "../api/semanticMemoryApi";
import { composeFirstRealExperience } from "../firstRealExperience";
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
  type VisibleDeliveryScope,
  type VisibleDeliveryStorage,
} from "../lib/visibleDeliverySession";
import { useAdaptiveJourney } from "./useAdaptiveJourney";

const browserSessionStorage: VisibleDeliveryStorage = Object.freeze({ getStorage: () => window.sessionStorage });

export type ProductiveAdaptiveJourneySource = Readonly<{
  trip: Trip;
  user: User;
  storyPackage: StoryPackage;
  storyObservedAt: string | null;
  storyView?: StoryView | null;
  observer?: VisibleExperienceObserver;
  storage?: VisibleDeliveryStorage;
}>;

export type ProductiveAdaptiveJourneyState = Readonly<{
  status: "loading" | "settled";
  viewModel: VisibleCompanionExperienceViewModel | null;
  observer?: VisibleExperienceObserver;
  onVisible?: () => boolean;
  onDismiss?: () => boolean;
}>;

function withReceipt(document: DeliverySessionDocumentV1, receipt: DeliveryReceiptV1): DeliverySessionDocumentV1 {
  const existing = document.receipts.findIndex(({ identity }) => identity === receipt.identity);
  const receipts = existing < 0
    ? [...document.receipts, receipt]
    : document.receipts.map((item, index) => index === existing ? receipt : item);
  return Object.freeze({ version: 1 as const, receipts: Object.freeze(receipts) });
}

function callbacks(input: Readonly<{
  document: DeliverySessionDocumentV1;
  receipt: DeliveryReceiptV1;
  scope: VisibleDeliveryScope;
  storage: VisibleDeliveryStorage;
  observer?: VisibleExperienceObserver;
}>): Readonly<{ onVisible: () => boolean; onDismiss: () => boolean }> {
  let document = input.document;
  let receipt = input.receipt;
  const move = (target: DeliveryReceiptState) => {
    const transition = transitionVisibleDeliveryReceipt(receipt, target, new Date().toISOString());
    if (transition.status !== "transitioned") {
      observeVisibleExperience(input.observer, "contextual_silence");
      return false;
    }
    const next = withReceipt(document, transition.receipt);
    const written = writeVisibleDeliverySession({ dependencies: input.storage, scope: input.scope, document: next });
    if (written.status !== "available") {
      observeVisibleExperience(input.observer, "contextual_silence");
      return false;
    }
    document = next;
    receipt = transition.receipt;
    if (receipt.state === "expired") {
      observeVisibleExperience(input.observer, "delivery_expired");
      return false;
    }
    return receipt.state === target;
  };
  return Object.freeze({ onVisible: () => move("visible"), onDismiss: () => move("dismissed") });
}

function settled(
  viewModel: VisibleCompanionExperienceViewModel | null,
  observer?: VisibleExperienceObserver,
  handlers?: Readonly<{ onVisible: () => boolean; onDismiss: () => boolean }>,
): ProductiveAdaptiveJourneyState {
  return Object.freeze({ status: "settled" as const, viewModel, observer, ...handlers });
}

export function useProductiveAdaptiveJourney(source: ProductiveAdaptiveJourneySource): ProductiveAdaptiveJourneyState {
  const adaptive = useAdaptiveJourney(source);
  const [snapshot] = useState(() => source);
  const [observer] = useState(() => snapshot.observer);
  const runRef = useRef<Promise<ProductiveAdaptiveJourneyState> | null>(null);
  const [state, setState] = useState<ProductiveAdaptiveJourneyState>(() => Object.freeze({
    status: "loading" as const,
    viewModel: null,
    observer,
  }));

  useEffect(() => {
    if (!runRef.current) {
      observeVisibleExperience(observer, "adaptive_flow_started");
      runRef.current = (async () => {
        try {
          const storage = snapshot.storage ?? browserSessionStorage;
          const scope = Object.freeze({ userId: snapshot.user.id, tripId: snapshot.trip.id });
          const stored = readVisibleDeliverySession({ dependencies: storage, scope, now: adaptive.logicalInstant });
          if (stored.status !== "available") {
            observeVisibleExperience(observer, "contextual_silence");
            return settled(null, observer);
          }
          if (stored.document.receipts.some(({ state: receiptState }) => receiptState === "expired")) {
            observeVisibleExperience(observer, "delivery_expired");
          }
          const delivery = toVisibleDeliveryCompanionSnapshot(stored.document);
          const { preferences } = await getPushPreferences();
          const result = await composeFirstRealExperience({
            logicalInstant: adaptive.logicalInstant,
            resolvedLivingContext: adaptive.livingContext,
            decision: {
              tripId: snapshot.trip.id,
              preferences: {
                enabled: preferences.enabled,
                beforeTrip: preferences.beforeTrip,
                duringTrip: preferences.duringTrip,
              },
              processedKeys: new Set(delivery.decisionProcessedKeys),
              activities: adaptive.activities,
            },
            companion: {
              preferences: { enabled: preferences.enabled },
              processedKeys: new Set(delivery.companionProcessedKeys),
              history: delivery.history.map((entry) => Object.freeze({ ...entry })),
            },
            memory: {
              scope: {
                ownerUserId: snapshot.user.id,
                tripId: snapshot.trip.id,
                storyId: snapshot.storyPackage.storyId,
              },
              facts: { firstChapterAlreadyOpened: false },
            },
          });

          if (result.outcome === "composed") {
            const intent = result.deliveryIntents[0];
            if (intent?.destination === "memory"
              && intent.references.length === 2
              && intent.references[0] === "editorial_message"
              && intent.references[1] === "memory_candidate"
              && result.memoryCandidate.type === "trip_last_day") {
              const accepted = acceptMemoryCandidate(result.memoryCandidate);
              await persistSemanticMemory({ tripId: snapshot.trip.id, accepted });
              observeVisibleExperience(observer, "memory_persisted");
              return settled(null, observer);
            }
            observeVisibleExperience(observer, "contextual_silence");
            return settled(null, observer);
          }

          const viewModel = toVisibleCompanionExperience(result, { surface: "active_story_chapter", observer });
          if (!viewModel || result.outcome !== "transient_composed") return settled(null, observer);
          observeVisibleExperience(observer, "memory_discarded");
          const intent = result.deliveryIntents[0];
          const receipt = createPendingVisibleDeliveryReceipt({
            scope,
            actionId: result.action.actionId,
            destination: "in_app",
            references: intent.references,
            dedupeKey: result.decisionRun.selected.dedupeKey,
            priority: result.decisionRun.selected.priority,
            pendingAt: adaptive.logicalInstant,
            expiryBoundaries: [
              result.decisionRun.selected.window.validUntil,
              result.decisionRun.selected.window.expiresAt,
              ...(typeof snapshot.trip.endDateTime === "string" ? [snapshot.trip.endDateTime] : []),
            ],
          });
          if (!receipt) {
            observeVisibleExperience(observer, "contextual_silence");
            return settled(null, observer);
          }
          const document = withReceipt(stored.document, receipt);
          const written = writeVisibleDeliverySession({ dependencies: storage, scope, document });
          if (written.status !== "available") {
            observeVisibleExperience(observer, "contextual_silence");
            return settled(null, observer);
          }
          return settled(viewModel, observer, callbacks({ document, receipt, scope, storage, observer }));
        } catch {
          observeVisibleExperience(observer, "contextual_silence");
          return settled(null, observer);
        }
      })();
    }

    let active = true;
    void runRef.current.then((next) => { if (active) setState(next); });
    return () => { active = false; };
  }, [adaptive, observer, snapshot]);

  return state;
}
