// Normalización compartida para búsquedas tolerantes (ciudades, países):
// mayúsculas/minúsculas, acentos y espacios repetidos no deberían importar —
// "rio", "Río" y "RIO" son la misma búsqueda. Un pequeño diccionario cubre lo
// que ninguna normalización resuelve por sí sola: siglas y apodos (NYC, SF,
// Bs As) que no son una forma parcial/acentuada del nombre real.
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos (tildes, diéresis, etc.)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CITY_QUERY_ALIASES = {
  nyc: 'new york',
  ny: 'new york',
  sf: 'san francisco',
  la: 'los angeles',
  baires: 'buenos aires',
  bsas: 'buenos aires',
  'bs as': 'buenos aires',
  caba: 'buenos aires',
  cdmx: 'ciudad de mexico',
};

// Si la búsqueda completa coincide con un alias conocido, se resuelve al
// término real antes de consultar Nominatim — "nyc" nunca va a matchear
// "New York" ahí, por más que normalicemos acentos o espacios.
export function resolveCityQuery(query) {
  const alias = CITY_QUERY_ALIASES[normalizeSearchText(query)];
  return alias ?? String(query ?? '').trim();
}

// Puntaje de relevancia para reordenar resultados ya devueltos por Nominatim
// (su orden interno no siempre prioriza lo que el usuario esperaría ver
// primero): coincidencia exacta > el nombre empieza así > alguna palabra
// del nombre empieza así > lo contiene en algún punto > sin relación.
export function scoreCityMatch(name, normalizedQuery) {
  if (!normalizedQuery) return 0;
  const normalizedName = normalizeSearchText(name);
  if (!normalizedName) return 0;
  if (normalizedName === normalizedQuery) return 4;
  if (normalizedName.startsWith(normalizedQuery)) return 3;
  if (normalizedName.split(' ').some((word) => word.startsWith(normalizedQuery))) return 2;
  if (normalizedName.includes(normalizedQuery)) return 1;
  return 0;
}
