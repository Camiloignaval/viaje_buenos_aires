import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import {
  MVP_BASE_STORY_ID,
  createTripDocument,
  normalizeTripInput,
  normalizeTripPatch,
  publicTripDetail,
  publicTripSummary,
} from './platformTrips.js';

test('normalizeTripInput fuerza ba-2026 como baseStoryId MVP', () => {
  assert.deepEqual(normalizeTripInput({ title: ' Buenos Aires ', destination: ' CABA ', baseStoryId: 'otro' }), {
    title: 'Buenos Aires',
    destination: 'CABA',
    baseStoryId: MVP_BASE_STORY_ID,
  });
});

test('createTripDocument deja al creador como owner y member owner', () => {
  const userId = new ObjectId();
  const trip = createTripDocument(
    { title: 'Buenos Aires', destination: 'Buenos Aires' },
    userId,
    { now: '2026-07-09T12:00:00.000Z' }
  );

  assert.equal(String(trip.ownerId), String(userId));
  assert.equal(trip.members.length, 1);
  assert.equal(String(trip.members[0].userId), String(userId));
  assert.equal(trip.members[0].role, 'owner');
  assert.equal(trip.status, 'active');
});

test('normalizeTripPatch permite solo title, destination y status válidos', () => {
  assert.deepEqual(
    normalizeTripPatch({ title: ' Nuevo ', destination: ' Córdoba ', status: 'archived', ignored: true }),
    { title: 'Nuevo', destination: 'Córdoba', status: 'archived' }
  );
  assert.throws(() => normalizeTripPatch({ status: 'deleted' }), /Status de viaje inválido/);
});

test('publicTripSummary y publicTripDetail devuelven formato API con role del usuario', () => {
  const userId = new ObjectId();
  const trip = {
    _id: new ObjectId(),
    title: 'Buenos Aires',
    destination: 'Buenos Aires',
    baseStoryId: 'ba-2026',
    status: 'active',
    updatedAt: '2026-07-09T12:00:00.000Z',
    createdAt: '2026-07-09T11:00:00.000Z',
    members: [{ userId, role: 'owner', joinedAt: '2026-07-09T11:00:00.000Z' }],
  };

  assert.deepEqual(publicTripSummary(trip, userId), {
    id: String(trip._id),
    title: 'Buenos Aires',
    destination: 'Buenos Aires',
    baseStoryId: 'ba-2026',
    status: 'active',
    role: 'owner',
    updatedAt: '2026-07-09T12:00:00.000Z',
  });
  assert.equal(publicTripDetail(trip, userId).members[0].userId, String(userId));
});
