import tzlookup from 'tz-lookup';
import { normalizeSearchText, resolveCityQuery, scoreCityMatch } from './searchNormalize.js';

// Proxy propio a OpenStreetMap Nominatim: gratis, sin API key. Como server
// llamando a un tercero, respetamos su política de uso (User-Agent propio,
// resultados cacheados un rato para no repetir la misma búsqueda).
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'AuroraTravelPlanner/1.0 (app privada de viajes, 2 usuarios)';
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCache() {
  return (globalThis._auroraGeoCache ??= new Map());
}

function cacheKey(prefix, params) {
  return `${prefix}:${JSON.stringify(params)}`;
}

function getCached(key) {
  const entry = getCache().get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    getCache().delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key, value) {
  getCache().set(key, { value, storedAt: Date.now() });
}

async function nominatimSearch(params) {
  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('El servicio de ubicaciones no respondió correctamente.');
  }
  return response.json();
}

export function timezoneForCoordinates(latitude, longitude) {
  try {
    return tzlookup(latitude, longitude);
  } catch {
    return null;
  }
}

export async function searchCities({ countryCode, query, limit = 8 }) {
  const key = cacheKey('cities', { countryCode, query, limit });
  const cached = getCached(key);
  if (cached) return cached;

  // Alias conocidos (NYC, SF, Bs As...) se resuelven al término real antes de
  // consultar Nominatim. Pedimos más resultados de los que vamos a devolver
  // porque después reordenamos por relevancia propia — el orden de Nominatim
  // no siempre prioriza lo que el usuario esperaría ver primero.
  const resolvedQuery = resolveCityQuery(query);
  const results = await nominatimSearch({
    countrycodes: countryCode.toLowerCase(),
    city: resolvedQuery,
    limit: Math.min(limit * 3, 20),
  });

  const normalizedQuery = normalizeSearchText(resolvedQuery);
  const seen = new Set();
  const cities = [];
  for (const item of Array.isArray(results) ? results : []) {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    const cityName = item.address?.city ?? item.address?.town ?? item.address?.village ?? item.name;
    if (!cityName || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const timezone = timezoneForCoordinates(latitude, longitude);
    if (!timezone) continue;

    const dedupeKey = `${cityName}|${item.address?.state ?? ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    cities.push({
      id: String(item.place_id),
      name: cityName,
      ...(item.address?.state ? { adminName: item.address.state } : {}),
      countryCode: String(item.address?.country_code ?? countryCode).toUpperCase(),
      countryName: item.address?.country ?? '',
      latitude,
      longitude,
      timezone,
    });
  }

  cities.sort((a, b) => scoreCityMatch(b.name, normalizedQuery) - scoreCityMatch(a.name, normalizedQuery));
  const limited = cities.slice(0, limit);

  setCached(key, limited);
  return limited;
}

const HOTEL_TYPES = new Set(['hotel', 'guest_house', 'hostel', 'apartment', 'motel']);

export async function searchPlaces({ countryCode, cityName, query, limit = 8 }) {
  const key = cacheKey('places', { countryCode, cityName, query, limit });
  const cached = getCached(key);
  if (cached) return cached;

  const freeform = [query, cityName].filter(Boolean).join(', ');
  const results = await nominatimSearch({
    countrycodes: countryCode ? countryCode.toLowerCase() : undefined,
    q: freeform,
    limit,
  });

  const places = [];
  for (const item of Array.isArray(results) ? results : []) {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const isHotel = item.class === 'tourism' && HOTEL_TYPES.has(item.type);
    places.push({
      id: String(item.place_id),
      type: isHotel ? 'hotel' : 'address',
      name: item.namedetails?.name ?? String(item.display_name ?? '').split(',')[0],
      address: item.display_name ?? '',
      ...(item.address?.suburb || item.address?.neighbourhood
        ? { neighborhood: item.address.suburb ?? item.address.neighbourhood }
        : {}),
      latitude,
      longitude,
      placeId: String(item.place_id),
    });
    if (places.length >= limit) break;
  }

  setCached(key, places);
  return places;
}
