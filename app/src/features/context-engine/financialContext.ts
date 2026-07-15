import { FinancialContextModule, type FinancialContextInput } from "./financialContextModule";
import { fetchExchangeRates } from "./exchangeRateClient";
import { roundMoney } from "./money";
import type { ConversionUnavailableReason, FinancialContext, Money } from "./types";

export type FinancialRateResult =
  | {
      available: true;
      rate: number;
      rateDate: string | null;
      freshness: "fresh" | "stale";
      source: string | null;
      fetchedAt: string | null;
    }
  | {
      available: false;
      reason: Extract<ConversionUnavailableReason, "fetch_failed" | "rate_unavailable">;
      freshness: "unavailable";
      source: null;
      fetchedAt: null;
    };

export async function resolveFinancialRate({
  baseCurrency,
  preferredCurrency,
  signal,
}: {
  baseCurrency: string;
  preferredCurrency: string;
  signal?: AbortSignal;
}): Promise<FinancialRateResult> {
  const snapshot = await fetchExchangeRates({ base: baseCurrency, symbols: [preferredCurrency], signal });
  if (!snapshot) return { available: false, reason: "fetch_failed", freshness: "unavailable", source: null, fetchedAt: null };
  const rate = snapshot.rates[preferredCurrency];
  if (!Number.isFinite(rate) || rate <= 0) {
    return { available: false, reason: "rate_unavailable", freshness: "unavailable", source: null, fetchedAt: null };
  }
  return {
    available: true,
    rate,
    rateDate: snapshot.date,
    freshness: snapshot.stale ? "stale" : "fresh",
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
  };
}

export function financialContextFromRate(
  rate: FinancialRateResult,
  localMoney: Money,
  preferredCurrency: string,
): FinancialContext {
  if (!rate.available) {
    return {
      localMoney, convertedMoney: null, rateDate: null, freshness: "unavailable",
      available: false, reason: rate.reason, source: null, fetchedAt: null,
    };
  }
  return {
    localMoney,
    convertedMoney: { amount: roundMoney(localMoney.amount * rate.rate, preferredCurrency), currency: preferredCurrency },
    rateDate: rate.rateDate,
    freshness: rate.freshness,
    available: true,
    source: rate.source,
    fetchedAt: rate.fetchedAt,
  };
}

export async function resolveFinancialContext(input: FinancialContextInput): Promise<FinancialContext> {
  const result = await FinancialContextModule.resolve(input);
  return { source: null, fetchedAt: null, ...result };
}
