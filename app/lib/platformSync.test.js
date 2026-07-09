import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import {
  clientMemoryToDocument,
  mergeTripSyncState,
  normalizeClientMemories,
  publicTripSyncState,
} from './platformSync.js';

test('normalizeClientMemories usa legacyId o id y mantiene compatibilidad local', () => {
  const memories = normalizeClientMemories([
    { id: 'local-1', chapterId: 'chapter-1', note: 'hola', photos: ['p1'], videos: ['v1'] },
    { legacyId: 'legacy-2', id: 'otro', note: 'legacy gana' },
    { note: 'sin id' },
  ]);

  assert.equal(memories.length, 2);
  assert.equal(memories[0].id, 'local-1');
  assert.equal(memories[0].legacyId, 'local-1');
  assert.equal(memories[1].id, 'legacy-2');
});

test('mergeTripSyncState fusiona chapterStatuses sin retroceder', () => {
  const merged = mergeTripSyncState({
    incomingChapterStatuses: { 'chapter-1': 'started' },
    remoteTripState: { chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'started' } },
  });

  assert.deepEqual(merged.chapterStatuses, {
    'chapter-1': 'completed',
    'chapter-2': 'started',
  });
});

test('mergeTripSyncState evita duplicados por tripId + legacyId y gana la Memoria más reciente', () => {
  const merged = mergeTripSyncState({
    incomingMemories: [{ id: 'm1', note: 'local viejo', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }],
    remoteMemories: [{ legacyId: 'm1', note: 'server nuevo', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' }],
  });

  assert.equal(merged.memories.length, 1);
  assert.equal(merged.memories[0].id, 'm1');
  assert.equal(merged.memories[0].note, 'server nuevo');
});

test('clientMemoryToDocument guarda tripId ObjectId y legacyId separado del id local', () => {
  const tripId = new ObjectId();
  const doc = clientMemoryToDocument({ id: 'local-1', note: 'recuerdo' }, tripId);

  assert.equal(String(doc.tripId), String(tripId));
  assert.equal(doc.legacyId, 'local-1');
  assert.equal(doc.note, 'recuerdo');
});

test('publicTripSyncState devuelve Memorias compatibles con el cliente local sin _id ni tripId', () => {
  const state = publicTripSyncState({
    chapterStatuses: { 'chapter-1': 'completed' },
    memories: [{ id: 'm1', legacyId: 'm1', tripId: new ObjectId(), note: 'queda', photos: [], videos: [], favorite: false, archived: false }],
  });

  assert.deepEqual(Object.keys(state.memories[0]).sort(), [
    'activityId',
    'archived',
    'chapterId',
    'createdAt',
    'favorite',
    'id',
    'note',
    'photos',
    'storyId',
    'updatedAt',
    'videos',
  ].sort());
  assert.equal(state.memories[0].id, 'm1');
});
