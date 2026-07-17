import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buenosAiresStoryManifest } from '../src/content/stories/buenos-aires-2026/manifest.js';
import {
  createStoryRegistry,
  getBaseStory,
  isBaseStoryCompatibleWithTrip,
  isRegisteredBaseStory,
  listBaseStories,
  listBaseStoryIds,
} from './platformStories.js';

const BA_ID = 'ba-2026';
const compatibleTrip = {
  destination: { countryCode: 'AR', cityName: 'Buenos Aires' },
  startDateTime: '2026-07-18T09:30',
  endDateTime: '2026-07-21T22:00',
};

test('catálogo por manifests expone el paquete editorial publicado', async () => {
  const stories = await listBaseStories();
  const ba = stories.find((story) => story.storyId === BA_ID);
  assert.equal(ba.packageStoryId, 'story-ba-2026');
  assert.equal(ba.immutable, true);
  assert.equal(ba.source, 'base');
  assert.match(ba.mediaBasePath, /buenos-aires-2026\/media/);
});

test('getBaseStory traduce catalogId a StoryPackage.storyId sin confundir identidades', async () => {
  const story = await getBaseStory(BA_ID);
  assert.equal(story.storyId, BA_ID);
  assert.equal(story.storyPackage.storyId, 'story-ba-2026');
  assert.equal(story.storyPackage.metadata.destination, 'Buenos Aires');
});

test('id desconocido devuelve null y nunca usa una historia default', async () => {
  assert.equal(await getBaseStory('destino-inexistente'), null);
  assert.equal(await getBaseStory(undefined), null);
  assert.equal(isRegisteredBaseStory('destino-inexistente'), false);
  assert.deepEqual(listBaseStoryIds(), [BA_ID]);
});

test('compatibilidad valida destino y fechas pero no selecciona historias', () => {
  assert.equal(isBaseStoryCompatibleWithTrip(BA_ID, compatibleTrip), true);
  assert.equal(isBaseStoryCompatibleWithTrip(BA_ID, { ...compatibleTrip, destination: { countryCode: 'FR', cityName: 'Paris' } }), false);
  assert.equal(isBaseStoryCompatibleWithTrip(BA_ID, { ...compatibleTrip, startDateTime: '2026-08-01T09:30' }), false);
});

test('la media requerida por el paquete existe bajo su namespace editorial', async () => {
  for (const reference of buenosAiresStoryManifest.media.required) {
    assert.ok(reference.startsWith(`${buenosAiresStoryManifest.media.basePath}/`));
    await access(resolve('public', reference));
  }
});

function manifest(catalogId) {
  return {
    catalogId,
    storyPackageId: `story-${catalogId}`,
    status: 'published',
    packageUrl: new URL(`file:///${catalogId}.json`),
    selection: { title: catalogId, destination: 'Ejemplo' },
    compatibility: {},
    media: { basePath: `content/${catalogId}`, required: [] },
  };
}

test('createStoryRegistry es extensible por datos y rechaza ids duplicados', () => {
  const registry = createStoryRegistry([manifest('story-a'), manifest('story-b')]);
  assert.equal(registry.size, 2);
  assert.throws(() => createStoryRegistry([manifest('story-a'), manifest('story-a')]), /id duplicado/);
});
