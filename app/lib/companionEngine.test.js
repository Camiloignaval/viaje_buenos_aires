import assert from 'node:assert/strict';
import test from 'node:test';
import { companionEventForTrip, selectCompanionEvents } from './companionEngine.js';

const trip = { id: 'ba-1', destination: { cityName: 'Buenos Aires' }, startDateTime: '2026-07-15T12:00:00Z', endDateTime: '2026-07-18T12:00:00Z' };
const preferences = { enabled: true, beforeTrip: true, duringTrip: true, afterTrip: true, futureMemories: true };

test('companion engine selecciona eventos por fecha local y preferencias', () => {
  assert.equal(companionEventForTrip({ trip, preferences, now: new Date('2026-07-14T15:00:00Z'), timeZone: 'America/Argentina/Buenos_Aires' }).type, 'before-trip');
  assert.equal(companionEventForTrip({ trip, preferences, now: new Date('2026-07-15T15:00:00Z'), timeZone: 'America/Argentina/Buenos_Aires' }).type, 'start');
  assert.equal(companionEventForTrip({ trip, preferences: { ...preferences, duringTrip: false }, now: new Date('2026-07-15T15:00:00Z'), timeZone: 'America/Argentina/Buenos_Aires' }), null);
});

test('companion engine no duplica eventos ya registrados', () => {
  const events = selectCompanionEvents({ trips: [trip], preferences, now: new Date('2026-07-15T15:00:00Z'), timeZone: 'America/Argentina/Buenos_Aires', sentKeys: new Set(['ba-1:start:2026-07-15']) });
  assert.deepEqual(events, []);
});
