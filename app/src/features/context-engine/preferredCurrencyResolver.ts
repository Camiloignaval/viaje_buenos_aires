import { currencyForCountry, isSupportedCurrency } from "./currencyCatalog";

// Documentado explícitamente: si no hay preferencia ni país de residencia
// resolvible, USD es la referencia internacional más neutra para viajeros.
export const FALLBACK_CURRENCY = "USD";

export interface PreferredCurrencyInput {
  explicitPreference?: string | null;
  residenceCountryCode?: string | null;
}

/**
 * Resuelve la moneda preferida del viajero, en este orden:
 * 1. Preferencia explícita del usuario (si es válida) — nunca se pisa en silencio.
 * 2. Moneda del país de residencia.
 * 3. Fallback documentado (USD).
 */
export function resolvePreferredCurrency({
  explicitPreference,
  residenceCountryCode,
}: PreferredCurrencyInput): string {
  const explicit = String(explicitPreference ?? "").trim().toUpperCase();
  if (explicit && isSupportedCurrency(explicit)) return explicit;

  const derived = currencyForCountry(residenceCountryCode);
  if (derived) return derived;

  return FALLBACK_CURRENCY;
}
