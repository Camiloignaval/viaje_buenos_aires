import { frankfurterProvider } from './exchangeRateProvider.js';
import { SUPPORTED_CURRENCIES } from './currencyAllowlist.js';
import { ExternalServiceUnavailableError } from '../platformErrors.js';

// El allowlist es chico (~11 monedas): pedimos siempre ese set completo para
// `base` y lo cacheamos entero. Así una sola consulta diaria al proveedor
// cubre cualquier combinación base/symbols que pida el endpoint, sin volver a
// llamarlo por cada subconjunto distinto que pida un cliente.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getMemoryCache() {
  return (globalThis._alaiaExchangeRateCache ??= new Map());
}

function getInFlightMap() {
  return (globalThis._alaiaExchangeRateInFlight ??= new Map());
}

function isFresh(fetchedAt, now) {
  return now - new Date(fetchedAt).getTime() < CACHE_TTL_MS;
}

function symbolsForBase(base) {
  return SUPPORTED_CURRENCIES.filter((currency) => currency !== base);
}

async function readLatestFromMongo(collection, base, provider) {
  return collection.find({ base, provider }).sort({ date: -1 }).limit(1).next();
}

async function upsertMongo(collection, base, provider, snapshot) {
  const fetchedAt = new Date().toISOString();
  const doc = {
    base,
    provider,
    date: snapshot.date,
    rates: snapshot.rates,
    fetchedAt,
    expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  };
  await collection.updateOne({ base, provider, date: snapshot.date }, { $set: doc }, { upsert: true });
  return doc;
}

async function refreshFromProvider(collection, base, fetchLatestRates) {
  const snapshot = await fetchLatestRates({ base, symbols: symbolsForBase(base) });
  return upsertMongo(collection, base, frankfurterProvider.name, snapshot);
}

/**
 * Devuelve `{ base, date, rates, provider, fetchedAt, stale }` para `base`,
 * cacheado ~24h (memoria de proceso primero, Mongo como fuente durable).
 * `collection` se recibe por parámetro (igual que `addMemberIfCapacity` en
 * platformTrips.js) para poder testear sin Mongo real.
 * Deduplica refrescos concurrentes del mismo `base`. Si el proveedor falla
 * pero existe una tasa anterior (memoria o Mongo), la devuelve marcada
 * `stale: true`. Si nunca hubo una tasa para este `base`, devuelve `null` sin
 * lanzar — la UI decide qué hacer con la ausencia, nunca es un error fatal.
 */
export async function getExchangeRates({
  base,
  collection,
  fetchLatestRates = frankfurterProvider.fetchLatestRates,
}) {
  const normalizedBase = String(base ?? '').trim().toUpperCase();
  const now = Date.now();

  const memoryEntry = getMemoryCache().get(normalizedBase);
  if (memoryEntry && isFresh(memoryEntry.fetchedAt, now)) {
    return { ...memoryEntry, stale: false };
  }

  const inFlight = getInFlightMap();
  if (!inFlight.has(normalizedBase)) {
    inFlight.set(
      normalizedBase,
      refreshFromProvider(collection, normalizedBase, fetchLatestRates).finally(() =>
        inFlight.delete(normalizedBase),
      ),
    );
  }

  try {
    const fresh = await inFlight.get(normalizedBase);
    getMemoryCache().set(normalizedBase, fresh);
    return { ...fresh, stale: false };
  } catch (error) {
    if (!(error instanceof ExternalServiceUnavailableError)) throw error;

    const lastKnown = memoryEntry ?? (await readLatestFromMongo(collection, normalizedBase, frankfurterProvider.name));
    if (!lastKnown) return null;

    getMemoryCache().set(normalizedBase, lastKnown);
    return { ...lastKnown, stale: true };
  }
}

// Solo para tests: el cache vive en globalThis para sobrevivir cold starts en
// el proceso, así que hay que poder limpiarlo entre corridas.
export function clearExchangeRateMemoryCache() {
  getMemoryCache().clear();
  getInFlightMap().clear();
}
