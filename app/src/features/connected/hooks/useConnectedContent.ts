import { useQuery } from "@tanstack/react-query";
import { PlatformApiError } from "@/services/platformClient";
import { getStory, getTripMedia } from "../api/connectedApi";
import { ContentStatus, TripContextStatus } from "../lib/status";
import type { ContentStatusValue } from "../lib/status";
import type { ConnectedStory, TripMediaItem } from "../types";
import type { ConnectedTripState } from "./useConnectedTrip";

export interface StoryContentState {
  status: ContentStatusValue;
  story: ConnectedStory | null;
  error: string | null;
  dataUpdatedAt?: number;
}

export interface TripMediaState {
  status: ContentStatusValue;
  media: TripMediaItem[];
  error: string | null;
}

/** Traduce el estado del contexto (no-success) a un estado de contenido, igual que
 * el syncWithContext de storyContentStore.js/connectedMediaStore.js. */
function contextGate(context: ConnectedTripState): ContentStatusValue | null {
  if (context.status === TripContextStatus.LOCAL) return ContentStatus.LOCAL;
  if (context.status === TripContextStatus.LOADING) return ContentStatus.LOADING;
  if (
    context.status === TripContextStatus.NOT_FOUND ||
    context.status === TripContextStatus.ERROR
  ) {
    return ContentStatus.ERROR;
  }
  return null; // success → decide el propio contenido
}

// Contenido narrativo del viaje conectado. Se deriva del baseStoryId del viaje ya
// resuelto. Reemplaza a storyContentStore.js.
export function useStoryContent(context: ConnectedTripState): StoryContentState {
  const baseStoryId = context.trip?.baseStoryId ?? null;
  const query = useQuery({
    queryKey: ["connected", "story", baseStoryId],
    queryFn: () => getStory(baseStoryId as string),
    enabled: context.status === TripContextStatus.SUCCESS && Boolean(baseStoryId),
    retry: false,
  });

  const gated = contextGate(context);
  if (gated) {
    return {
      status: gated,
      story: null,
      error: gated === ContentStatus.ERROR ? context.error ?? "No se pudo determinar la historia del viaje." : null,
      dataUpdatedAt: query.dataUpdatedAt,
    };
  }
  if (!baseStoryId) {
    return { status: ContentStatus.EMPTY, story: null, error: null, dataUpdatedAt: query.dataUpdatedAt };
  }
  if (query.isPending) {
    return { status: ContentStatus.LOADING, story: null, error: null, dataUpdatedAt: query.dataUpdatedAt };
  }
  if (query.isError) {
    if (query.error instanceof PlatformApiError && query.error.status === 404) {
      return { status: ContentStatus.EMPTY, story: null, error: null, dataUpdatedAt: query.dataUpdatedAt };
    }
    return {
      status: ContentStatus.ERROR,
      story: null,
      error: query.error instanceof Error ? query.error.message : "No se pudo cargar la historia.",
      dataUpdatedAt: query.dataUpdatedAt,
    };
  }
  const story = query.data.story;
  return story
    ? { status: ContentStatus.SUCCESS, story, error: null, dataUpdatedAt: query.dataUpdatedAt }
    : { status: ContentStatus.EMPTY, story: null, error: null, dataUpdatedAt: query.dataUpdatedAt };
}

// Media (fotos/videos) del viaje conectado. Reemplaza a connectedMediaStore.js.
export function useTripMedia(context: ConnectedTripState): TripMediaState {
  const tripId = context.status === TripContextStatus.SUCCESS ? context.tripId : null;
  const query = useQuery({
    queryKey: ["connected", "media", tripId],
    queryFn: () => getTripMedia(tripId as string),
    enabled: Boolean(tripId),
    retry: false,
  });

  const gated = contextGate(context);
  if (gated) {
    return {
      status: gated,
      media: [],
      error: gated === ContentStatus.ERROR ? context.error ?? "No se pudo determinar la media del viaje." : null,
    };
  }
  if (!tripId) {
    return { status: ContentStatus.EMPTY, media: [], error: null };
  }
  if (query.isPending) {
    return { status: ContentStatus.LOADING, media: [], error: null };
  }
  if (query.isError) {
    if (query.error instanceof PlatformApiError && query.error.status === 404) {
      return { status: ContentStatus.EMPTY, media: [], error: null };
    }
    return {
      status: ContentStatus.ERROR,
      media: [],
      error: query.error instanceof Error ? query.error.message : "No se pudo cargar la media del viaje.",
    };
  }
  const media = query.data.media;
  return media?.length
    ? { status: ContentStatus.SUCCESS, media, error: null }
    : { status: ContentStatus.EMPTY, media: [], error: null };
}
