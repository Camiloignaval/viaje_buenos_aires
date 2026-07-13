import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchCityPrefixFallback } from './cityPrefixFallback.js';

test('fallback de Chile resuelve prefijos cortos de forma general', () => {
  assert.deepEqual(
    searchCityPrefixFallback('CL', 'va').map(({ city }) => city.name),
    ['Valdivia', 'Valparaíso', 'Vallenar'],
  );
  assert.deepEqual(
    searchCityPrefixFallback('cl', 'co').map(({ city }) => city.name),
    ['Concepción', 'Copiapó', 'Coquimbo'],
  );
  assert.deepEqual(
    searchCityPrefixFallback('CL', 'pu').map(({ city }) => city.name),
    ['Puerto Montt', 'Punta Arenas'],
  );
});

test('fallback respeta país, normaliza acentos y cubre Argentina y Brasil', () => {
  assert.deepEqual(searchCityPrefixFallback('AR', 'bu').map(({ city }) => city.name), ['Buenos Aires']);
  assert.deepEqual(searchCityPrefixFallback('AR', 'me').map(({ city }) => city.name), ['Mendoza']);
  assert.deepEqual(searchCityPrefixFallback('BR', 'ri').map(({ city }) => city.name), ['Rio de Janeiro']);
  assert.deepEqual(
    searchCityPrefixFallback('BR', 'sa').map(({ city }) => city.name),
    ['São Paulo', 'Salvador'],
  );
  assert.deepEqual(searchCityPrefixFallback('CL', 'são'), []);
});

test('fallback no responde con menos de dos caracteres ni códigos inválidos', () => {
  assert.deepEqual(searchCityPrefixFallback('CL', 'v'), []);
  assert.deepEqual(searchCityPrefixFallback('CHL', 'va'), []);
});
