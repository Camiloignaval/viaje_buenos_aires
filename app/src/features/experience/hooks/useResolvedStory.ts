import { useTripId } from "@/features/connected/hooks/useTripId";
import { useConnectedTrip } from "@/features/connected/hooks/useConnectedTrip";
import type { ConnectedTripState } from "@/features/connected/hooks/useConnectedTrip";
import { useStoryContent } from "@/features/connected/hooks/useConnectedContent";
import type { StoryContentState } from "@/features/connected/hooks/useConnectedContent";
import { ContentStatus, TripContextStatus } from "@/features/connected/lib/status";
import { loadStoryPackage } from "@/features/story/engine/storyPackage";
import type { StoryPackage } from "@/features/story/engine/types";

// El vocabulario que Experience necesita para renderizar. Seis estados que NO se
// colapsan entre sí — en particular `not-found` (el viaje no existe/ no es
// accesible) es distinto de `empty` (el viaje existe pero no tiene historia) y de
// `error` (fallo técnico real). Ver design.md §2 y D8.
export type ResolvedStory =
  | { kind: "local" } // sin tripId → demo BA explícito (solo desarrollo/QA)
  | { kind: "loading" }
  | { kind: "ready"; storyPackage: StoryPackage; scopeId: string } // scopeId = tripId
  | { kind: "empty" } // el trip existe pero baseStoryId es null o no está en el catálogo
  | { kind: "not-found" } // el trip mismo no existe o no es accesible (404/403)
  | { kind: "error"; message: string }; // red/API/schema inválido

const GENERIC_TRIP_ERROR = "No se pudo cargar el viaje.";
const GENERIC_STORY_ERROR = "No se pudo cargar la historia.";

// Función PURA de derivación. Lee el `status` CRUDO del contexto del viaje ANTES
// de que useStoryContent/combineReadiness lo colapsen: por eso recibe el
// tripState directo y solo mira el contenido cuando el viaje ya resolvió con
// éxito. Testeable de forma aislada (sin red ni React) — cubre los 6 kinds.
export function resolveStory(
  tripState: ConnectedTripState,
  content: StoryContentState,
): ResolvedStory {
  switch (tripState.status) {
    case TripContextStatus.LOCAL:
      return { kind: "local" };
    case TripContextStatus.LOADING:
      return { kind: "loading" };
    case TripContextStatus.NOT_FOUND:
      return { kind: "not-found" };
    case TripContextStatus.ERROR:
      return { kind: "error", message: tripState.error ?? GENERIC_TRIP_ERROR };
  }

  // A partir de acá el viaje resolvió con éxito: decide el estado del contenido.
  switch (content.status) {
    case ContentStatus.EMPTY:
      return { kind: "empty" };
    case ContentStatus.ERROR:
      return { kind: "error", message: content.error ?? GENERIC_STORY_ERROR };
    case ContentStatus.SUCCESS:
      return resolveReadyStory(tripState.tripId, content);
    default:
      // LOADING (o LOCAL, que no ocurre con viaje success) → seguimos cargando.
      return { kind: "loading" };
  }
}

// El backend ya validó el package, pero llega tipado como StoryPackage opcional:
// se revalida defensivamente antes de montar. Un package ausente o malformado en
// un contenido "success" es una inconsistencia técnica (error), NO un "sin historia".
function resolveReadyStory(tripId: string | null, content: StoryContentState): ResolvedStory {
  const raw = content.story?.storyPackage;
  if (!tripId || !raw) {
    return { kind: "error", message: GENERIC_STORY_ERROR };
  }
  try {
    return { kind: "ready", storyPackage: loadStoryPackage(raw), scopeId: tripId };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Historia con formato inválido.",
    };
  }
}

// Hook fino: compone las tres piezas de `connected` (tripId → trip → contenido) y
// traduce sus señales al estado que consume Experience. No hace red propia ni
// reimplementa fetching: ese es el único dueño (connected).
export function useResolvedStory(): ResolvedStory {
  const tripId = useTripId();
  const tripState = useConnectedTrip(tripId);
  const content = useStoryContent(tripState);
  return resolveStory(tripState, content);
}
