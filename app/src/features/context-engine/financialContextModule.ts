import type { ContextModule, FinancialContext, Money } from "./types";
import { fetchExchangeRates } from "./exchangeRateClient";
import { roundMoney } from "./money";

export interface FinancialContextInput {
  localMoney: Money | null;
  preferredCurrency: string;
  signal?: AbortSignal;
}

function unavailable(
  localMoney: Money | null,
  reason: NonNullable<FinancialContext["reason"]>,
): FinancialContext {
  return {
    // Sin Money local válido no hay nada que mostrar; el caller ya decidió no
    // renderizar nada en ese caso, este shape solo existe para no romper el tipo.
    localMoney: localMoney ?? { amount: 0, currency: "" },
    convertedMoney: null,
    rateDate: null,
    freshness: "unavailable",
    available: false,
    reason,
    source: null,
    fetchedAt: null,
  };
}

/**
 * Primer módulo del Context Engine. La UI solo conoce `FinancialContext`
 * (ver types.ts) — no sabe nada del proveedor, del cache ni de cómo se
 * calculó la tasa.
 */
export const FinancialContextModule: ContextModule<FinancialContextInput, FinancialContext> = {
  name: "financial",

  async resolve({ localMoney, preferredCurrency, signal }): Promise<FinancialContext> {
    if (!localMoney) return unavailable(null, "invalid_money");

    if (localMoney.currency === preferredCurrency) {
      // La moneda local YA es la preferida: no hay "conversión" que mostrar,
      // pero no es un error — es el caso feliz donde ambas coinciden.
      return {
        localMoney,
        convertedMoney: null,
        rateDate: null,
        freshness: "unavailable",
        available: false,
        reason: "same_currency",
        source: null,
        fetchedAt: null,
      };
    }

    const snapshot = await fetchExchangeRates({
      base: localMoney.currency,
      symbols: [preferredCurrency],
      signal,
    });
    if (!snapshot) return unavailable(localMoney, "fetch_failed");

    const rate = snapshot.rates[preferredCurrency];
    if (!Number.isFinite(rate) || rate <= 0) return unavailable(localMoney, "rate_unavailable");

    const convertedMoney: Money = {
      amount: roundMoney(localMoney.amount * rate, preferredCurrency),
      currency: preferredCurrency,
    };

    return {
      localMoney,
      convertedMoney,
      rateDate: snapshot.date,
      freshness: snapshot.stale ? "stale" : "fresh",
      available: true,
      source: snapshot.source,
      fetchedAt: snapshot.fetchedAt,
    };
  },
};
