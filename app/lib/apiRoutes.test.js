import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiRoutes } from './apiRoutes.js';

test('apiRoutes registra el endpoint Weather una sola vez', () => {
  const weatherRoutes = apiRoutes.filter((route) => route.path === '/api/context/weather');

  assert.equal(weatherRoutes.length, 1);
  assert.equal(typeof weatherRoutes[0].handler, 'function');
});
