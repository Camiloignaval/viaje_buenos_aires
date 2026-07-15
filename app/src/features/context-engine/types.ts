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
  /** Provenance real del snapshot de tasas, cuando el adapter la conoce. */
  source?: string | null;
  fetchedAt?: string | null;
}

/** Contrato mínimo que cualquier módulo del Context Engine debe cumplir. */
export interface ContextModule<TInput, TResult> {
  readonly name: string;
  resolve(input: TInput): Promise<TResult>;
}

export const LIVING_CONTEXT_MODULES = [
  "destination",
  "temporal",
  "financial",
  "narrative",
] as const;

export type LivingContextModuleName = (typeof LIVING_CONTEXT_MODULES)[number];
export type LivingContextStatus = "available" | "unavailable";
export type LivingContextFreshness = "fresh" | "stale" | "unavailable";
export type LivingContextOwner = "trip" | "user" | "story" | "catalog" | "adapter" | "none";

export interface LivingContextProvenance {
  owner: LivingContextOwner;
  source: string;
  observedAt: string | null;
}

export interface ModuleResult<T> {
  status: LivingContextStatus;
  value: T | null;
  reason: LivingContextReason | null;
  freshness: LivingContextFreshness;
  provenance: LivingContextProvenance;
}

export type LivingContextReason =
  | "missing_destination"
  | "missing_dates"
  | "invalid_timezone"
  | "missing_financial_input"
  | "pending"
  | "financial_failed"
  | "missing_story"
  | "story_mismatch";
