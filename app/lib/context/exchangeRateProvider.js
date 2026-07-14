import { ExternalServiceUnavailableError } from '../platformErrors.js';

// Frankfurter (v2): API de tasas de cambio gratuita, sin API key, de código
// abierto ("blended" desde ~30 bancos centrales). Verificado con smoke real
// contra el endpoint antes de elegirla — ver informe de la Etapa 6.5. Los
// nombres v1 ("frankfurter.app", solo ~30 monedas de la Eurozona/G20, SIN
// ARS/CLP/UYU/PEN/COP) y v2 ("frankfurter.dev", set ampliado) son APIs
// distintas pese al nombre compartido; v1 NO alcanza para el allowlist de
// Alaia y quedó descartada tras probarla. Detrás de una interfaz
// (fetchLatestRates) para poder reemplazar el proveedor sin tocar el resto
// de la capa (cache, endpoint).
const PROVIDER_BASE_URL = 'https://api.frankfurter.dev/v2';
const PROVIDER_NAME = 'frankfurter';
const REQUEST_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 64 * 1024;

async function readBoundedJson(response) {
  const text = await response.text();
  if (text.length > MAX_RESPONSE_BYTES) {
    throw new ExternalServiceUnavailableError('El proveedor de tasas de cambio devolvió una respuesta inesperada.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ExternalServiceUnavailableError('El proveedor de tasas de cambio devolvió una respuesta inválida.');
  }
}

/**
 * Consulta las tasas de cambio más recientes para `base` contra `symbols`.
 * Nunca lanza por timeout/red/HTTP/payload inválido sin envolver el error en
 * `ExternalServiceUnavailableError` — el caller decide qué hacer (fallback a
 * cache stale, por ejemplo).
 *
 * Contrato real de GET /v2/rates?base=X&quotes=Y,Z (verificado con curl, no
 * de memoria): devuelve un ARRAY de registros `{ date, base, quote, rate }`,
 * uno por cada moneda de `quotes` — no un objeto `{ base, rates: {...} }`
 * como el v1 clásico de Frankfurter.
 */
export async function fetchLatestRates({ base, symbols, signal } = {}) {
  const url = new URL(`${PROVIDER_BASE_URL}/rates`);
  url.searchParams.set('base', base);
  if (symbols?.length) {
    url.searchParams.set('quotes', symbols.join(','));
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response;
  try {
    response = await fetch(url, { signal: combinedSignal, headers: { Accept: 'application/json' } });
  } catch (error) {
    throw new ExternalServiceUnavailableError('No se pudo contactar al proveedor de tasas de cambio.', {
      provider: PROVIDER_NAME,
      cause: error?.name,
    });
  }

  if (!response.ok) {
    throw new ExternalServiceUnavailableError('El proveedor de tasas de cambio respondió con un error.', {
      provider: PROVIDER_NAME,
      status: response.status,
    });
  }

  const payload = await readBoundedJson(response);
  if (!Array.isArray(payload)) {
    throw new ExternalServiceUnavailableError('El proveedor de tasas de cambio devolvió un formato inesperado.', {
      provider: PROVIDER_NAME,
    });
  }

  const rates = {};
  let date = null;
  for (const record of payload) {
    if (!record || typeof record !== 'object') continue;
    const quote = String(record.quote ?? '');
    const numeric = Number(record.rate);
    if (quote && Number.isFinite(numeric) && numeric > 0) {
      rates[quote] = numeric;
      date ??= typeof record.date === 'string' ? record.date : null;
    }
  }

  if (!date) {
    throw new ExternalServiceUnavailableError('El proveedor de tasas de cambio no devolvió tasas utilizables.', {
      provider: PROVIDER_NAME,
    });
  }

  return {
    base: String(base).trim().toUpperCase(),
    date,
    rates,
    provider: PROVIDER_NAME,
  };
}

export const frankfurterProvider = Object.freeze({
  name: PROVIDER_NAME,
  fetchLatestRates,
});
