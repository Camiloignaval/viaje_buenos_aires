// Contratos del Context Engine. Financial Context es el primer módulo; los
// tipos genéricos (ContextModule) existen para que futuros módulos (clima,
// huso horario, contexto cultural) se sumen por composición, sin que
// Financial Context dependa de ellos ni al revés.

/** Código de moneda ISO 4217, ya normalizado a mayúsculas. */
export type CurrencyCode = string;

/** Un monto explícito: nunca un número suelto sin moneda. */
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

/** Snapshot de tasas devuelto por el endpoint interno de Alaia. */
export interface ExchangeRateSnapshot {
  base: CurrencyCode;
  date: string | null;
  rates: Record<string, number>;
  source: string | null;
  fetchedAt: string | null;
  stale: boolean;
}

export type ConversionUnavailableReason =
  | "same_currency"
  | "rate_unavailable"
  | "invalid_money"
  | "fetch_failed";

export type FinancialFreshness = "fresh" | "stale" | "unavailable";

/**
 * Lo que consume la UI. No conoce proveedor, cache ni tasas: solo el
 * resultado ya resuelto por FinancialContextModule.
 */
export interface FinancialContext {
  localMoney: Money;
  convertedMoney: Money | null;
  rateDate: string | null;
  freshness: FinancialFreshness;
  available: boolean;
  reason?: ConversionUnavailableReason;
}

/** Contrato mínimo que cualquier módulo del Context Engine debe cumplir. */
export interface ContextModule<TInput, TResult> {
  readonly name: string;
  resolve(input: TInput): Promise<TResult>;
}
