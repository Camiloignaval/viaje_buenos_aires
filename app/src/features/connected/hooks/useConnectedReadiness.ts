import { useTripId } from "./useTripId";
import { useConnectedTrip } from "./useConnectedTrip";
import { useStoryContent, useTripMedia } from "./useConnectedContent";
import { combineReadiness } from "../lib/readiness";
import type { ReadinessState } from "../lib/status";

// Señal agregada de la Experiencia Conectada: combina viaje + story + media en un
// solo estado (local/loading/ready/partial/empty/error). Reemplaza a
// connectedReadiness.js — la suscripción a stores se vuelve composición de hooks.
export function useConnectedReadiness(): ReadinessState {
  const tripId = useTripId();
  const context = useConnectedTrip(tripId);
  const story = useStoryContent(context);
  const media = useTripMedia(context);
  return combineReadiness(
    { status: context.status, error: context.error },
    { status: story.status, error: story.error },
    { status: media.status, error: media.error },
  );
}
