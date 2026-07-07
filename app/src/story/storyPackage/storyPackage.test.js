import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadStoryPackage, StoryPackageValidationError } from './storyPackage.js';

function minimalPackage(overrides = {}) {
  return {
    storyId: 'story-test-001',
    schemaVersion: '1.4',
    metadata: {
      destination: 'Ciudad Ejemplo',
      title: 'Un viaje',
      travelDates: { start: '2027-01-01', end: '2027-01-03' },
      language: 'es',
    },
    storyMood: { primary: 'adventure' },
    unlockRulesDefault: { requiresDateReached: true, requiresPreviousChapterCompleted: true },
    chapters: [{ id: 'chapter-1', order: 1, title: 'Día 1' }],
    baseCopy: {
      welcomeMessage: 'Bienvenida',
      dailyOpenTemplate: 'Abrir',
      dailyCloseTemplate: 'Cerrar',
    },
    ...overrides,
  };
}

test('acepta un Story Package simulado con la forma mínima', () => {
  const pkg = loadStoryPackage(minimalPackage());
  assert.equal(pkg.storyId, 'story-test-001');
});

test('rechaza un Story Package sin storyId', () => {
  const { storyId, ...withoutStoryId } = minimalPackage();
  assert.throws(() => loadStoryPackage(withoutStoryId), StoryPackageValidationError);
});

test('rechaza metadata sin travelDates.end', () => {
  const pkg = minimalPackage();
  delete pkg.metadata.travelDates.end;
  assert.throws(() => loadStoryPackage(pkg), StoryPackageValidationError);
});

test('rechaza storyMood sin primary', () => {
  const pkg = minimalPackage({ storyMood: {} });
  assert.throws(() => loadStoryPackage(pkg), StoryPackageValidationError);
});

test('rechaza chapters vacío', () => {
  const pkg = minimalPackage({ chapters: [] });
  assert.throws(() => loadStoryPackage(pkg), StoryPackageValidationError);
});

test('rechaza un capítulo sin order', () => {
  const pkg = minimalPackage({ chapters: [{ id: 'chapter-1', title: 'Día 1' }] });
  assert.throws(() => loadStoryPackage(pkg), StoryPackageValidationError);
});

test('acepta un specialChapter con la forma completa', () => {
  const pkg = minimalPackage({
    specialChapter: {
      id: 'chapter-epilogue',
      order: 2,
      title: 'Epílogo',
      date: '2027-01-10',
      kind: 'epilogue',
      breaksNarrativeRules: { hasSchedule: false, hasMap: false, hasItinerary: false },
      prompts: [],
    },
  });
  assert.equal(loadStoryPackage(pkg).specialChapter.kind, 'epilogue');
});

test('rechaza un specialChapter sin date', () => {
  const pkg = minimalPackage({
    specialChapter: {
      id: 'chapter-epilogue',
      order: 2,
      title: 'Epílogo',
      kind: 'epilogue',
      breaksNarrativeRules: { hasSchedule: false, hasMap: false, hasItinerary: false },
      prompts: [],
    },
  });
  assert.throws(() => loadStoryPackage(pkg), StoryPackageValidationError);
});
