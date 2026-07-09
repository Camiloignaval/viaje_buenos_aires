import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_STORY_IMMUTABLE,
  MVP_BASE_STORY_ID,
  getBaseStory,
  listBaseStories,
  publicBaseStorySummary,
} from './platformStories.js';

test('listBaseStories expone Buenos Aires como story base immutable', async () => {
  const stories = await listBaseStories();

  assert.equal(stories.length, 1);
  assert.equal(stories[0].storyId, MVP_BASE_STORY_ID);
  assert.equal(stories[0].packageStoryId, 'story-ba-2026');
  assert.equal(stories[0].immutable, true);
  assert.equal(stories[0].source, 'base');
});

test('getBaseStory devuelve el Story Package real solo para ba-2026', async () => {
  const story = await getBaseStory(MVP_BASE_STORY_ID);

  assert.equal(story.storyId, MVP_BASE_STORY_ID);
  assert.equal(story.immutable, BASE_STORY_IMMUTABLE);
  assert.equal(story.storyPackage.storyId, 'story-ba-2026');
  assert.equal(story.storyPackage.metadata.destination, 'Buenos Aires');
  assert.equal(await getBaseStory('otra'), null);
});

test('publicBaseStorySummary no muta ni reemplaza el storyId interno del package', () => {
  const summary = publicBaseStorySummary({
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
