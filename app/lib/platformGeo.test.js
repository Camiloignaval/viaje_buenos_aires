import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { timezoneForCoordinates, searchCities, searchPlaces } from './platformGeo.js';

function stubFetchOnce(payload) {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return { ok: true, json: async () => payload };
  };
  return {
    callCount: () => calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

function stubFetchCapture(payload) {
  const originalFetch = globalThis.fetch;
  let lastUrl;
  globalThis.fetch = async (url) => {
    lastUrl = url;
    return { ok: true, json: async () => payload };
  };
  return {
    lastUrl: () => lastUrl,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

beforeEach(() => {
  globalThis._alaiaGeoCache?.clear();
});

test('timezoneForCoordinates resuelve Buenos Aires', () => {
  assert.equal(timezoneForCoordinates(-34.6037, -58.3816), 'America/Argentina/Buenos_Aires');
});

test('timezoneForCoordinates devuelve null ante coordenadas inválidas', () => {
  assert.equal(timezoneForCoordinates(NaN, NaN), null);
});

test('searchCities normaliza el resultado de Nominatim al contrato esperado', async () => {
  const stub = stubFetchOnce([
    {
      place_id: 111,
      lat: '-34.6037',
      lon: '-58.3816',
      address: { city: 'Buenos Aires', state: 'CABA', country: 'Argentina', country_code: 'ar' },
    },
  ]);
  try {
    const cities = await searchCities({ countryCode: 'AR', query: 'buen', limit: 8 });
    assert.deepEqual(cities, [
      {
        id: '111',
        name: 'Buenos Aires',
        adminName: 'CABA',
        countryCode: 'AR',
        countryName: 'Argentina',
        latitude: -34.6037,
        longitude: -58.3816,
        timezone: 'America/Argentina/Buenos_Aires',
      },
    ]);
  } finally {
    stub.restore();
  }
});

test('searchCities descarta resultados sin coordenadas o nombre de ciudad válidos', async () => {
  const stub = stubFetchOnce([
    { place_id: 1, lat: 'not-a-number', lon: '-58.38', address: { city: 'X' } },
    { place_id: 2, lat: '-34.6', lon: '-58.38', address: {} },
  ]);
  try {
    const cities = await searchCities({ countryCode: 'AR', query: 'x', limit: 8 });
    assert.deepEqual(cities, []);
  } finally {
    stub.restore();
  }
});

test('searchCities cachea resultados para los mismos parámetros (no repite el fetch)', async () => {
  const stub = stubFetchOnce([
    { place_id: 222, lat: '-33.45', lon: '-70.66', address: { city: 'Santiago', country: 'Chile', country_code: 'cl' } },
  ]);
  try {
    await searchCities({ countryCode: 'CL', query: 'sant-cache-test', limit: 8 });
    await searchCities({ countryCode: 'CL', query: 'sant-cache-test', limit: 8 });
    assert.equal(stub.callCount(), 1);
  } finally {
    stub.restore();
  }
});

test('searchCities resuelve alias conocidos (NYC) antes de consultar Nominatim', async () => {
  const stub = stubFetchCapture([]);
  try {
    await searchCities({ countryCode: 'US', query: 'NYC', limit: 8 });
    const url = new URL(stub.lastUrl());
    assert.equal(url.searchParams.get('q'), 'new york');
  } finally {
    stub.restore();
  }
});

test('searchCities no altera búsquedas que no son un alias', async () => {
  const stub = stubFetchCapture([]);
  try {
    await searchCities({ countryCode: 'BR', query: 'rio de janeiro', limit: 8 });
    const url = new URL(stub.lastUrl());
    assert.equal(url.searchParams.get('q'), 'rio de janeiro');
  } finally {
    stub.restore();
  }
});

test('searchCities prioriza la coincidencia más relevante y descarta ruido sin relación', async () => {
  const stub = stubFetchCapture([
    {
      place_id: 1,
      lat: '-23.69',
      lon: '-46.55',
      address: { city: 'São Bernardo do Campo', country: 'Brasil', country_code: 'br' },
    },
    {
      place_id: 2,
      lat: '-23.55',
      lon: '-46.63',
      address: { city: 'São Paulo', country: 'Brasil', country_code: 'br' },
    },
  ]);
  try {
    const cities = await searchCities({ countryCode: 'BR', query: 'sao paulo', limit: 8 });
    assert.equal(cities[0].name, 'São Paulo');
    assert.equal(cities.length, 1);
  } finally {
    stub.restore();
  }
});

test('searchCities recupera Valdivia desde resultados libres de un prefijo y deduplica la ciudad', async () => {
  const stub = stubFetchCapture([
    {
      place_id: 915341,
      lat: '-39.8141262',
      lon: '-73.2459859',
      importance: 0.54,
      addresstype: 'city',
      name: 'Valdivia',
      address: { city: 'Valdivia', state: 'Región de Los Ríos', country: 'Chile', country_code: 'cl' },
    },
    {
      place_id: 950152,
      lat: '-39.82',
      lon: '-73.24',
      importance: 0.1,
      name: 'Hostal Valdi',
      address: { city: 'VALDIVIA', state: 'Región de Los Ríos', country: 'Chile', country_code: 'cl' },
    },
  ]);
  try {
    const cities = await searchCities({ countryCode: 'CL', query: 'valdi', limit: 8 });
    const url = new URL(stub.lastUrl());
    assert.equal(url.searchParams.get('q'), 'valdi');
    assert.equal(url.searchParams.get('countrycodes'), 'cl');
    assert.equal(cities.length, 1);
    assert.equal(cities[0].name, 'Valdivia');
    assert.equal(cities[0].countryCode, 'CL');
    assert.equal(cities[0].timezone, 'America/Santiago');
  } finally {
    stub.restore();
  }
});

test('searchCities combina fallback para va y prioriza prefijos sobre coincidencias parciales', async () => {
  const stub = stubFetchOnce([
    {
      place_id: 400,
      lat: '-33.04',
      lon: '-71.63',
      importance: 0.9,
      address: { city: 'Naval', country: 'Chile', country_code: 'cl' },
    },
  ]);
  try {
    const cities = await searchCities({ countryCode: 'CL', query: 'va', limit: 8 });
    const names = cities.map(({ name }) => name);
    assert.deepEqual(new Set(names.slice(0, 3)), new Set(['Valdivia', 'Valparaíso', 'Vallenar']));
    assert.ok(names.indexOf('Naval') > 2);
  } finally {
    stub.restore();
  }
});

test('searchCities devuelve prefijos co aunque el proveedor responda vacío', async () => {
  const stub = stubFetchOnce([]);
  try {
    const cities = await searchCities({ countryCode: 'CL', query: 'co', limit: 8 });
    assert.deepEqual(cities.map(({ name }) => name), ['Concepción', 'Copiapó', 'Coquimbo']);
  } finally {
    stub.restore();
  }
});

test('searchCities conserva el proveedor como fuente principal y deduplica el fallback', async () => {
  const stub = stubFetchOnce([
    {
      place_id: 915341,
      lat: '-39.8141262',
      lon: '-73.2459859',
      importance: 0.54,
      address: { city: 'Valdivia', state: 'Región de Los Ríos', country: 'Chile', country_code: 'cl' },
    },
  ]);
  try {
    const cities = await searchCities({ countryCode: 'CL', query: 'va', limit: 8 });
    const valdivias = cities.filter(({ name }) => name === 'Valdivia');
    assert.equal(valdivias.length, 1);
    assert.equal(valdivias[0].id, '915341');
  } finally {
    stub.restore();
  }
});

test('searchCities aplica countryCode también al normalizar resultados del proveedor', async () => {
  const stub = stubFetchOnce([
    {
      place_id: 1,
      lat: '-39.82',
      lon: '-73.24',
      address: { city: 'Valdivia', country: 'Chile', country_code: 'cl' },
    },
    {
      place_id: 2,
      lat: '40.0',
      lon: '-3.0',
      address: { city: 'Valdivia', country: 'España', country_code: 'es' },
    },
  ]);
  try {
    const cities = await searchCities({ countryCode: 'CL', query: 'valdivia', limit: 8 });
    assert.equal(cities.length, 1);
    assert.equal(cities[0].countryCode, 'CL');
  } finally {
    stub.restore();
  }
});

test('searchPlaces distingue hoteles de direcciones genéricas', async () => {
  const stub = stubFetchOnce([
    {
      place_id: 501,
      lat: '-34.6',
      lon: '-58.38',
      class: 'tourism',
      type: 'hotel',
      display_name: 'Hotel Aurora, Palermo, Buenos Aires',
      address: { suburb: 'Palermo' },
    },
    {
      place_id: 502,
      lat: '-34.61',
      lon: '-58.39',
      class: 'building',
      type: 'yes',
      display_name: 'Av. Siempre Viva 123, Buenos Aires',
    },
  ]);
  try {
    const places = await searchPlaces({ countryCode: 'AR', cityName: 'Buenos Aires', query: 'hotel aurora', limit: 8 });
    assert.equal(places[0].type, 'hotel');
    assert.equal(places[0].neighborhood, 'Palermo');
    assert.equal(places[1].type, 'address');
  } finally {
    stub.restore();
  }
});
