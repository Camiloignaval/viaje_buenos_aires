// Resuelve relaciones dentro del Story Package para un capítulo dado: qué lugar
// corresponde a cada actividad, qué photo spots y qué ítems de colección le
// pertenecen. Función pura, sin HTML — ver README.md de esta carpeta.

function getAllPlaces(storyPackage) {
  const catalog = storyPackage.placesCatalog;
  if (!catalog) {
    return [];
  }
  return [...(catalog.restaurants ?? []), ...(catalog.cafes ?? [])];
}

export function getPlaceById(storyPackage, placeId) {
  return getAllPlaces(storyPackage).find((place) => place.id === placeId) ?? null;
}

/** Lugares cuyo propio relatedChapterId apunta a este capítulo, pero que ninguna actividad ya referenció. */
export function getUnreferencedRelatedPlaces(storyPackage, chapter, referencedPlaceIds) {
  return getAllPlaces(storyPackage).filter(
    (place) => place.relatedChapterId === chapter.id && !referencedPlaceIds.has(place.id)
  );
}

export function getChapterPhotoSpots(storyPackage, chapter) {
  return (storyPackage.photoSpots ?? []).filter((spot) => spot.relatedChapterId === chapter.id);
}

/** Ítems de cualquier colección cuyo relatedChapterId apunte a este capítulo. */
export function getChapterCollectionItems(storyPackage, chapter) {
  const items = [];
  for (const collection of storyPackage.collections ?? []) {
    for (const item of collection.items ?? []) {
      if (item.relatedChapterId === chapter.id) {
        items.push(item);
      }
    }
  }
  return items;
}

/**
 * Separa los recuerdos sugeridos de un capítulo entre los que apuntan a una
 * actividad real de ese capítulo (agrupados por activityId) y los que no
 * (sin relatedActivityId, o apuntando a una actividad que no existe).
 */
function partitionSuggestedMemories(chapter) {
  const activityIds = new Set((chapter.activities ?? []).map((activity) => activity.id));
  const byActivityId = new Map();
  const unassigned = [];

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

/**
 * Resuelve todo el contenido relacionado a un capítulo de una sola vez.
 * @returns {{
 *   activitiesWithPlaces: Array<{activity: object, place: object|null, suggestedMemories: object[]}>,
 *   relatedPlaces: object[],
 *   photoSpots: object[],
 *   collectionItems: object[],
 *   unassignedSuggestedMemories: object[],
 * }}
 */
export function resolveChapterContent(storyPackage, chapter) {
  const referencedPlaceIds = new Set();
  const { byActivityId, unassigned } = partitionSuggestedMemories(chapter);

  const activitiesWithPlaces = (chapter.activities ?? []).map((activity) => {
    const place = activity.relatedPlaceId ? getPlaceById(storyPackage, activity.relatedPlaceId) : null;
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
    relatedPlaces: getUnreferencedRelatedPlaces(storyPackage, chapter, referencedPlaceIds),
    photoSpots: getChapterPhotoSpots(storyPackage, chapter),
    collectionItems: getChapterCollectionItems(storyPackage, chapter),
    unassignedSuggestedMemories: unassigned,
  };
}
