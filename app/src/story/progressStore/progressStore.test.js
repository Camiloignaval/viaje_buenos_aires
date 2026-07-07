import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  progressKey,
  loadProgress,
  saveProgress,
  markChapterStarted,
  markChapterCompleted,
} from './progressStore.js';
import { ChapterStatus } from '../storyProgress/storyProgress.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
  };
}

test('progressKey namespacea por storyId', () => {
  assert.equal(progressKey('story-a'), 'aurora:progress:story-a');
  assert.notEqual(progressKey('story-a'), progressKey('story-b'));
});

test('loadProgress devuelve {} si no hay nada guardado', () => {
  assert.deepEqual(loadProgress('story-a', fakeStorage()), {});
});

test('saveProgress + loadProgress hacen round-trip', () => {
  const storage = fakeStorage();
  saveProgress('story-a', { 'chapter-1': ChapterStatus.STARTED }, storage);
  assert.deepEqual(loadProgress('story-a', storage), { 'chapter-1': ChapterStatus.STARTED });
});

test('loadProgress tolera JSON corrupto y devuelve {}', () => {
  const storage = fakeStorage();
  storage.setItem(progressKey('story-a'), '{ esto no es json');
  assert.deepEqual(loadProgress('story-a', storage), {});
});

test('markChapterStarted guarda started', () => {
  const storage = fakeStorage();
  const updated = markChapterStarted('story-a', 'chapter-1', storage);
  assert.equal(updated['chapter-1'], ChapterStatus.STARTED);
  assert.deepEqual(loadProgress('story-a', storage), { 'chapter-1': ChapterStatus.STARTED });
});

test('markChapterStarted no degrada un capítulo ya completed', () => {
  const storage = fakeStorage();
  markChapterCompleted('story-a', 'chapter-1', storage);
  const updated = markChapterStarted('story-a', 'chapter-1', storage);
  assert.equal(updated['chapter-1'], ChapterStatus.COMPLETED);
});

test('markChapterCompleted se permite aunque nunca haya pasado por started', () => {
  const storage = fakeStorage();
  const updated = markChapterCompleted('story-a', 'chapter-1', storage);
  assert.equal(updated['chapter-1'], ChapterStatus.COMPLETED);
});

test('dos storyId distintos no se pisan entre sí', () => {
  const storage = fakeStorage();
  markChapterStarted('story-a', 'chapter-1', storage);
  markChapterCompleted('story-b', 'chapter-1', storage);
  assert.equal(loadProgress('story-a', storage)['chapter-1'], ChapterStatus.STARTED);
  assert.equal(loadProgress('story-b', storage)['chapter-1'], ChapterStatus.COMPLETED);
});
