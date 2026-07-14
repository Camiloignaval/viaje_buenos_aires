// Monedas que el Context Engine sabe manejar hoy. Extensible: agregar un
// código ISO 4217 acá lo habilita en el endpoint de tasas sin tocar el resto
// de la capa (provider, cache, endpoint no conocen esta lista de memoria).
export const SUPPORTED_CURRENCIES = Object.freeze([
  'ARS',
  'CLP',
  'BRL',
  'USD',
  'EUR',
  'JPY',
  'MXN',
  'GBP',
  'UYU',
  'PEN',
  'COP',
]);

const SUPPORTED_CURRENCIES_SET = new Set(SUPPORTED_CURRENCIES);
const ISO_CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function isSupportedCurrency(code) {
  const normalized = String(code ?? '').trim().toUpperCase();
  return ISO_CURRENCY_PATTERN.test(normalized) && SUPPORTED_CURRENCIES_SET.has(normalized);
}
