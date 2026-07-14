import { useQuery } from "@tanstack/react-query";
import { FinancialContextModule } from "./financialContextModule";
import type { Money } from "./types";

/**
 * Hook de consumo para componentes. El cache HTTP de 24h ya vive en el
 * backend (exchangeRateCache.js); este `staleTime` solo evita repetir la
 * misma llamada de red mientras el usuario navega la Experience.
 */
export function useFinancialContext(localMoney: Money | null, preferredCurrency: string) {
  const enabled = localMoney !== null && localMoney.currency !== preferredCurrency;

  return useQuery({
    queryKey: [
      "context-engine",
      "financial",
      localMoney?.currency,
      localMoney?.amount,
      preferredCurrency,
    ],
    queryFn: ({ signal }) =>
      FinancialContextModule.resolve({ localMoney, preferredCurrency, signal }),
    enabled,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
