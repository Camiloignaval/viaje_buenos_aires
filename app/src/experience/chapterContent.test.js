import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPlaceById,
  getUnreferencedRelatedPlaces,
  getChapterPhotoSpots,
  getChapterCollectionItems,
  resolveChapterContent,
} from './chapterContent.js';

function fixturePackage() {
  return {
    placesCatalog: {
      restaurants: [{ id: 'rest-1', name: 'Restaurante de prueba', relatedChapterId: 'chapter-1' }],
      cafes: [{ id: 'cafe-1', name: 'Café de prueba' }],
    },
    photoSpots: [
      { id: 'spot-1', title: 'Spot 1', relatedChapterId: 'chapter-1' },
      { id: 'spot-2', title: 'Spot 2', relatedChapterId: 'chapter-2' },
    ],
    collections: [
      {
        id: 'col-1',
        title: 'Colección de prueba',
        items: [
          { id: 'item-1', name: 'Ítem 1', relatedChapterId: 'chapter-1' },
          { id: 'item-2', name: 'Ítem 2', relatedChapterId: 'chapter-2' },
        ],
      },
    ],
  };
}

const chapter1 = { id: 'chapter-1', activities: [{ id: 'act-1', title: 'Actividad', relatedPlaceId: 'cafe-1' }] };

test('getPlaceById encuentra un lugar en restaurantes o cafeterías', () => {
  const pkg = fixturePackage();
  assert.equal(getPlaceById(pkg, 'cafe-1').name, 'Café de prueba');
  assert.equal(getPlaceById(pkg, 'rest-1').name, 'Restaurante de prueba');
});

test('getPlaceById devuelve null si no existe', () => {
  assert.equal(getPlaceById(fixturePackage(), 'no-existe'), null);
});

test('getPlaceById no rompe si no hay placesCatalog', () => {
  assert.equal(getPlaceById({}, 'cafe-1'), null);
});

test('getUnreferencedRelatedPlaces devuelve solo lugares no referenciados por ninguna actividad', () => {
  const pkg = fixturePackage();
  const result = getUnreferencedRelatedPlaces(pkg, chapter1, new Set(['cafe-1']));
  assert.deepEqual(result.map((p) => p.id), ['rest-1']);
});

test('getChapterPhotoSpots filtra por relatedChapterId', () => {
  const pkg = fixturePackage();
  assert.deepEqual(getChapterPhotoSpots(pkg, chapter1).map((s) => s.id), ['spot-1']);
});

test('getChapterCollectionItems filtra por relatedChapterId entre todas las colecciones', () => {
  const pkg = fixturePackage();
  assert.deepEqual(getChapterCollectionItems(pkg, chapter1).map((i) => i.id), ['item-1']);
});

test('resolveChapterContent no rompe si no hay placesCatalog, photoSpots ni collections', () => {
  const content = resolveChapterContent({}, chapter1);
  assert.deepEqual(content.relatedPlaces, []);
  assert.deepEqual(content.photoSpots, []);
  assert.deepEqual(content.collectionItems, []);
  assert.equal(content.activitiesWithPlaces[0].place, null);
});

test('resolveChapterContent une actividad con su lugar y separa el lugar no referenciado', () => {
  const pkg = fixturePackage();
  const content = resolveChapterContent(pkg, chapter1);
  assert.equal(content.activitiesWithPlaces[0].place.id, 'cafe-1');
  assert.deepEqual(content.relatedPlaces.map((p) => p.id), ['rest-1']);
});

const chapterWithMemories = {
  id: 'chapter-1',
  activities: [
    { id: 'act-1', title: 'Actividad 1' },
    { id: 'act-2', title: 'Actividad 2' },
  ],
  suggestedMemories: [
    { id: 'mem-1', relatedActivityId: 'act-1', type: 'photo', prompt: 'Prompt 1' },
    { id: 'mem-2', relatedActivityId: 'act-1', type: 'video', prompt: 'Prompt 2' },
    { id: 'mem-3', relatedActivityId: null, type: 'photo', prompt: 'Prompt sin actividad' },
    { id: 'mem-4', relatedActivityId: 'act-no-existe', type: 'photo', prompt: 'Prompt huérfano' },
  ],
};

test('resolveChapterContent agrupa los recuerdos sugeridos por actividad', () => {
  const content = resolveChapterContent({}, chapterWithMemories);
  const act1 = content.activitiesWithPlaces.find((a) => a.activity.id === 'act-1');
  const act2 = content.activitiesWithPlaces.find((a) => a.activity.id === 'act-2');
  assert.deepEqual(act1.suggestedMemories.map((m) => m.id), ['mem-1', 'mem-2']);
  assert.deepEqual(act2.suggestedMemories, []);
});

test('resolveChapterContent deja como no asignados los recuerdos sin actividad o con una actividad inexistente', () => {
  const content = resolveChapterContent({}, chapterWithMemories);
  assert.deepEqual(
    content.unassignedSuggestedMemories.map((m) => m.id),
    ['mem-3', 'mem-4']
  );
});
