import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolvePreferredCurrency } from "./preferredCurrencyResolver";
import { financialContextQueryOptions } from "./financialContextQuery";
import { availableResult, unavailableResult } from "./livingContextResult";
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

export function useLivingContext(input: UseLivingContextInput): LivingTravelContext {
  const fallbackNow = useRef(new Date());
  const now = input.now ?? fallbackNow.current;
  const preferredCurrency = livingContextPreferredCurrency(input);
  const localMoney = input.financial?.localMoney ?? null;
  const financeQuery = useQuery(financialContextQueryOptions(localMoney, preferredCurrency));
  const identity = JSON.stringify([
    input.trip?.id, input.trip?.updatedAt, input.trip?.baseStoryId,
    typeof input.trip?.destination === "object" ? input.trip.destination.cityId : input.trip?.destination,
    input.story?.baseStoryId, input.story?.package.storyId, input.observedAt?.story,
    preferredCurrency, localMoney?.currency, localMoney?.amount, now.toISOString(),
  ]);
  const initial = useMemo(() => createLivingContextResolution(
    { ...input, financial: null },
    { now: () => now, observer: input.observer },
  ).initial, [identity, input.observer]);

  let financial = initial.financial;
  if (localMoney && localMoney.currency !== preferredCurrency) {
    if (financeQuery.data?.available) {
      const data = financeQuery.data as FinancialContext;
      financial = availableResult("financial", data, "adapter", data.source ?? "financial.adapter", data.fetchedAt ?? input.observedAt?.financial, now, data.freshness === "stale" ? "stale" : "fresh");
    } else if (financeQuery.isError || (financeQuery.data && !financeQuery.data.available)) {
      financial = unavailableResult("financial_failed", "financial.adapter", "adapter");
    } else {
      financial = unavailableResult("pending", "financial.adapter", "adapter");
    }
  }

  return {
    ...initial,
    financial,
    capabilities: { ...initial.capabilities, financial: financial.status === "available" },
  };
}
