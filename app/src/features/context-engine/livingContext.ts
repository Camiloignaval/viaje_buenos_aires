import type { User } from "@/features/auth/types";
import type { StoryPackage, StoryView } from "@/features/story/engine/types";
import type { TripTemporalState } from "@/features/trips/lib/countdown";
import type { Trip } from "@/features/trips/types";
import { resolvePreferredCurrency } from "./preferredCurrencyResolver";
import { resolveDestinationContext, type DestinationLivingContext } from "./destinationContext";
import { resolveTemporalContext } from "./temporalContext";
import { resolveNarrativeContext } from "./narrativeContext";
import { availableResult, categoricalFinancialSource, unavailableResult } from "./livingContextResult";
import { resolveWeatherEligibility, resolveWeatherSnapshot, type WeatherRequestInput } from "./weatherContext";
import { isWeatherAdapterSnapshot } from "./weatherContextClient";
import type {
  FinancialContext,
  LivingContextModuleName,
  LivingContextReason,
  ModuleResult,
  Money,
  WeatherAdapterSnapshot,
  WeatherContext,
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
  weather: boolean;
}

export interface LivingTravelContext {
  resolvedAt: string;
  destination: ModuleResult<DestinationLivingContext>;
  temporal: ModuleResult<TemporalLivingContext>;
  financial: ModuleResult<FinancialContext>;
  narrative: ModuleResult<NarrativeLivingContext>;
  weather: ModuleResult<WeatherContext>;
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

export interface WeatherAdapterInput extends WeatherRequestInput {
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
  weatherAdapter?: (input: WeatherAdapterInput) => Promise<WeatherAdapterSnapshot | null>;
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
    weather: context.weather.status === "available",
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
  const weatherEligibility = resolveWeatherEligibility({ trip: input.trip, now });
  const weatherRequest = weatherEligibility.eligible ? weatherEligibility.request : null;
  const canResolveWeather = Boolean(weatherRequest && dependencies.weatherAdapter);
  const weather = canResolveWeather
    ? unavailableResult<WeatherContext>("weather_pending", "weather.adapter", "adapter")
    : weatherEligibility.eligible
      ? unavailableResult<WeatherContext>("missing_weather_input", "weather.adapter")
      : unavailableResult<WeatherContext>(
          weatherEligibility.reason,
          "weather.adapter",
          weatherEligibility.reason === "weather_outside_window" ? "trip" : "none",
        );

  const initial = withCapabilities({ resolvedAt, destination, temporal, financial, narrative, weather });
  observe(dependencies.observer, "destination", destination);
  observe(dependencies.observer, "temporal", temporal);
  observe(dependencies.observer, "narrative", narrative);
  if (!canResolveFinancial) observe(dependencies.observer, "financial", financial);
  if (!canResolveWeather) observe(dependencies.observer, "weather", weather);

  if (!canResolveFinancial && !canResolveWeather) return { initial, settled: Promise.resolve(initial) };

  const timingNow = dependencies.timingNow ?? (() => 0);
  const startedAt = timingNow();
  const preferredCurrency = resolvePreferredCurrency({
    explicitPreference: input.user?.preferredCurrency,
    residenceCountryCode: input.user?.residenceCountryCode,
  });
  const settled = Promise.allSettled([
    canResolveFinancial
      ? dependencies.financialAdapter!({
          localMoney: input.financial!.localMoney,
          preferredCurrency,
          signal: dependencies.signal,
        })
      : Promise.resolve(null),
    canResolveWeather
      ? dependencies.weatherAdapter!({ ...weatherRequest!, signal: dependencies.signal })
      : Promise.resolve(null),
  ]).then(([financialOutcome, weatherOutcome]) => {
    let financialResult = financial;
    if (canResolveFinancial) {
      if (financialOutcome.status === "rejected" || !financialOutcome.value?.available) {
        financialResult = unavailableResult("financial_failed", "financial.adapter", "adapter");
      } else {
        financialResult = availableResult(
          "financial",
          financialOutcome.value,
          "adapter",
          categoricalFinancialSource(financialOutcome.value.source),
          financialOutcome.value.fetchedAt ?? input.observedAt?.financial,
          now,
          financialOutcome.value.freshness === "stale" ? "stale" : undefined,
        );
      }
      observe(dependencies.observer, "financial", financialResult, Math.max(0, timingNow() - startedAt));
    }

    let weatherResult = weather;
    if (canResolveWeather) {
      weatherResult = weatherOutcome.status === "fulfilled" && isWeatherAdapterSnapshot(weatherOutcome.value, weatherRequest!)
        ? resolveWeatherSnapshot(weatherOutcome.value, now)
        : unavailableResult("weather_failed", "weather.adapter", "adapter");
      observe(dependencies.observer, "weather", weatherResult, Math.max(0, timingNow() - startedAt));
    }
    return withCapabilities({ resolvedAt, destination, temporal, financial: financialResult, narrative, weather: weatherResult });
  });

  return { initial, settled };
}
