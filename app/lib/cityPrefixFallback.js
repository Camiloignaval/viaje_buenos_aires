import { normalizeSearchText, scoreCityMatch } from './searchNormalize.js';

// Respaldo pequeño para prefijos cortos que Nominatim no trata como
// autocomplete. El proveedor sigue siendo la fuente principal; este catálogo
// sólo completa ciudades conocidas cuando la respuesta externa es insuficiente.
const CITY_PREFIX_FALLBACK = [
  ['CL', 'Chile', 'Valdivia', 'Región de Los Ríos', -39.8142, -73.2459, 'America/Santiago'],
  ['CL', 'Chile', 'Valparaíso', 'Región de Valparaíso', -33.0472, -71.6127, 'America/Santiago'],
  ['CL', 'Chile', 'Vallenar', 'Región de Atacama', -28.5758, -70.7581, 'America/Santiago'],
  ['CL', 'Chile', 'Concepción', 'Región del Biobío', -36.827, -73.0498, 'America/Santiago'],
  ['CL', 'Chile', 'Copiapó', 'Región de Atacama', -27.3668, -70.3323, 'America/Santiago'],
  ['CL', 'Chile', 'Coquimbo', 'Región de Coquimbo', -29.9533, -71.3436, 'America/Santiago'],
  ['CL', 'Chile', 'Puerto Montt', 'Región de Los Lagos', -41.4689, -72.9411, 'America/Santiago'],
  ['CL', 'Chile', 'Punta Arenas', 'Región de Magallanes', -53.1638, -70.9171, 'America/Punta_Arenas'],
  ['AR', 'Argentina', 'Buenos Aires', 'CABA', -34.6037, -58.3816, 'America/Argentina/Buenos_Aires'],
  ['AR', 'Argentina', 'Mendoza', 'Mendoza', -32.8895, -68.8458, 'America/Argentina/Mendoza'],
  ['BR', 'Brasil', 'Rio de Janeiro', 'Rio de Janeiro', -22.9068, -43.1729, 'America/Sao_Paulo'],
  ['BR', 'Brasil', 'São Paulo', 'São Paulo', -23.5505, -46.6333, 'America/Sao_Paulo'],
  ['BR', 'Brasil', 'Salvador', 'Bahia', -12.9777, -38.5016, 'America/Bahia'],
];

export function searchCityPrefixFallback(countryCode, query) {
  const normalizedCountryCode = String(countryCode ?? '').trim().toUpperCase();
  const normalizedQuery = normalizeSearchText(query);
  if (!/^[A-Z]{2}$/.test(normalizedCountryCode) || normalizedQuery.length < 2) return [];

  return CITY_PREFIX_FALLBACK.flatMap(
    ([code, countryName, name, adminName, latitude, longitude, timezone]) => {
      if (code !== normalizedCountryCode) return [];
      const score = scoreCityMatch(name, normalizedQuery);
      if (score === 0) return [];

      return [{
        score,
        importance: 0,
        sourcePriority: 0,
        city: {
          id: `fallback:${code.toLowerCase()}:${normalizeSearchText(name).replace(/\s+/g, '-')}`,
          name,
          adminName,
          countryCode: code,
          countryName,
          latitude,
          longitude,
          timezone,
        },
      }];
    },
  );
}
