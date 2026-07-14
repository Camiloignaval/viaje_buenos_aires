import { applyCors } from '../../lib/cors.js';
import { requireUser } from '../../lib/platformAuth.js';
import { sendPlatformError } from '../../lib/platformErrors.js';
import { getContextExchangeRatesCollection } from '../../lib/platformMongo.js';
import { getExchangeRates } from '../../lib/context/exchangeRateCache.js';
import { isSupportedCurrency, SUPPORTED_CURRENCIES } from '../../lib/context/currencyAllowlist.js';

const MAX_SYMBOLS = SUPPORTED_CURRENCIES.length;

function parseSymbols(raw) {
  if (!raw) return null;
  return String(raw)
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_SYMBOLS);
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const session = await requireUser(req, res);
  if (!session) return;

  const base = String(req.query.base ?? '').trim().toUpperCase();
  if (!isSupportedCurrency(base)) {
    return res.status(400).json({ error: 'Moneda base inválida.' });
  }

  const requestedSymbols = parseSymbols(req.query.symbols);
  if (requestedSymbols && requestedSymbols.some((symbol) => !isSupportedCurrency(symbol))) {
    return res.status(400).json({ error: 'Alguna de las monedas solicitadas no está soportada.' });
  }

  try {
    const collection = await getContextExchangeRatesCollection();
    const snapshot = await getExchangeRates({ base, collection });
    if (!snapshot) {
      // Nunca hubo una tasa disponible para esta base: se informa con
      // elegancia (200 + rates vacío), no como error — la UI omite la
      // conversión sin romperse.
      return res.status(200).json({ base, date: null, rates: {}, source: null, fetchedAt: null, stale: false });
    }

    const symbolsToReturn = requestedSymbols ?? Object.keys(snapshot.rates);
    const rates = Object.fromEntries(
      symbolsToReturn.filter((symbol) => symbol in snapshot.rates).map((symbol) => [symbol, snapshot.rates[symbol]]),
    );

    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    return res.status(200).json({
      base: snapshot.base,
      date: snapshot.date,
      rates,
      source: snapshot.provider,
      fetchedAt: snapshot.fetchedAt,
      stale: snapshot.stale,
    });
  } catch (error) {
    return sendPlatformError(res, error, { fallbackMessage: 'No se pudieron obtener las tasas de cambio.' });
  }
}
