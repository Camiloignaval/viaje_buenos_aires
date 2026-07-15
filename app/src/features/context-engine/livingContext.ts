import type { User } from "@/features/auth/types";
import type { StoryPackage, StoryView } from "@/features/story/engine/types";
import { safeTripTemporalState, type TripTemporalState } from "@/features/trips/lib/countdown";
import type { Trip } from "@/features/trips/types";
import { resolvePreferredCurrency } from "./preferredCurrencyResolver";
import { resolveTravelContext, type TravelContext } from "./travelContext";
import type {
  FinancialContext,
  LivingContextModuleName,
  LivingContextReason,
  ModuleResult,
  Money,
} from "./types";

export const LIVING_CONTEXT_REASONS = [
  "missing_destination",
  "missing_dates",
  "invalid_timezone",
  "missing_financial_input",
  "pending",
  "financial_failed",
  "missing_story",
  "story_mismatch",
] as const satisfies readonly LivingContextReason[];

export const LIVING_CONTEXT_FRESHNESS_MS = {
  destination: 24 * 60 * 60 * 1000,
  temporal: 60 * 1000,
  financial: 60 * 60 * 1000,
  narrative: 24 * 60 * 60 * 1000,
} as const satisfies Record<LivingContextModuleName, number>;

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
  destination: ModuleResult<TravelContext>;
  temporal: ModuleResult<TemporalLivingContext>;
  financial: ModuleResult<FinancialContext>;
  narrative: ModuleResult<NarrativeLivingContext>;
  capabilities: LivingContextCapabilities;
}

export interface LivingStorySnapshot {
  /** Id del catálogo que originó el package; no es el storyId del package. */
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
}

function unavailable<T>(
  reason: LivingContextReason,
  source = "none",
  owner: ModuleResult<T>["provenance"]["owner"] = "none",
): ModuleResult<T> {
  return {
    status: "unavailable",
    value: null,
    reason,
    freshness: "unavailable",
    provenance: { owner, source, observedAt: null },
  };
}

function freshness(
  module: LivingContextModuleName,
  observedAt: string | null | undefined,
  now: Date,
): "fresh" | "stale" {
  if (!observedAt) return "fresh";
  const observed = Date.parse(observedAt);
  if (!Number.isFinite(observed)) return "stale";
  return now.getTime() - observed > LIVING_CONTEXT_FRESHNESS_MS[module] ? "stale" : "fresh";
}

function available<T>(
  module: LivingContextModuleName,
  value: T,
  owner: ModuleResult<T>["provenance"]["owner"],
  source: string,
  observedAt: string | null | undefined,
  now: Date,
  freshnessOverride?: "fresh" | "stale",
): ModuleResult<T> {
  return {
    status: "available",
    value,
    reason: null,
    freshness: freshnessOverride ?? freshness(module, observedAt, now),
    provenance: { owner, source, observedAt: observedAt ?? null },
  };
}

function structuredDestination(trip: Trip | null | undefined) {
  return trip?.destination && typeof trip.destination === "object" ? trip.destination : null;
}

export function resolveDestinationLivingContext(input: LivingContextInput, now: Date): ModuleResult<TravelContext> {
  const tripDestination = structuredDestination(input.trip);
  const story = input.story?.package;
  if (!tripDestination && !story?.metadata.destination) {
    return unavailable("missing_destination");
  }

  const context = resolveTravelContext({
    countryCode: tripDestination?.countryCode ?? story?.metadata.destinationCountryCode,
    countryName: tripDestination?.countryName,
    city: tripDestination?.cityName ?? story?.metadata.destination,
    timezone: tripDestination?.timezone,
    destinationLanguage: story?.metadata.destinationLanguage,
    localCurrency: story?.budget?.currency,
  });
  const fromTrip = Boolean(tripDestination);
  return available(
    "destination",
    context,
    fromTrip ? "trip" : "story",
    fromTrip ? "trip.destination" : "story.metadata",
    input.observedAt?.trip ?? input.trip?.updatedAt ?? input.observedAt?.story,
    now,
  );
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function resolveTemporalLivingContext(input: LivingContextInput, now: Date): ModuleResult<TemporalLivingContext> {
  const { startDateTime, endDateTime } = input.trip ?? {};
  if (!startDateTime || !endDateTime) return unavailable("missing_dates", "trip.dates", "trip");
  const timezone = structuredDestination(input.trip)?.timezone;
  if (!timezone || !isValidTimezone(timezone)) return unavailable("invalid_timezone", "trip.destination", "trip");
  const state = safeTripTemporalState(now, startDateTime, endDateTime, timezone);
  if (!state) return unavailable("missing_dates", "trip.dates", "trip");
  return available(
    "temporal",
    { startDateTime, endDateTime, timezone, state },
    "trip",
    "trip.dates",
    input.observedAt?.trip ?? input.trip?.updatedAt,
    now,
  );
}

export function resolveNarrativeLivingContext(input: LivingContextInput, now: Date): ModuleResult<NarrativeLivingContext> {
  const snapshot = input.story;
  if (!snapshot) return unavailable("missing_story");
  if (!input.trip?.baseStoryId || snapshot.baseStoryId !== input.trip.baseStoryId) {
    return unavailable("story_mismatch", "story.package", "story");
  }
  return available(
    "narrative",
    {
      baseStoryId: snapshot.baseStoryId,
      storyId: snapshot.package.storyId,
      storyMood: snapshot.package.storyMood,
      baseCopy: snapshot.package.baseCopy,
      currentChapter: snapshot.view?.visibleChapter ?? null,
    },
    "story",
    "story.package",
    input.observedAt?.story,
    now,
  );
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
    // Observabilidad es best-effort y nunca participa en la resolución.
  }
}

export function createLivingContextResolution(
  input: LivingContextInput,
  dependencies: LivingContextDependencies,
): { initial: LivingTravelContext; settled: Promise<LivingTravelContext> } {
  const now = dependencies.now();
  const resolvedAt = now.toISOString();
  const destination = resolveDestinationLivingContext(input, now);
  const temporal = resolveTemporalLivingContext(input, now);
  const narrative = resolveNarrativeLivingContext(input, now);
  const canResolveFinancial = Boolean(input.financial?.localMoney && dependencies.financialAdapter);
  const financial = canResolveFinancial
    ? unavailable<FinancialContext>("pending", "financial.adapter", "adapter")
    : unavailable<FinancialContext>("missing_financial_input");

  const initial = withCapabilities({ resolvedAt, destination, temporal, financial, narrative });
  observe(dependencies.observer, "destination", destination);
  observe(dependencies.observer, "temporal", temporal);
  observe(dependencies.observer, "narrative", narrative);
  if (!canResolveFinancial) observe(dependencies.observer, "financial", financial);

  if (!canResolveFinancial) return { initial, settled: Promise.resolve(initial) };

  const startedAt = Date.now();
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
      financialResult = unavailable("financial_failed", "financial.adapter", "adapter");
    } else {
      financialResult = available(
        "financial",
        outcome.value,
        "adapter",
        outcome.value.source ?? "financial.adapter",
        outcome.value.fetchedAt ?? input.observedAt?.financial,
        now,
        outcome.value.freshness === "stale" ? "stale" : "fresh",
      );
    }
    observe(dependencies.observer, "financial", financialResult, Math.max(0, Date.now() - startedAt));
    return withCapabilities({ resolvedAt, destination, temporal, financial: financialResult, narrative });
  });

  return { initial, settled };
}
