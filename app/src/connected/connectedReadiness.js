// Estado agregado de preparación de la Experiencia Conectada: combina
// connectedContext + storyContentStore + connectedMediaStore en una sola
// señal de observabilidad (local/loading/ready/partial/empty/error). Solo
// LEE el estado de esos tres stores (getState/subscribe) — nunca dispara
// una llamada de red propia ni los modifica. No es UI: nadie todavía lo
// consume para pintar nada.

import { connectedContext, TripContextStatus } from './connectedContext.js';
import { storyContentStore } from './storyContentStore.js';
import { connectedMediaStore } from './connectedMediaStore.js';

export const ReadinessStatus = Object.freeze({
  LOCAL: 'local',
  LOADING: 'loading',
  READY: 'ready',
  PARTIAL: 'partial',
  EMPTY: 'empty',
  ERROR: 'error',
});

/** story/media comparten los mismos literales de estado ('local'/'loading'/'success'/'empty'/'error'). */
function combineContent(storyStatus, mediaStatus) {
  if (storyStatus === 'error' || mediaStatus === 'error') {
    return ReadinessStatus.ERROR;
  }
  // 'local' acá (con el contexto ya en success) es una ventana transitoria real:
  // story/media todavía no reaccionaron al cambio de connectedContext — no es que
  // el contenido esté vacío, es que su estado real todavía no se conoce.
  if (storyStatus === 'loading' || mediaStatus === 'loading' || storyStatus === 'local' || mediaStatus === 'local') {
    return ReadinessStatus.LOADING;
  }
  if (storyStatus === 'success' && mediaStatus === 'success') {
    return ReadinessStatus.READY;
  }
  if (storyStatus === 'empty' && mediaStatus === 'empty') {
    return ReadinessStatus.EMPTY;
  }
  return ReadinessStatus.PARTIAL;
}

function combine(contextState, storyState, mediaState) {
  if (contextState.status === TripContextStatus.LOCAL) {
    return { status: ReadinessStatus.LOCAL, error: null };
  }
  if (contextState.status === TripContextStatus.LOADING) {
    return { status: ReadinessStatus.LOADING, error: null };
  }
  if (contextState.status === TripContextStatus.NOT_FOUND || contextState.status === TripContextStatus.ERROR) {
    return { status: ReadinessStatus.ERROR, error: contextState.error ?? 'No se pudo conectar el viaje.' };
  }

  const status = combineContent(storyState.status, mediaState.status);
  const error = status === ReadinessStatus.ERROR ? (storyState.error ?? mediaState.error ?? 'No se pudo cargar el contenido del viaje.') : null;
  return { status, error };
}

/** Factory para poder inyectar `context`/`story`/`media` fakes en tests — el export de abajo es el singleton real. */
export function createConnectedReadinessStore(context, story, media) {
  const listeners = new Set();

  function recompute() {
    return combine(context.getState(), story.getState(), media.getState());
  }

  let state = recompute();

  function notify() {
    state = recompute();
    listeners.forEach((listener) => listener(state));
  }

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  context.subscribe(notify);
  story.subscribe(notify);
  media.subscribe(notify);

  return { getState, subscribe };
}

export const connectedReadiness = createConnectedReadinessStore(connectedContext, storyContentStore, connectedMediaStore);
