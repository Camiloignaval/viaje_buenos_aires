import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolvePreferredCurrency } from "./preferredCurrencyResolver";
import { financialContextQueryOptions } from "./financialContextQuery";
import { availableResult, categoricalFinancialSource, unavailableResult } from "./livingContextResult";
import { resolveWeatherSnapshot } from "./weatherContext";
import { isWeatherAdapterSnapshot } from "./weatherContextClient";
import { weatherContextQueryOptions } from "./weatherContextQuery";
import {
  createLivingContextResolution,
  type LivingContextInput,
  type LivingContextObservation,
  type LivingTravelContext,
} from "./livingContext";
import type { FinancialContext } from "./types";

export interface UseLivingContextInput extends LivingContextInput {
  now?: Date;
  observer?: (event: LivingContextObservation) => void;
}

export function livingContextPreferredCurrency(input: UseLivingContextInput): string {
  return resolvePreferredCurrency({
    explicitPreference: input.user?.preferredCurrency,
    residenceCountryCode: input.user?.residenceCountryCode,
  });
}

function livingContextIdentity(input: UseLivingContextInput, now: Date, preferredCurrency: string): string {
  const destination = input.trip?.destination;
  return JSON.stringify({
    trip: input.trip ? {
      id: input.trip.id,
      updatedAt: input.trip.updatedAt,
      baseStoryId: input.trip.baseStoryId,
      startDateTime: input.trip.startDateTime,
      endDateTime: input.trip.endDateTime,
      destination: typeof destination === "object" ? {
        countryCode: destination.countryCode,
        countryName: destination.countryName,
        cityId: destination.cityId,
        cityName: destination.cityName,
        timezone: destination.timezone,
      } : destination,
    } : null,
    story: input.story ? {
      baseStoryId: input.story.baseStoryId,
      storyId: input.story.package.storyId,
      destinationLanguage: input.story.package.metadata.destinationLanguage,
      storyMood: input.story.package.storyMood,
      baseCopy: input.story.package.baseCopy,
      view: input.story.view ?? null,
    } : null,
    observedAt: input.observedAt ?? null,
    user: input.user ?? null,
    localMoney: input.financial?.localMoney ?? null,
    preferredCurrency,
    now: now.toISOString(),
  });
}

export function useLivingContext(input: UseLivingContextInput): LivingTravelContext {
  const fallbackNow = useRef(new Date());
  const now = input.now ?? fallbackNow.current;
  const preferredCurrency = livingContextPreferredCurrency(input);
  const localMoney = input.financial?.localMoney ?? null;
  const financeQuery = useQuery(financialContextQueryOptions(localMoney, preferredCurrency));
  const weatherOptions = weatherContextQueryOptions(input.trip, now);
  const weatherQuery = useQuery(weatherOptions);
  const identity = livingContextIdentity(input, now, preferredCurrency);
  const initial = useMemo(() => createLivingContextResolution(
    { ...input, financial: null },
    { now: () => now, observer: input.observer },
  ).initial, [identity, input.observer]);

  let financial = initial.financial;
  if (localMoney && localMoney.currency !== preferredCurrency) {
    if (financeQuery.data?.available) {
      const data = financeQuery.data as FinancialContext;
      financial = availableResult(
        "financial",
        data,
        "adapter",
        categoricalFinancialSource(data.source),
        data.fetchedAt ?? input.observedAt?.financial,
        now,
        data.freshness === "stale" ? "stale" : undefined,
      );
    } else if (financeQuery.isError || (financeQuery.data && !financeQuery.data.available)) {
      financial = unavailableResult("financial_failed", "financial.adapter", "adapter");
    } else {
      financial = unavailableResult("pending", "financial.adapter", "adapter");
    }
  }

  let weather = initial.weather;
  if (weatherOptions.enabled) {
    if (weatherQuery.isRefetchError) {
      weather = unavailableResult("weather_refresh_failed", "weather.adapter", "adapter");
    } else if (weatherQuery.data && isWeatherAdapterSnapshot(weatherQuery.data)) {
      weather = resolveWeatherSnapshot(weatherQuery.data, now);
    } else if (weatherQuery.isError) {
      weather = unavailableResult("weather_failed", "weather.adapter", "adapter");
    } else {
      weather = unavailableResult("weather_pending", "weather.adapter", "adapter");
    }
  }

  return {
    ...initial,
    financial,
    weather,
    capabilities: {
      ...initial.capabilities,
      financial: financial.status === "available",
      weather: weather.status === "available",
    },
  };
}
