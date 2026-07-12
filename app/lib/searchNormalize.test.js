import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearchText, resolveCityQuery, scoreCityMatch } from './searchNormalize.js';

test('normalizeSearchText ignora mayúsculas, acentos y espacios repetidos', () => {
  assert.equal(normalizeSearchText('  Río   DE Janeiro  '), 'rio de janeiro');
  assert.equal(normalizeSearchText('São Paulo'), 'sao paulo');
  assert.equal(normalizeSearchText('BUENOS AIRES'), 'buenos aires');
  assert.equal(normalizeSearchText(''), '');
});

test('resolveCityQuery resuelve alias/apodos conocidos', () => {
  assert.equal(resolveCityQuery('nyc'), 'new york');
  assert.equal(resolveCityQuery('NYC'), 'new york');
  assert.equal(resolveCityQuery('sf'), 'san francisco');
  assert.equal(resolveCityQuery('la'), 'los angeles');
  assert.equal(resolveCityQuery('baires'), 'buenos aires');
  assert.equal(resolveCityQuery('bsas'), 'buenos aires');
  assert.equal(resolveCityQuery('caba'), 'buenos aires');
});

test('resolveCityQuery no toca búsquedas que no son un alias', () => {
  assert.equal(resolveCityQuery('rio de janeiro'), 'rio de janeiro');
  assert.equal(resolveCityQuery('  Santiago '), 'Santiago');
});

test('scoreCityMatch prioriza exacto > empieza con > palabra completa > incluye', () => {
  const q = normalizeSearchText('rio');
  assert.equal(scoreCityMatch('Rio', q), 4);
  assert.equal(scoreCityMatch('Rio de Janeiro', q), 3);
  assert.equal(scoreCityMatch('Puerto Rio Claro', q), 2);
  assert.equal(scoreCityMatch('Marios', q), 1);
  assert.equal(scoreCityMatch('Otra ciudad', q), 0);
});
