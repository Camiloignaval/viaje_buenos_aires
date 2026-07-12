import { readFile } from 'node:fs/promises';
import { loadStoryPackage } from '../src/story/storyPackage/storyPackage.js';

export const MVP_BASE_STORY_ID = 'ba-2026';
export const BASE_STORY_SOURCE = 'base';
export const BASE_STORY_IMMUTABLE = true;

// Catálogo de historias curadas: hace RESOLUBLE una historia por su id canónico
// (baseStoryId → JSON curado). Sumar una entrada acá NO cambia ExperiencePage, la
// capa connected ni la API.
//
// IMPORTANTE — agregar una historia curada nueva requiere DOS registros coordinados:
//   1) esta entrada en BASE_STORY_REGISTRY (resolución del contenido), y
//   2) una regla destino→id en DESTINATION_STORY_MAP (platformTrips.js), para que
//      los viajes de ese destino reciban el baseStoryId.
// El guard de arranque de platformTrips valida que (2) solo apunte a ids de (1),
// así ambos registros no pueden quedar descoordinados.
const BASE_STORY_ENTRIES = [
  [MVP_BASE_STORY_ID, { packageUrl: new URL('../src/story/data/story-ba2026.json', import.meta.url) }],
  // ['rio-2027', { packageUrl: new URL('../src/story/data/story-rio2027.json', import.meta.url) }],
];

// Un objeto literal colapsa claves duplicadas en silencio, así que construir el
// registro desde una lista permite detectar el duplicado y fallar ruidosamente
// en el arranque, sin pisar la entrada original. Exportada para poder testear
// el rechazo de ids repetidos de forma aislada.
export function createStoryRegistry(entries) {
  const registry = new Map();
  for (const [storyId, config] of entries) {
    if (registry.has(storyId)) {
      throw new Error(`Catálogo de historias: id duplicado "${storyId}". Cada historia debe tener un id único.`);
    }
    registry.set(storyId, config);
  }
  return registry;
}

const BASE_STORY_REGISTRY = createStoryRegistry(BASE_STORY_ENTRIES);

// Cache de packages ya cargados y validados, por id. Reemplaza la única var
// suelta anterior: ahora convive N historias sin recargar el JSON en cada request.
const packageCache = new Map();

export function isRegisteredBaseStory(storyId) {
  return BASE_STORY_REGISTRY.has(storyId);
}

export function listBaseStoryIds() {
  return [...BASE_STORY_REGISTRY.keys()];
}

async function loadStoryPackageById(storyId) {
  const entry = BASE_STORY_REGISTRY.get(storyId);
  if (!entry) return null;

  if (!packageCache.has(storyId)) {
    const raw = JSON.parse(await readFile(entry.packageUrl, 'utf8'));
    packageCache.set(storyId, loadStoryPackage(raw));
  }
  return packageCache.get(storyId);
}

export function publicBaseStorySummary(storyId, storyPackage) {
  return {
    storyId,
    packageStoryId: storyPackage.storyId,
    version: storyPackage.schemaVersion,
    title: storyPackage.metadata.title,
    destination: storyPackage.metadata.destination,
    source: BASE_STORY_SOURCE,
    immutable: BASE_STORY_IMMUTABLE,
  };
}

export async function listBaseStories() {
  const summaries = [];
  for (const storyId of BASE_STORY_REGISTRY.keys()) {
    const storyPackage = await loadStoryPackageById(storyId);
    summaries.push(publicBaseStorySummary(storyId, storyPackage));
  }
  return summaries;
}

// Punto ÚNICO de traducción baseStoryId → StoryPackage. Devuelve `null`
// explícito (nunca una historia por defecto, nunca una excepción) cuando el id
// no está registrado: la API lo mapea a 404 y la capa connected a EMPTY honesto.
export async function getBaseStory(storyId) {
  const storyPackage = await loadStoryPackageById(storyId);
  if (!storyPackage) return null;

  return {
    ...publicBaseStorySummary(storyId, storyPackage),
    storyPackage,
  };
}
