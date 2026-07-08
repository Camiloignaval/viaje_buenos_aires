import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeChapterStatuses, mergeMemories } from './syncMerge.js';

test('mergeChapterStatuses: un capítulo solo de un lado se conserva tal cual', () => {
  const merged = mergeChapterStatuses({ 'chapter-1': 'available' }, {});
  assert.deepEqual(merged, { 'chapter-1': 'available' });
});

test('mergeChapterStatuses: ante conflicto, gana el estado más avanzado (nunca retrocede)', () => {
  assert.deepEqual(
    mergeChapterStatuses({ 'chapter-1': 'completed' }, { 'chapter-1': 'started' }),
    { 'chapter-1': 'completed' }
  );
  assert.deepEqual(
    mergeChapterStatuses({ 'chapter-1': 'available' }, { 'chapter-1': 'completed' }),
    { 'chapter-1': 'completed' }
  );
});

test('mergeChapterStatuses: capítulos de ambos lados se combinan todos', () => {
  const merged = mergeChapterStatuses({ 'chapter-1': 'completed' }, { 'chapter-2': 'available' });
  assert.deepEqual(merged, { 'chapter-1': 'completed', 'chapter-2': 'available' });
});

test('mergeMemories: una Memoria que solo existe de un lado se conserva', () => {
  const local = [{ id: 'mem-1', note: 'Local.', createdAt: '2027-01-10T09:00:00Z' }];
  const merged = mergeMemories(local, []);
  assert.deepEqual(merged, local);
});

test('mergeMemories: ante el mismo id en ambos lados, gana la más reciente por updatedAt', () => {
  const local = [{ id: 'mem-1', note: 'Vieja.', favorite: false, createdAt: '2027-01-10T09:00:00Z', updatedAt: '2027-01-10T09:00:00Z' }];
  const remote = [{ id: 'mem-1', note: 'Vieja.', favorite: true, createdAt: '2027-01-10T09:00:00Z', updatedAt: '2027-01-10T10:00:00Z' }];
  const merged = mergeMemories(local, remote);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].favorite, true);
});

test('mergeMemories: sin updatedAt, usa createdAt como respaldo', () => {
  const local = [{ id: 'mem-1', note: 'A.', createdAt: '2027-01-10T09:00:00Z' }];
  const remote = [{ id: 'mem-1', note: 'B.', createdAt: '2027-01-10T10:00:00Z' }];
  const merged = mergeMemories(local, remote);
  assert.equal(merged[0].note, 'B.');
});

test('mergeMemories: Memorias con ids distintos de ambos lados se combinan todas', () => {
  const local = [{ id: 'mem-1', note: 'Local.', createdAt: '2027-01-10T09:00:00Z' }];
  const remote = [{ id: 'mem-2', note: 'Remota.', createdAt: '2027-01-10T09:00:00Z' }];
  const merged = mergeMemories(local, remote);
  assert.equal(merged.length, 2);
});
