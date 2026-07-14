import type { Money, FinancialFreshness } from "./types";
import { decimalsForCurrency } from "./money";

// Locale fijo para agrupación/separadores: no mapeamos país→locale real (no
// aporta al objetivo de esta etapa), "es-CL" da una agrupación de miles
// razonable y consistente para las monedas latinoamericanas del allowlist.
const FORMAT_LOCALE = "es-CL";

/**
 * Moneda local: código ISO explícito (no símbolo) para evitar ambigüedad —
 * varias monedas del allowlist comparten el símbolo "$" (ARS, CLP, MXN, COP).
 * Ejemplo: "ARS 48.000".
 */
export function formatLocalMoney(money: Money): string {
  return new Intl.NumberFormat(FORMAT_LOCALE, {
    style: "currency",
    currency: money.currency,
    currencyDisplay: "code",
    minimumFractionDigits: decimalsForCurrency(money.currency),
    maximumFractionDigits: decimalsForCurrency(money.currency),
  }).format(money.amount);
}

/**
 * Conversión: prefijo "≈" + símbolo + código ISO explícito al final, discreta
 * frente a la moneda local. Ejemplo: "≈ $35.900 CLP".
 */
export function formatConvertedMoney(money: Money): string {
  const formatted = new Intl.NumberFormat(FORMAT_LOCALE, {
    style: "currency",
    currency: money.currency,
    currencyDisplay: "symbol",
    minimumFractionDigits: decimalsForCurrency(money.currency),
    maximumFractionDigits: decimalsForCurrency(money.currency),
  }).format(money.amount);
  return `≈ ${formatted} ${money.currency}`;
}

// Copy editorial por frescura de la tasa (sección 11 del alcance). No hay
// entrada para "unavailable": si no hay conversión, no se muestra ninguna
// referencia temporal — nunca un mensaje de error técnico.
export const FRESHNESS_COPY: Partial<Record<FinancialFreshness, string>> = {
  fresh: "Según el cambio de hoy.",
  stale: "Según el último cambio disponible.",
};
