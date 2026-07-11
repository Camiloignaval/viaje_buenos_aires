import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_STORY_IMMUTABLE,
  MVP_BASE_STORY_ID,
  createStoryRegistry,
  getBaseStory,
  isRegisteredBaseStory,
  listBaseStories,
  listBaseStoryIds,
  publicBaseStorySummary,
} from './platformStories.js';

test('listBaseStories expone Buenos Aires como story base immutable', async () => {
  const stories = await listBaseStories();

  const ba = stories.find((story) => story.storyId === MVP_BASE_STORY_ID);
  assert.ok(ba, 'ba-2026 debe estar en el catálogo');
  assert.equal(ba.packageStoryId, 'story-ba-2026');
  assert.equal(ba.immutable, true);
  assert.equal(ba.source, 'base');
});

test('getBaseStory devuelve el Story Package real para ba-2026', async () => {
  const story = await getBaseStory(MVP_BASE_STORY_ID);

  assert.equal(story.storyId, MVP_BASE_STORY_ID);
  assert.equal(story.immutable, BASE_STORY_IMMUTABLE);
  assert.equal(story.storyPackage.storyId, 'story-ba-2026');
  assert.equal(story.storyPackage.metadata.destination, 'Buenos Aires');
});

// Punto 8.4 / spec story-catalog "Unknown Identifiers": un id sin registrar
// devuelve null explícito, sin excepción y sin caer a ninguna historia default.
test('getBaseStory devuelve null explícito ante un id desconocido (sin default, sin throw)', async () => {
  assert.equal(await getBaseStory('destino-inexistente'), null);
  assert.equal(await getBaseStory(undefined), null);
  assert.equal(isRegisteredBaseStory('destino-inexistente'), false);
});

test('isRegisteredBaseStory / listBaseStoryIds reflejan el catálogo real', () => {
  assert.equal(isRegisteredBaseStory(MVP_BASE_STORY_ID), true);
  assert.deepEqual(listBaseStoryIds(), [MVP_BASE_STORY_ID]);
});

test('publicBaseStorySummary usa el id de catálogo, no el storyId interno del package', () => {
  const summary = publicBaseStorySummary('ba-2026', {
    storyId: 'story-ba-2026',
    schemaVersion: '1.4',
    metadata: { title: 'Buenos Aires, 2026', destination: 'Buenos Aires' },
  });

  assert.deepEqual(summary, {
    storyId: 'ba-2026',
    packageStoryId: 'story-ba-2026',
    version: '1.4',
    title: 'Buenos Aires, 2026',
    destination: 'Buenos Aires',
    source: 'base',
    immutable: true,
  });
});

// Punto 8.2 / spec story-catalog: el mecanismo de resolución es genérico por id
// (una lista de entradas), no un `if id === MVP`. Registrar una segunda historia
// es sumar una entrada — sin tocar la lógica de resolución ni ExperiencePage.
test('createStoryRegistry resuelve cualquier cantidad de historias por id (catálogo extensible)', () => {
  const registry = createStoryRegistry([
    ['ba-2026', { packageUrl: 'ba.json' }],
    ['rio-2027', { packageUrl: 'rio.json' }],
  ]);

  assert.equal(registry.size, 2);
  assert.equal(registry.get('ba-2026').packageUrl, 'ba.json');
  assert.equal(registry.get('rio-2027').packageUrl, 'rio.json');
  assert.equal(registry.get('inexistente'), undefined);
});

// Spec story-catalog "Duplicate Identifiers Are Rejected": un id repetido lanza
// error explícito en el arranque y NO pisa la entrada original.
test('createStoryRegistry rechaza ids duplicados con error explícito', () => {
  assert.throws(
    () =>
      createStoryRegistry([
        ['ba-2026', { packageUrl: 'original.json' }],
        ['ba-2026', { packageUrl: 'impostor.json' }],
      ]),
    /id duplicado "ba-2026"/,
  );
});
