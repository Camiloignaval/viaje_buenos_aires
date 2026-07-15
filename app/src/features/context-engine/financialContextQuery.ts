import type { QueryFunctionContext } from "@tanstack/react-query";
import { resolveFinancialContext } from "./financialContext";
import type { Money } from "./types";

export function financialContextQueryKey(localMoney: Money | null, preferredCurrency: string) {
  return ["context-engine", "financial", localMoney?.currency, localMoney?.amount, preferredCurrency] as const;
}

export function financialContextQueryOptions(localMoney: Money | null, preferredCurrency: string) {
  const queryKey = financialContextQueryKey(localMoney, preferredCurrency);
  return {
    queryKey,
    queryFn: ({ signal }: QueryFunctionContext<typeof queryKey>) => resolveFinancialContext({ localMoney, preferredCurrency, signal }),
    enabled: localMoney !== null && localMoney.currency !== preferredCurrency,
    staleTime: 60 * 60 * 1000,
    retry: false as const,
  };
}
