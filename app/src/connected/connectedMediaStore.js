// Media (fotos/videos) del viaje conectado: local -> loading -> empty | success | error.
// Se deriva de connectedContext (nunca lo modifica, solo se suscribe) y usa
// platformApi para listar la media ya subida al viaje (api/trips/[tripId]/media,
// GET de solo lectura). No renderiza nada ni sube archivos — es solo el store;
// no toca el álbum local de Buenos Aires (memory/photoStore.js, memory/memoryStore.js).

import { getTripMedia as apiGetTripMedia, PlatformApiError } from './platformApi.js';
import { connectedContext, TripContextStatus } from './connectedContext.js';

export const ConnectedMediaStatus = Object.freeze({
  LOCAL: 'local',
  LOADING: 'loading',
  EMPTY: 'empty',
  SUCCESS: 'success',
  ERROR: 'error',
});

function initialState() {
  return { status: ConnectedMediaStatus.LOCAL, media: [], error: null };
}

/** Factory para poder inyectar `context`/`api` fakes en tests — el export de abajo es el singleton real. */
export function createConnectedMediaStore(context, api = { getTripMedia: apiGetTripMedia }) {
  let state = initialState();
  const listeners = new Set();

  function setState(next) {
    state = next;
    listeners.forEach((listener) => listener(state));
  }

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  async function syncWithContext(contextState) {
    if (contextState.status === TripContextStatus.LOCAL) {
      setState(initialState());
      return;
    }

    if (contextState.status === TripContextStatus.LOADING) {
      setState({ status: ConnectedMediaStatus.LOADING, media: [], error: null });
      return;
    }

    if (contextState.status === TripContextStatus.NOT_FOUND || contextState.status === TripContextStatus.ERROR) {
      setState({ status: ConnectedMediaStatus.ERROR, media: [], error: contextState.error ?? 'No se pudo determinar la media del viaje.' });
      return;
    }

    const tripId = contextState.tripId;
    if (!tripId) {
      setState({ status: ConnectedMediaStatus.EMPTY, media: [], error: null });
      return;
    }

    setState({ status: ConnectedMediaStatus.LOADING, media: [], error: null });
    try {
      const { media } = await api.getTripMedia(tripId);
      setState(media?.length ? { status: ConnectedMediaStatus.SUCCESS, media, error: null } : { status: ConnectedMediaStatus.EMPTY, media: [], error: null });
    } catch (error) {
      if (error instanceof PlatformApiError && error.status === 404) {
        setState({ status: ConnectedMediaStatus.EMPTY, media: [], error: null });
      } else {
        setState({ status: ConnectedMediaStatus.ERROR, media: [], error: error.message ?? 'No se pudo cargar la media del viaje.' });
      }
    }
  }

  context.subscribe(syncWithContext);
  syncWithContext(context.getState());

  return { getState, subscribe };
}

export const connectedMediaStore = createConnectedMediaStore(connectedContext);
