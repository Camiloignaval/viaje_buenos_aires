import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { PLATFORM_COLLECTIONS, toObjectId } from './platformMongo.js';

test('PLATFORM_COLLECTIONS expone las colecciones MVP de Etapa 3', () => {
  assert.deepEqual(PLATFORM_COLLECTIONS, {
    users: 'users',
    trips: 'trips',
    storyPackages: 'storyPackages',
    tripStates: 'tripStates',
    memories: 'memories',
    mediaAssets: 'mediaAssets',
    storyMedia: 'storyMedia',
    authCodes: 'authCodes',
  });
});

test('toObjectId acepta strings válidos y preserva ObjectId existentes', () => {
  const id = new ObjectId();

  assert.equal(String(toObjectId(String(id))), String(id));
  assert.equal(toObjectId(id), id);
});

test('toObjectId rechaza ids inválidos con nombre de campo', () => {
  assert.throws(() => toObjectId('nope', 'tripId'), /tripId inválido/);
});
