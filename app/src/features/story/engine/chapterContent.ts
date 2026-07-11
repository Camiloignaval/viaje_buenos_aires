// Resuelve relaciones dentro del Story Package para un capítulo dado: qué lugar
// corresponde a cada actividad, qué photo spots y qué ítems de colección le
// pertenecen. Función pura, sin HTML. Port TS 1:1 de experience/chapterContent.js.

import type {
  Activity,
  Chapter,
  CollectionItem,
  Place,
  PhotoSpot,
  StoryPackage,
  SuggestedMemory,
} from "./types";

function getAllPlaces(storyPackage: StoryPackage): Place[] {
  const catalog = storyPackage.placesCatalog;
  if (!catalog) {
    return [];
  }
  return [...(catalog.restaurants ?? []), ...(catalog.cafes ?? [])];
}

export function getPlaceById(
  storyPackage: StoryPackage,
  placeId: string,
): Place | null {
  return getAllPlaces(storyPackage).find((place) => place.id === placeId) ?? null;
}

/** Lugares cuyo propio relatedChapterId apunta a este capítulo, pero que ninguna actividad ya referenció. */
export function getUnreferencedRelatedPlaces(
  storyPackage: StoryPackage,
  chapter: Chapter,
  referencedPlaceIds: Set<string>,
): Place[] {
  return getAllPlaces(storyPackage).filter(
    (place) =>
      place.relatedChapterId === chapter.id && !referencedPlaceIds.has(place.id),
  );
}

export function getChapterPhotoSpots(
  storyPackage: StoryPackage,
  chapter: Chapter,
): PhotoSpot[] {
  return (storyPackage.photoSpots ?? []).filter(
    (spot) => spot.relatedChapterId === chapter.id,
  );
}

/** Ítems de cualquier colección cuyo relatedChapterId apunte a este capítulo. */
export function getChapterCollectionItems(
  storyPackage: StoryPackage,
  chapter: Chapter,
): CollectionItem[] {
  const items: CollectionItem[] = [];
  for (const collection of storyPackage.collections ?? []) {
    for (const item of collection.items ?? []) {
      if (item.relatedChapterId === chapter.id) {
        items.push(item);
      }
    }
  }
  return items;
}

interface PartitionedMemories {
  byActivityId: Map<string, SuggestedMemory[]>;
  unassigned: SuggestedMemory[];
}

/**
 * Separa los recuerdos sugeridos de un capítulo entre los que apuntan a una
 * actividad real de ese capítulo (agrupados por activityId) y los que no.
 */
function partitionSuggestedMemories(chapter: Chapter): PartitionedMemories {
  const activityIds = new Set(
    (chapter.activities ?? []).map((activity) => activity.id),
  );
  const byActivityId = new Map<string, SuggestedMemory[]>();
  const unassigned: SuggestedMemory[] = [];

  for (const memory of chapter.suggestedMemories ?? []) {
    if (memory.relatedActivityId && activityIds.has(memory.relatedActivityId)) {
      const list = byActivityId.get(memory.relatedActivityId) ?? [];
      list.push(memory);
      byActivityId.set(memory.relatedActivityId, list);
    } else {
      unassigned.push(memory);
    }
  }

  return { byActivityId, unassigned };
}

export interface ActivityWithPlace {
  activity: Activity;
  place: Place | null;
  suggestedMemories: SuggestedMemory[];
}

export interface ResolvedChapterContent {
  activitiesWithPlaces: ActivityWithPlace[];
  relatedPlaces: Place[];
  photoSpots: PhotoSpot[];
  collectionItems: CollectionItem[];
  unassignedSuggestedMemories: SuggestedMemory[];
}

/** Resuelve todo el contenido relacionado a un capítulo de una sola vez. */
export function resolveChapterContent(
  storyPackage: StoryPackage,
  chapter: Chapter,
): ResolvedChapterContent {
  const referencedPlaceIds = new Set<string>();
  const { byActivityId, unassigned } = partitionSuggestedMemories(chapter);

  const activitiesWithPlaces = (chapter.activities ?? []).map((activity) => {
    const place = activity.relatedPlaceId
      ? getPlaceById(storyPackage, activity.relatedPlaceId)
      : null;
    if (place) {
      referencedPlaceIds.add(place.id);
    }
    return {
      activity,
      place,
      suggestedMemories: byActivityId.get(activity.id) ?? [],
    };
  });

  return {
    activitiesWithPlaces,
    relatedPlaces: getUnreferencedRelatedPlaces(
      storyPackage,
      chapter,
      referencedPlaceIds,
    ),
    photoSpots: getChapterPhotoSpots(storyPackage, chapter),
    collectionItems: getChapterCollectionItems(storyPackage, chapter),
    unassignedSuggestedMemories: unassigned,
  };
}
