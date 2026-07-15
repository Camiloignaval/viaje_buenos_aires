import type { QueryFunctionContext } from "@tanstack/react-query";
import { financialContextFromRate, resolveFinancialRate } from "./financialContext";
import type { Money } from "./types";

export function financialContextQueryKey(localMoney: Money | null, preferredCurrency: string) {
  return ["context-engine", "financial-rate", localMoney?.currency, preferredCurrency] as const;
}

export function financialContextQueryOptions(localMoney: Money | null, preferredCurrency: string) {
  const queryKey = financialContextQueryKey(localMoney, preferredCurrency);
  return {
    queryKey,
    queryFn: ({ signal }: QueryFunctionContext<typeof queryKey>) => resolveFinancialRate({
      baseCurrency: localMoney?.currency ?? "",
      preferredCurrency,
      signal,
    }),
    select: (rate: Awaited<ReturnType<typeof resolveFinancialRate>>) =>
      financialContextFromRate(rate, localMoney as Money, preferredCurrency),
    enabled: localMoney !== null && localMoney.currency !== preferredCurrency,
    staleTime: 60 * 60 * 1000,
    retry: false as const,
  };
}
