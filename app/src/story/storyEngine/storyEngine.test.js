import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStoryView, StoryMode } from './storyEngine.js';
import { ChapterStatus } from '../storyProgress/storyProgress.js';

function fixturePackage({ withSpecialChapter = true } = {}) {
  return {
    metadata: { travelDates: { start: '2026-07-18', end: '2026-07-19' } },
    unlockRulesDefault: { requiresDateReached: true, requiresPreviousChapterCompleted: true },
    chapters: [
      { id: 'chapter-1', order: 1, title: 'Día 1', unlockRule: { requiresPreviousChapterCompleted: false } },
      { id: 'chapter-2', order: 2, title: 'Día 2' },
    ],
    ...(withSpecialChapter
      ? { specialChapter: { id: 'chapter-epilogue', order: 3, title: 'Epílogo', date: '2026-07-22' } }
      : {}),
  };
}

test('currentMode es pre_trip antes de que el primer capítulo se desbloquee', () => {
  const view = getStoryView(fixturePackage(), { now: '2026-07-01' });
  assert.equal(view.currentMode, StoryMode.PRE_TRIP);
  assert.equal(view.visibleChapter, null);
  assert.deepEqual(view.lockedChapters, ['chapter-1', 'chapter-2']);
});

test('currentMode es in_progress con un capítulo disponible, y visibleChapter trae su estado', () => {
  const view = getStoryView(fixturePackage(), { now: '2026-07-18' });
  assert.equal(view.currentMode, StoryMode.IN_PROGRESS);
  assert.equal(view.visibleChapter.id, 'chapter-1');
  assert.equal(view.visibleChapter.status, ChapterStatus.AVAILABLE);
  assert.equal(view.visibleChapter.title, 'Día 1');
  assert.deepEqual(view.availableChapters, ['chapter-1']);
});

test('un capítulo started se sigue viendo como visibleChapter, con status started', () => {
  const view = getStoryView(fixturePackage(), {
    now: '2026-07-18',
    chapterStatuses: { 'chapter-1': ChapterStatus.STARTED },
  });
  assert.equal(view.visibleChapter.id, 'chapter-1');
  assert.equal(view.visibleChapter.status, ChapterStatus.STARTED);
  assert.deepEqual(view.availableChapters, ['chapter-1']);
});

test('currentMode es epilogue cuando los capítulos regulares están completos y el especial no', () => {
  const view = getStoryView(fixturePackage(), {
    now: '2026-07-20', // antes de la fecha del epílogo
    chapterStatuses: { 'chapter-1': ChapterStatus.COMPLETED, 'chapter-2': ChapterStatus.COMPLETED },
  });
  assert.equal(view.currentMode, StoryMode.EPILOGUE);
  assert.equal(view.visibleChapter.id, 'chapter-epilogue');
  assert.equal(view.visibleChapter.status, ChapterStatus.LOCKED);
  assert.equal(view.specialChapterStatus, ChapterStatus.LOCKED);
  assert.equal(view.memoryModeAvailable, false);
});

test('currentMode es memory_mode cuando el capítulo especial está completado', () => {
  const view = getStoryView(fixturePackage(), {
    now: '2026-07-22',
    chapterStatuses: {
      'chapter-1': ChapterStatus.COMPLETED,
      'chapter-2': ChapterStatus.COMPLETED,
      'chapter-epilogue': ChapterStatus.COMPLETED,
    },
  });
  assert.equal(view.currentMode, StoryMode.MEMORY_MODE);
  assert.equal(view.visibleChapter, null);
  assert.equal(view.memoryModeAvailable, true);
});

test('currentMode es memory_mode sin capítulo especial, al completar todos los regulares', () => {
  const view = getStoryView(fixturePackage({ withSpecialChapter: false }), {
    now: '2026-07-19',
    chapterStatuses: { 'chapter-1': ChapterStatus.COMPLETED, 'chapter-2': ChapterStatus.COMPLETED },
  });
  assert.equal(view.currentMode, StoryMode.MEMORY_MODE);
  assert.equal(view.specialChapterStatus, null);
  assert.equal(view.memoryModeAvailable, true);
});

test('nextUnlock apunta al próximo capítulo bloqueado, incluyendo el especial si corresponde', () => {
  const view = getStoryView(fixturePackage(), { now: '2026-07-01' });
  assert.equal(view.nextUnlock.chapterId, 'chapter-1');
  assert.equal(view.nextUnlock.date.toISOString().slice(0, 10), '2026-07-18');
});

test('nextUnlock es null cuando ya no queda ningún capítulo bloqueado', () => {
  const view = getStoryView(fixturePackage(), {
    now: '2026-07-22',
    chapterStatuses: {
      'chapter-1': ChapterStatus.COMPLETED,
      'chapter-2': ChapterStatus.COMPLETED,
      'chapter-epilogue': ChapterStatus.COMPLETED,
    },
  });
  assert.equal(view.nextUnlock, null);
});
