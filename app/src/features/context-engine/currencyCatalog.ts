// Catálogo de monedas soportadas y su resolución país → moneda local.
// Espejo del allowlist backend (lib/context/currencyAllowlist.js): misma
// lista, mismo criterio que la duplicación cliente/servidor ya usada en el
// proyecto (ver onboardingSchema.ts). Extensible: agregar un país o moneda
// acá no afecta al resto del Context Engine.

export const SUPPORTED_CURRENCIES: readonly string[] = [
  "ARS",
  "CLP",
  "BRL",
  "USD",
  "EUR",
  "JPY",
  "MXN",
  "GBP",
  "UYU",
  "PEN",
  "COP",
];

const SUPPORTED_CURRENCIES_SET = new Set(SUPPORTED_CURRENCIES);
const ISO_CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function isSupportedCurrency(code: string | null | undefined): boolean {
  const normalized = String(code ?? "").trim().toUpperCase();
  return ISO_CURRENCY_PATTERN.test(normalized) && SUPPORTED_CURRENCIES_SET.has(normalized);
}

// Resolución país → moneda local. Válida para el alcance actual (una moneda
// por país); un destino futuro con más de una moneda en curso legal
// requeriría resolver desde el propio Money, no desde este mapa.
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  AR: "ARS",
  CL: "CLP",
  BR: "BRL",
  US: "USD",
  ES: "EUR",
  JP: "JPY",
  MX: "MXN",
  GB: "GBP",
  UY: "UYU",
  PE: "PEN",
  CO: "COP",
};

/** Moneda local para un país ISO 3166-1 alpha-2, o `null` si no se conoce. */
export function currencyForCountry(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  return COUNTRY_CURRENCY_MAP[countryCode.trim().toUpperCase()] ?? null;
}
