import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDaysBetween,
  countdownAnchorForCalendarDate,
  getStoryProgress,
  ChapterStatus,
} from './storyProgress.js';

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

test('hoy desbloquea aunque la hora sea temprano o tarde', () => {
  const pkg = twoChapterPackage();
  assert.equal(getStoryProgress(pkg, { now: '2026-07-18T00:01:00-04:00' })['chapter-1'], ChapterStatus.AVAILABLE);
  assert.equal(getStoryProgress(pkg, { now: '2026-07-18T23:59:00-04:00' })['chapter-1'], ChapterStatus.AVAILABLE);
});

test('mañana, 8 días y 30 días se calculan por calendario', () => {
  assert.equal(calendarDaysBetween('2026-07-17T23:59:00-04:00', '2026-07-18'), 1);
  assert.equal(calendarDaysBetween('2026-07-10T23:59:00-04:00', '2026-07-18'), 8);
  assert.equal(calendarDaysBetween('2026-07-10T00:01:00-04:00', '2026-08-09'), 30);
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
  const progress = getStoryProgress(pkg, { now: '2026-07-19' });
  assert.equal(progress['chapter-2'], ChapterStatus.LOCKED);
});

test('un capítulo Started nunca vuelve a Locked ni a Available', () => {
  const pkg = twoChapterPackage();
  const progress = getStoryProgress(pkg, {
    now: '2026-07-10',
    chapterStatuses: { 'chapter-1': ChapterStatus.STARTED },
  });
  assert.equal(progress['chapter-1'], ChapterStatus.STARTED);
});

test('un viaje iniciado conserva el capítulo actual disponible y el siguiente bloqueado', () => {
  const pkg = twoChapterPackage();
  const progress = getStoryProgress(pkg, { now: '2026-07-18T12:00:00-04:00' });
  assert.equal(progress['chapter-1'], ChapterStatus.AVAILABLE);
  assert.equal(progress['chapter-2'], ChapterStatus.LOCKED);
});

test('un viaje terminado conserva todos los capítulos completos', () => {
  const pkg = twoChapterPackage();
  const progress = getStoryProgress(pkg, {
    now: '2026-07-20T12:00:00-04:00',
    chapterStatuses: { 'chapter-1': ChapterStatus.COMPLETED, 'chapter-2': ChapterStatus.COMPLETED },
  });
  assert.equal(progress['chapter-1'], ChapterStatus.COMPLETED);
  assert.equal(progress['chapter-2'], ChapterStatus.COMPLETED);
});

test('timezone explícito no se convierte a otra fecha calendario', () => {
  const pkg = twoChapterPackage();
  assert.equal(getStoryProgress(pkg, { now: '2026-07-18T00:15:00+14:00' })['chapter-1'], ChapterStatus.AVAILABLE);
  assert.equal(getStoryProgress(pkg, { now: '2026-07-17T23:45:00-10:00' })['chapter-1'], ChapterStatus.LOCKED);
});

test('el anchor del contador devuelve 8 días exactos para 10 julio → 18 julio', () => {
  const now = '2026-07-10T20:00:00-04:00';
  const anchor = countdownAnchorForCalendarDate('2026-07-18', now);
  const days = Math.ceil((anchor.getTime() - new Date(now).getTime()) / (24 * 60 * 60 * 1000));
  assert.equal(days, 8);
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
    chapterStatuses: { 'chapter-1': ChapterStatus.COMPLETED },
  });
  assert.equal(progress['chapter-epilogue'], ChapterStatus.LOCKED);
});
