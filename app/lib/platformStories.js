import { readFile } from 'node:fs/promises';
import { loadStoryPackage } from '../src/story/storyPackage/storyPackage.js';

export const MVP_BASE_STORY_ID = 'ba-2026';
export const BASE_STORY_SOURCE = 'base';
export const BASE_STORY_IMMUTABLE = true;

const BASE_STORY_PACKAGE_URL = new URL('../src/story/data/story-ba2026.json', import.meta.url);

let cachedBaseStoryPackage = null;

export async function loadBaseStoryPackage() {
  if (!cachedBaseStoryPackage) {
    const raw = JSON.parse(await readFile(BASE_STORY_PACKAGE_URL, 'utf8'));
    cachedBaseStoryPackage = loadStoryPackage(raw);
  }
  return cachedBaseStoryPackage;
}

export function publicBaseStorySummary(storyPackage) {
  return {
    storyId: MVP_BASE_STORY_ID,
    packageStoryId: storyPackage.storyId,
    version: storyPackage.schemaVersion,
    title: storyPackage.metadata.title,
    destination: storyPackage.metadata.destination,
    source: BASE_STORY_SOURCE,
    immutable: BASE_STORY_IMMUTABLE,
  };
}

export async function listBaseStories() {
  const storyPackage = await loadBaseStoryPackage();
  return [publicBaseStorySummary(storyPackage)];
}

export async function getBaseStory(storyId) {
  if (storyId !== MVP_BASE_STORY_ID) {
    return null;
  }

  const storyPackage = await loadBaseStoryPackage();
  return {
    ...publicBaseStorySummary(storyPackage),
    storyPackage,
  };
}
