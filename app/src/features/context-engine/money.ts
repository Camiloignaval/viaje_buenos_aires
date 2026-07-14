import type { Money } from "./types";
import { isSupportedCurrency } from "./currencyCatalog";

// Monedas sin decimales en uso corriente (CLP/JPY). El resto redondea a 2
// posiciones — no es exhaustivo por ISO 4217 completo, pero cubre las
// monedas del allowlist actual y es trivialmente extensible.
const ZERO_DECIMAL_CURRENCIES = new Set(["CLP", "JPY"]);

export function decimalsForCurrency(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
}

export function roundMoney(amount: number, currency: string): number {
  const factor = 10 ** decimalsForCurrency(currency);
  return Math.round(amount * factor) / factor;
}

function isFiniteAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Crea un Money válido o devuelve `null`. Nunca lanza: un monto/moneda
 * inválidos son un caso normal (contenido legacy, input de usuario), no una
 * excepción — el llamador decide qué hacer con `null`.
 */
export function createMoney(amount: number, currency: string | null | undefined): Money | null {
  const normalizedCurrency = String(currency ?? "").trim().toUpperCase();
  if (!isFiniteAmount(amount) || !isSupportedCurrency(normalizedCurrency)) return null;
  return { amount: roundMoney(amount, normalizedCurrency), currency: normalizedCurrency };
}

// Reconoce un único monto "limpio" tipo "$8.000" o "8000". Deliberadamente NO
// reconoce rangos ("$15.000–$25.000") ni texto libre ("Variable"): para esos
// casos no hay forma segura de inferir un monto único, y el llamador debe
// conservar el string original tal cual (ver sección 3/15 del alcance).
const LEGACY_SINGLE_AMOUNT_PATTERN = /^\$?\s*([\d.,]+)\s*$/;

export function parseLegacyAmount(raw: string): number | null {
  const match = LEGACY_SINGLE_AMOUNT_PATTERN.exec(raw.trim());
  if (!match) return null;
  // Formato local (es-AR/es-CL): punto o coma como separador de miles, sin
  // decimales en contenido curado. Se descartan ambos para quedarnos con el
  // entero.
  const digitsOnly = match[1].replace(/[.,]/g, "");
  const amount = Number(digitsOnly);
  return isFiniteAmount(amount) && amount > 0 ? amount : null;
}

/**
 * Normaliza un costo legacy (number | string) + moneda a Money. Devuelve
 * `null` si el monto no puede inferirse con seguridad (rango, texto libre,
 * moneda ausente o no soportada) — nunca asume una moneda por defecto.
 */
export function normalizeLegacyMoney(
  rawAmount: unknown,
  rawCurrency: unknown,
): Money | null {
  if (typeof rawAmount === "number") {
    return createMoney(rawAmount, typeof rawCurrency === "string" ? rawCurrency : null);
  }
  if (typeof rawAmount === "string") {
    const amount = parseLegacyAmount(rawAmount);
    if (amount === null) return null;
    return createMoney(amount, typeof rawCurrency === "string" ? rawCurrency : null);
  }
  return null;
}
