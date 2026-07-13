import tzlookup from 'tz-lookup';
import { normalizeSearchText, resolveCityQuery, scoreCityMatch } from './searchNormalize.js';
import { searchCityPrefixFallback } from './cityPrefixFallback.js';

// Proxy propio a OpenStreetMap Nominatim: gratis, sin API key. Como server
// llamando a un tercero, respetamos su política de uso (User-Agent propio,
// resultados cacheados un rato para no repetir la misma búsqueda).
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'AlaiaTravelPlanner/1.0 (app privada de viajes, 2 usuarios)';
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCache() {
  return (globalThis._alaiaGeoCache ??= new Map());
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

  // Nominatim NO es un proveedor de autocomplete: su parámetro estructurado
  // `city=` solo devuelve nombres completos ("valdivia" funciona, "valdi" no).
  // La búsqueda libre, en cambio, también encuentra lugares cuya dirección
  // pertenece a la ciudad buscada. Extraemos la ciudad de esas direcciones y
  // filtramos/rankeamos el resultado; para prefijos demasiado cortos, el
  // respaldo local secundario completa la respuesta sin excepciones por query.
  const resolvedQuery = resolveCityQuery(query);
  const results = await nominatimSearch({
    countrycodes: countryCode.toLowerCase(),
    q: resolvedQuery,
    limit: 20,
  });

  const normalizedQuery = normalizeSearchText(resolvedQuery);
  const normalizedCountryCode = String(countryCode).trim().toUpperCase();
  const seen = new Set();
  const candidates = [];
  for (const item of Array.isArray(results) ? results : []) {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    const cityName =
      item.address?.city ??
      item.address?.town ??
      item.address?.village ??
      item.address?.municipality ??
      (item.addresstype === 'city' || item.addresstype === 'town' || item.addresstype === 'village'
        ? item.name
        : null);
    if (!cityName || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const resultCountryCode = String(item.address?.country_code ?? '').trim().toUpperCase();
    if (resultCountryCode && resultCountryCode !== normalizedCountryCode) continue;

    const score = scoreCityMatch(cityName, normalizedQuery);
    if (score === 0) continue;

    const timezone = timezoneForCoordinates(latitude, longitude);
    if (!timezone) continue;

    const adminName = item.address?.state ?? item.address?.county ?? '';
    const dedupeKey = `${normalizeSearchText(cityName)}|${normalizeSearchText(adminName)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    candidates.push({
      score,
      importance: Number(item.importance) || 0,
      sourcePriority: 1,
      city: {
        id: String(item.place_id),
        name: cityName,
        ...(adminName ? { adminName } : {}),
        countryCode: resultCountryCode || normalizedCountryCode,
        countryName: item.address?.country ?? '',
        latitude,
        longitude,
        timezone,
      },
    });
  }

  // Para prefijos de dos letras Nominatim suele devolver cero resultados. Se
  // combina un respaldo local pequeño y genérico, sin desplazar al proveedor:
  // si ambos conocen la misma ciudad gana el dato externo; para nombres
  // distintos manda siempre la relevancia textual.
  const providerCityNames = new Set(candidates.map(({ city }) => normalizeSearchText(city.name)));
  for (const fallback of searchCityPrefixFallback(normalizedCountryCode, normalizedQuery)) {
    if (providerCityNames.has(normalizeSearchText(fallback.city.name))) continue;
    candidates.push(fallback);
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      b.sourcePriority - a.sourcePriority ||
      b.importance - a.importance ||
      a.city.name.localeCompare(b.city.name),
  );
  const limited = candidates.slice(0, limit).map(({ city }) => city);

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
