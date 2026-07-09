import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORY_MEDIA_SOURCES,
  STORY_MEDIA_STATUSES,
  assertStoryMediaPublishable,
  normalizeStoryMedia,
  resolveAiGeneratedPlaceStatus,
  storyMediaFolder,
  userMediaFolder,
} from './platformMedia.js';

test('media folders separan User Media y Story Media', () => {
  assert.equal(userMediaFolder('trip-1'), 'aurora/trips/trip-1');
  assert.equal(storyMediaFolder('ba-2026'), 'aurora/stories/ba-2026');
});

test('normalizeStoryMedia valida el contrato mínimo editorial', () => {
  const media = normalizeStoryMedia({
    url: 'https://res.cloudinary.com/demo/image/upload/story.jpg',
    alt: 'Una calle de Buenos Aires al atardecer.',
    source: STORY_MEDIA_SOURCES.licensed,
    status: STORY_MEDIA_STATUSES.ready,
    credit: 'Archivo autorizado',
    linkedTo: 'chapter',
  });

  assert.deepEqual(media, {
    url: 'https://res.cloudinary.com/demo/image/upload/story.jpg',
    alt: 'Una calle de Buenos Aires al atardecer.',
    source: 'licensed',
    status: 'ready',
    credit: 'Archivo autorizado',
    linkedTo: 'chapter',
  });
});

test('assertStoryMediaPublishable bloquea historias con Story Media pendiente de revisión', () => {
  assert.throws(
    () =>
      assertStoryMediaPublishable([
        {
          url: 'https://example.com/place.jpg',
          alt: 'Lugar real generado por IA.',
          source: 'ai_generated',
          status: 'needs_review',
          credit: null,
          linkedTo: 'activity',
        },
      ]),
    /solo puede usar Story Media con status ready/
  );
});

test('resolveAiGeneratedPlaceStatus exige revisión cuando IA representa un lugar real', () => {
  assert.equal(resolveAiGeneratedPlaceStatus({ representsRealPlace: true }), 'needs_review');
  assert.equal(resolveAiGeneratedPlaceStatus({ representsRealPlace: false }), 'ready');
});
