import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tripUrl } from './tripsList.js';

test('tripUrl arma el link hacia experience.html con el tripId', () => {
  assert.equal(tripUrl('abc123'), '/experience.html?tripId=abc123');
});

test('tripUrl escapa el tripId para no romper la query string', () => {
  assert.equal(tripUrl('a b&c'), '/experience.html?tripId=a%20b%26c');
});
