import { readFile } from "node:fs/promises";
import { STORY_MANIFESTS } from "../src/content/stories/catalog.js";
import { loadStoryPackage } from "../src/story/storyPackage/storyPackage.js";

const PUBLISHED = "published";

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertStoryManifest(manifest, index) {
  const context = `Catálogo de historias: descriptor[${index}]`;
  if (!manifest || typeof manifest !== "object") throw new Error(`${context} inválido.`);
  for (const field of ["catalogId", "storyPackageId", "status", "packageUrl", "selection", "compatibility", "media"]) {
    if (!(field in manifest)) throw new Error(`${context}: falta ${field}.`);
  }
  if (!nonEmpty(manifest.catalogId) || !nonEmpty(manifest.storyPackageId)) {
    throw new Error(`${context}: identidades inválidas.`);
  }
  if (!(manifest.packageUrl instanceof URL)) throw new Error(`${context}: packageUrl debe ser URL.`);
  if (!nonEmpty(manifest.selection?.title) || !nonEmpty(manifest.selection?.destination)) {
    throw new Error(`${context}: selection incompleta.`);
  }
  if (!nonEmpty(manifest.media?.basePath) || !Array.isArray(manifest.media?.required)) {
    throw new Error(`${context}: media incompleta.`);
  }
}

export function createStoryRegistry(manifests) {
  const registry = new Map();
  manifests.forEach((manifest, index) => {
    assertStoryManifest(manifest, index);
    if (registry.has(manifest.catalogId)) {
      throw new Error(`Catálogo de historias: id duplicado "${manifest.catalogId}". Cada historia debe tener un id único.`);
    }
    registry.set(manifest.catalogId, manifest);
  });
  return registry;
}

const STORY_REGISTRY = createStoryRegistry(STORY_MANIFESTS);
const packageCache = new Map();

export function isRegisteredBaseStory(catalogId) {
  return STORY_REGISTRY.get(catalogId)?.status === PUBLISHED;
}

export function listBaseStoryIds() {
  return [...STORY_REGISTRY.values()]
    .filter(({ status }) => status === PUBLISHED)
    .map(({ catalogId }) => catalogId);
}

export function getStoryManifest(catalogId) {
  return STORY_REGISTRY.get(catalogId) ?? null;
}

function sameText(left, right) {
  return String(left ?? "").trim().localeCompare(String(right ?? "").trim(), undefined, { sensitivity: "accent" }) === 0;
}

function datePart(value) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

/** Valida compatibilidad; nunca selecciona historias por destino. */
export function isBaseStoryCompatibleWithTrip(catalogId, trip) {
  const manifest = getStoryManifest(catalogId);
  if (!manifest || manifest.status !== PUBLISHED) return false;
  const compatibility = manifest.compatibility ?? {};
  const destination = trip?.destination;
  if (!destination || typeof destination !== "object") return false;

  if (Array.isArray(compatibility.destinationCountryCodes)
    && !compatibility.destinationCountryCodes.includes(destination.countryCode)) return false;
  if (Array.isArray(compatibility.destinationCityNames)
    && !compatibility.destinationCityNames.some((city) => sameText(city, destination.cityName))) return false;
  if (compatibility.travelDates) {
    if (datePart(trip.startDateTime) !== compatibility.travelDates.start
      || datePart(trip.endDateTime) !== compatibility.travelDates.end) return false;
  }
  return true;
}

async function loadStoryPackageById(catalogId) {
  const manifest = STORY_REGISTRY.get(catalogId);
  if (!manifest || manifest.status !== PUBLISHED) return null;

  if (!packageCache.has(catalogId)) {
    const raw = JSON.parse(await readFile(manifest.packageUrl, "utf8"));
    const storyPackage = loadStoryPackage(raw);
    if (storyPackage.storyId !== manifest.storyPackageId) {
      throw new Error(`Catálogo de historias: ${catalogId} declara storyPackageId="${manifest.storyPackageId}" pero carga "${storyPackage.storyId}".`);
    }
    packageCache.set(catalogId, storyPackage);
  }
  return packageCache.get(catalogId);
}

export function publicBaseStorySummary(manifest, storyPackage) {
  return {
    storyId: manifest.catalogId,
    packageStoryId: storyPackage.storyId,
    version: storyPackage.schemaVersion,
    title: manifest.selection.title,
    destination: manifest.selection.destination,
    status: manifest.status,
    source: manifest.source,
    immutable: manifest.immutable,
    compatibility: manifest.compatibility,
    mediaBasePath: manifest.media.basePath,
  };
}

export async function listBaseStories() {
  const summaries = [];
  for (const catalogId of listBaseStoryIds()) {
    const manifest = STORY_REGISTRY.get(catalogId);
    const storyPackage = await loadStoryPackageById(catalogId);
    summaries.push(publicBaseStorySummary(manifest, storyPackage));
  }
  return summaries;
}

// Traducción única catálogo editorial → Story Package. Nunca usa un default.
export async function getBaseStory(catalogId) {
  const manifest = STORY_REGISTRY.get(catalogId);
  const storyPackage = await loadStoryPackageById(catalogId);
  if (!manifest || !storyPackage) return null;
  return { ...publicBaseStorySummary(manifest, storyPackage), storyPackage };
}
