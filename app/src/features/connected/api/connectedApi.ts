// Llamadas de red de la Experiencia Conectada, sobre el cliente HTTP compartido
// (@/services/platformClient). Espejo de connected/platformApi.js (getStory,
// getTripMedia). getTrip ya vive en features/trips/api — se reutiliza desde ahí.

import { platformRequest } from "@/services/platformClient";
import type { ConnectedStory, TripMediaItem } from "../types";

/** Contenido de una story por su id (ver lib/platformStories.js). 404 si no existe. */
export function getStory(storyId: string) {
  return platformRequest<{ story: ConnectedStory | null }>(
    `/api/stories/${encodeURIComponent(storyId)}`,
  );
}

/** Media (fotos/videos) subida al viaje, más reciente primero. */
export function getTripMedia(tripId: string) {
  return platformRequest<{ media: TripMediaItem[] }>(
    `/api/trips/${encodeURIComponent(tripId)}/media`,
  );
}
