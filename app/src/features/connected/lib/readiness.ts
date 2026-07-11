// Estado agregado de preparación de la Experiencia Conectada: combina el estado
// del contexto (trip) + story + media en una sola señal. Función PURA — port 1:1
// de la lógica de connectedReadiness.js (combine/combineContent). La suscripción a
// los stores se reemplaza por hooks de TanStack Query (useConnectedReadiness.ts).

import {
  ReadinessStatus,
  TripContextStatus,
} from "./status";
import type {
  ContentState,
  ContextState,
  ReadinessState,
} from "./status";

/** story/media comparten los literales 'local'/'loading'/'success'/'empty'/'error'. */
function combineContent(
  storyStatus: ContentState["status"],
  mediaStatus: ContentState["status"],
): ReadinessState["status"] {
  if (storyStatus === "error" || mediaStatus === "error") {
    return ReadinessStatus.ERROR;
  }
  // 'local' acá (con el contexto ya en success) es una ventana transitoria real:
  // story/media todavía no reaccionaron al cambio de contexto.
  if (
    storyStatus === "loading" ||
    mediaStatus === "loading" ||
    storyStatus === "local" ||
    mediaStatus === "local"
  ) {
    return ReadinessStatus.LOADING;
  }
  if (storyStatus === "success" && mediaStatus === "success") {
    return ReadinessStatus.READY;
  }
  if (storyStatus === "empty" && mediaStatus === "empty") {
    return ReadinessStatus.EMPTY;
  }
  return ReadinessStatus.PARTIAL;
}

export function combineReadiness(
  contextState: ContextState,
  storyState: ContentState,
  mediaState: ContentState,
): ReadinessState {
  if (contextState.status === TripContextStatus.LOCAL) {
    return { status: ReadinessStatus.LOCAL, error: null };
  }
  if (contextState.status === TripContextStatus.LOADING) {
    return { status: ReadinessStatus.LOADING, error: null };
  }
  if (
    contextState.status === TripContextStatus.NOT_FOUND ||
    contextState.status === TripContextStatus.ERROR
  ) {
    return {
      status: ReadinessStatus.ERROR,
      error: contextState.error ?? "No se pudo conectar el viaje.",
    };
  }

  const status = combineContent(storyState.status, mediaState.status);
  const error =
    status === ReadinessStatus.ERROR
      ? storyState.error ?? mediaState.error ?? "No se pudo cargar el contenido del viaje."
      : null;
  return { status, error };
}
