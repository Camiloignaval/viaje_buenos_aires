import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import {
  BUENOS_AIRES_BOOTSTRAP_KEY,
  bootstrapBuenosAiresTrip,
  buildBuenosAiresTripDocument,
} from './platformBootstrap.js';

function fakeUsers(list) {
  return { async findOne(query) { return list.find((u) => u.email === query.email) ?? null; } };
}

// Fake de trips centrado en un único viaje por bootstrapKey (suficiente para las
// dos operaciones del bootstrap: upsert por clave estable + ensure-owner).
function fakeTrips(seed = null) {
  let store = seed;
  let indexed = false;
  return {
    _get: () => store,
    async createIndex() { indexed = true; },
    _wasIndexed: () => indexed,
    async updateOne(filter, update, opts = {}) {
      // Operación ensure-owner (filtra por members.userId $ne).
      if (filter['members.userId']) {
        if (!store) return { matchedCount: 0 };
        const ownerId = update.$push.members.userId;
        const present = (store.members ?? []).some((m) => String(m.userId) === String(ownerId));
        if (!present) store.members.push(update.$push.members);
        if (update.$set) Object.assign(store, update.$set);
        return { matchedCount: present ? 0 : 1 };
      }
      // Upsert por bootstrapKey.
      if (!store) {
        if (!opts.upsert) return { matchedCount: 0 };
        store = { ...update.$setOnInsert, ...(update.$set ?? {}), _id: new ObjectId() };
        return { matchedCount: 0, upsertedId: store._id, upsertedCount: 1 };
      }
      if (update.$set) Object.assign(store, update.$set);
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async findOne() { return store; },
  };
}

test('buildBuenosAiresTripDocument arma el viaje semilla con owner, ba-2026 y bootstrapKey', () => {
  const ownerId = new ObjectId();
  const doc = buildBuenosAiresTripDocument(ownerId, { now: '2026-07-11T00:00:00.000Z' });
  assert.equal(String(doc.ownerId), String(ownerId));
  assert.equal(doc.members[0].role, 'owner');
  assert.equal(String(doc.members[0].userId), String(ownerId));
  assert.equal(doc.baseStoryId, 'ba-2026');
  assert.equal(doc.bootstrapKey, BUENOS_AIRES_BOOTSTRAP_KEY);
  assert.equal(doc.startDateTime, '2026-07-18T09:30');
});

test('bootstrapBuenosAiresTrip falla claro si el usuario no existe (no lo crea)', async () => {
  await assert.rejects(
    bootstrapBuenosAiresTrip({ email: 'nadie@mail.com', collections: { users: fakeUsers([]), trips: fakeTrips() } }),
    /No existe un usuario con ese correo/,
  );
});

test('bootstrapBuenosAiresTrip crea el viaje la primera vez con owner y ba-2026', async () => {
  const owner = { _id: new ObjectId(), email: 'owner@mail.com' };
  const trips = fakeTrips();
  const result = await bootstrapBuenosAiresTrip({
    email: 'Owner@Mail.com',
    collections: { users: fakeUsers([owner]), trips },
    now: '2026-07-11T00:00:00.000Z',
  });
  assert.equal(result.outcome, 'created');
  const trip = trips._get();
  assert.equal(trip.bootstrapKey, BUENOS_AIRES_BOOTSTRAP_KEY);
  assert.equal(trip.baseStoryId, 'ba-2026');
  assert.equal(String(trip.ownerId), String(owner._id));
  assert.equal(trip.members.some((m) => String(m.userId) === String(owner._id) && m.role === 'owner'), true);
  assert.equal(trips._wasIndexed(), true);
});

test('bootstrapBuenosAiresTrip es idempotente: 2º run no duplica ni pisa las fechas', async () => {
  const owner = { _id: new ObjectId(), email: 'owner@mail.com' };
  const existing = {
    _id: new ObjectId(),
    bootstrapKey: BUENOS_AIRES_BOOTSTRAP_KEY,
    ownerId: owner._id,
    baseStoryId: 'ba-2026',
    startDateTime: '2026-08-01T10:00', // fecha real distinta a la semilla
    endDateTime: '2026-08-05T20:00',
    members: [{ userId: owner._id, role: 'owner', joinedAt: '2026-07-01T00:00:00.000Z' }],
  };
  const trips = fakeTrips(existing);
  const result = await bootstrapBuenosAiresTrip({
    email: 'owner@mail.com',
    collections: { users: fakeUsers([owner]), trips },
    now: '2026-07-11T00:00:00.000Z',
  });
  assert.equal(result.outcome, 'updated');
  const trip = trips._get();
  // No se pisan las fechas reales existentes.
  assert.equal(trip.startDateTime, '2026-08-01T10:00');
  // No se duplica el owner en members.
  assert.equal(trip.members.length, 1);
});

test('bootstrapBuenosAiresTrip agrega al owner a members si un trip previo no lo tenía', async () => {
  const owner = { _id: new ObjectId(), email: 'owner@mail.com' };
  const existing = {
    _id: new ObjectId(),
    bootstrapKey: BUENOS_AIRES_BOOTSTRAP_KEY,
    ownerId: new ObjectId(),
    baseStoryId: 'ba-2026',
    members: [], // sin owner
  };
  const trips = fakeTrips(existing);
  await bootstrapBuenosAiresTrip({
    email: 'owner@mail.com',
    collections: { users: fakeUsers([owner]), trips },
    now: '2026-07-11T00:00:00.000Z',
  });
  const trip = trips._get();
  assert.equal(trip.members.length, 1);
  assert.equal(String(trip.members[0].userId), String(owner._id));
  assert.equal(String(trip.ownerId), String(owner._id));
});
