import type { User } from "@/features/auth/types";
import type { StoryPackage, StoryView } from "@/features/story/engine/types";
import type { TripTemporalState } from "@/features/trips/lib/countdown";
import type { Trip } from "@/features/trips/types";
import { resolvePreferredCurrency } from "./preferredCurrencyResolver";
import { resolveDestinationContext, type DestinationLivingContext } from "./destinationContext";
import { resolveTemporalContext } from "./temporalContext";
import { resolveNarrativeContext } from "./narrativeContext";
import { availableResult, categoricalFinancialSource, unavailableResult } from "./livingContextResult";
import type {
  FinancialContext,
  LivingContextModuleName,
  LivingContextReason,
  ModuleResult,
  Money,
} from "./types";
export { LIVING_CONTEXT_FRESHNESS_MS, LIVING_CONTEXT_REASONS } from "./livingContextConstants";

export interface TemporalLivingContext {
  startDateTime: string;
  endDateTime: string;
  timezone: string;
  state: TripTemporalState;
}

export interface NarrativeLivingContext {
  baseStoryId: string;
  storyId: string;
  storyMood: StoryPackage["storyMood"];
  baseCopy: StoryPackage["baseCopy"];
  currentChapter: StoryView["visibleChapter"] | null;
}

export interface LivingContextCapabilities {
  destination: boolean;
  temporal: boolean;
  financial: boolean;
  narrative: boolean;
}

export interface LivingTravelContext {
  resolvedAt: string;
  destination: ModuleResult<DestinationLivingContext>;
  temporal: ModuleResult<TemporalLivingContext>;
  financial: ModuleResult<FinancialContext>;
  narrative: ModuleResult<NarrativeLivingContext>;
  capabilities: LivingContextCapabilities;
}

export interface LivingStorySnapshot {
  /** Id del catÃ¡logo que originÃ³ el package; no es el storyId del package. */
  baseStoryId: string;
  package: StoryPackage;
  view?: StoryView | null;
}

export interface LivingFinancialSnapshot {
  /** Money ya existente. Nunca se deriva de Trip.travelBudget. */
  localMoney: Money | null;
}

export interface LivingContextInput {
  trip?: Trip | null;
  user?: Pick<User, "preferredCurrency" | "residenceCountryCode"> | null;
  story?: LivingStorySnapshot | null;
  financial?: LivingFinancialSnapshot | null;
  observedAt?: Partial<Record<"trip" | "user" | "story" | "financial", string | null>>;
}

export interface FinancialAdapterInput {
  localMoney: Money | null;
  preferredCurrency: string;
  signal?: AbortSignal;
}

export interface LivingContextObservation {
  module: LivingContextModuleName;
  status: "available" | "unavailable";
  reason: LivingContextReason | null;
  source: string;
  durationMs: number;
}

export interface LivingContextDependencies {
  now: () => Date;
  financialAdapter?: (input: FinancialAdapterInput) => Promise<FinancialContext>;
  observer?: (event: LivingContextObservation) => void;
  signal?: AbortSignal;
  /** Reloj monotónico inyectable reservado para métricas; no afecta resolvedAt. */
  timingNow?: () => number;
}


function capabilities(context: Omit<LivingTravelContext, "capabilities">): LivingContextCapabilities {
  return {
    destination: context.destination.status === "available",
    temporal: context.temporal.status === "available",
    financial: context.financial.status === "available",
    narrative: context.narrative.status === "available",
  };
}

function withCapabilities(context: Omit<LivingTravelContext, "capabilities">): LivingTravelContext {
  return { ...context, capabilities: capabilities(context) };
}

function observe(observer: LivingContextDependencies["observer"], module: LivingContextModuleName, result: ModuleResult<unknown>, durationMs = 0): void {
  try {
    observer?.({ module, status: result.status, reason: result.reason, source: result.provenance.source, durationMs });
  } catch {
    // Observabilidad es best-effort y nunca participa en la resoluciÃ³n.
  }
}

export function createLivingContextResolution(
  input: LivingContextInput,
  dependencies: LivingContextDependencies,
): { initial: LivingTravelContext; settled: Promise<LivingTravelContext> } {
  const now = dependencies.now();
  const resolvedAt = now.toISOString();
  const destination = resolveDestinationContext(input, now);
  const tripDestination = input.trip?.destination && typeof input.trip.destination === "object" ? input.trip.destination : null;
  const temporal = resolveTemporalContext({
    startDateTime: input.trip?.startDateTime,
    endDateTime: input.trip?.endDateTime,
    timezone: tripDestination?.timezone,
    observedAt: input.observedAt?.trip ?? input.trip?.updatedAt,
  }, now);
  const narrative = resolveNarrativeContext({
    tripBaseStoryId: input.trip?.baseStoryId,
    story: input.story,
    observedAt: input.observedAt?.story,
  }, now);
  const canResolveFinancial = Boolean(input.financial?.localMoney && dependencies.financialAdapter);
  const financial = canResolveFinancial
    ? unavailableResult<FinancialContext>("pending", "financial.adapter", "adapter")
    : unavailableResult<FinancialContext>("missing_financial_input");

  const initial = withCapabilities({ resolvedAt, destination, temporal, financial, narrative });
  observe(dependencies.observer, "destination", destination);
  observe(dependencies.observer, "temporal", temporal);
  observe(dependencies.observer, "narrative", narrative);
  if (!canResolveFinancial) observe(dependencies.observer, "financial", financial);

  if (!canResolveFinancial) return { initial, settled: Promise.resolve(initial) };

  const timingNow = dependencies.timingNow ?? (() => 0);
  const startedAt = timingNow();
  const preferredCurrency = resolvePreferredCurrency({
    explicitPreference: input.user?.preferredCurrency,
    residenceCountryCode: input.user?.residenceCountryCode,
  });
  const settled = Promise.allSettled([
    dependencies.financialAdapter!({
      localMoney: input.financial!.localMoney,
      preferredCurrency,
      signal: dependencies.signal,
    }),
  ]).then(([outcome]) => {
    let financialResult: ModuleResult<FinancialContext>;
    if (outcome.status === "rejected" || !outcome.value.available) {
      financialResult = unavailableResult("financial_failed", "financial.adapter", "adapter");
    } else {
      financialResult = availableResult(
        "financial",
        outcome.value,
        "adapter",
        categoricalFinancialSource(outcome.value.source),
        outcome.value.fetchedAt ?? input.observedAt?.financial,
        now,
        outcome.value.freshness === "stale" ? "stale" : undefined,
      );
    }
    observe(dependencies.observer, "financial", financialResult, Math.max(0, timingNow() - startedAt));
    return withCapabilities({ resolvedAt, destination, temporal, financial: financialResult, narrative });
  });

  return { initial, settled };
}
