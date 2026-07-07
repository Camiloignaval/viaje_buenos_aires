import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStoryProgress, ChapterStatus } from './storyProgress.js';

function twoChapterPackage(overrides = {}) {
  return {
    metadata: { travelDates: { start: '2026-07-18', end: '2026-07-19' } },
    unlockRulesDefault: { requiresDateReached: true, requiresPreviousChapterCompleted: true },
    chapters: [
      { id: 'chapter-1', order: 1, title: 'Día 1', unlockRule: { requiresPreviousChapterCompleted: false } },
      { id: 'chapter-2', order: 2, title: 'Día 2' },
    ],
    ...overrides,
  };
}

test('un capítulo permanece bloqueado si la fecha todavía no llegó', () => {
  const pkg = twoChapterPackage();
  const progress = getStoryProgress(pkg, { now: '2026-07-17' });
  assert.equal(progress['chapter-1'], ChapterStatus.LOCKED);
});

test('un capítulo pasa a disponible cuando la fecha llega y el anterior está finalizado', () => {
  const pkg = twoChapterPackage();
  const progress = getStoryProgress(pkg, {
    now: '2026-07-19',
    chapterStatuses: { 'chapter-1': ChapterStatus.COMPLETED },
  });
  assert.equal(progress['chapter-2'], ChapterStatus.AVAILABLE);
});

test('un capítulo permanece bloqueado si la fecha llegó pero el anterior no está finalizado', () => {
  const pkg = twoChapterPackage();
  const progress = getStoryProgress(pkg, { now: '2026-07-19' }); // sin chapter-1 completado
  assert.equal(progress['chapter-2'], ChapterStatus.LOCKED);
});

test('un capítulo Started nunca vuelve a Locked ni a Available', () => {
  const pkg = twoChapterPackage();
  const progress = getStoryProgress(pkg, {
    now: '2026-07-10', // antes de la fecha de desbloqueo
    chapterStatuses: { 'chapter-1': ChapterStatus.STARTED },
  });
  assert.equal(progress['chapter-1'], ChapterStatus.STARTED);
});

test('el capítulo especial se desbloquea contra su propia date, no contra travelDates.end', () => {
  const pkg = twoChapterPackage({
    specialChapter: {
      id: 'chapter-epilogue',
      order: 3,
      title: 'Epílogo',
      date: '2026-07-22',
    },
  });

  // travelDates.end ya pasó, pero la fecha propia del epílogo todavía no
  const stillLocked = getStoryProgress(pkg, {
    now: '2026-07-20',
    chapterStatuses: { 'chapter-1': ChapterStatus.COMPLETED, 'chapter-2': ChapterStatus.COMPLETED },
  });
  assert.equal(stillLocked['chapter-epilogue'], ChapterStatus.LOCKED);

  const available = getStoryProgress(pkg, {
    now: '2026-07-22',
    chapterStatuses: { 'chapter-1': ChapterStatus.COMPLETED, 'chapter-2': ChapterStatus.COMPLETED },
  });
  assert.equal(available['chapter-epilogue'], ChapterStatus.AVAILABLE);
});

test('el capítulo especial permanece bloqueado si el último capítulo regular no está finalizado, aunque llegue su fecha', () => {
  const pkg = twoChapterPackage({
    specialChapter: { id: 'chapter-epilogue', order: 3, title: 'Epílogo', date: '2026-07-22' },
  });
  const progress = getStoryProgress(pkg, {
    now: '2026-07-22',
    chapterStatuses: { 'chapter-1': ChapterStatus.COMPLETED }, // chapter-2 no completado
  });
  assert.equal(progress['chapter-epilogue'], ChapterStatus.LOCKED);
});
