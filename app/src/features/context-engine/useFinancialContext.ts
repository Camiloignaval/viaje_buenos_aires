import { useQuery } from "@tanstack/react-query";
import { financialContextQueryOptions } from "./financialContextQuery";
import type { Money } from "./types";

/**
 * Hook de consumo para componentes. El cache HTTP de 24h ya vive en el
 * backend (exchangeRateCache.js); este `staleTime` solo evita repetir la
 * misma llamada de red mientras el usuario navega la Experience.
 */
export function useFinancialContext(localMoney: Money | null, preferredCurrency: string) {
  return useQuery(financialContextQueryOptions(localMoney, preferredCurrency));
}
