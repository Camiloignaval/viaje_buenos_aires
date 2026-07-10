// Resuelve el contexto de viaje conectado para experience.html a partir de
// ?tripId=... en la URL. Sin tripId, Aurora sigue funcionando 100% local —
// comportamiento sin cambios de Etapa 2/3. Con tripId, consulta platformApi
// y expone loading/success/not-found/error; nunca bloquea la experiencia —
// mismo principio de "fallo silencioso" que ya usa sync/syncClient.js.
//
// El server devuelve 403 tanto para un trip inexistente como para uno del
// que no eres miembro (requireTripMember, lib/platformAuth.js) — no hay un
// 404 propio. Acá ambos casos se tratan como notFound: desde el cliente son
// indistinguibles y el mensaje correcto es el mismo.

import { getTrip as apiGetTrip, PlatformApiError } from './platformApi.js';

export const TripContextStatus = Object.freeze({
  LOCAL: 'local',
  LOADING: 'loading',
  SUCCESS: 'success',
  NOT_FOUND: 'not-found',
  ERROR: 'error',
});

export function readTripId(location = window.location) {
  return new URLSearchParams(location.search).get('tripId');
}

function initialState() {
  return { status: TripContextStatus.LOCAL, tripId: null, trip: null, error: null };
}

/** Factory para poder inyectar `api`/`location` fakes en tests — el export de abajo es el singleton real. */
export function createConnectedContextStore(api = { getTrip: apiGetTrip }) {
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

  /** Sin tripId en la URL, resuelve a `local` sin tocar la red. */
  async function resolve(location = window.location) {
    const tripId = readTripId(location);
    if (!tripId) {
      setState(initialState());
      return getState();
    }

    setState({ status: TripContextStatus.LOADING, tripId, trip: null, error: null });
    try {
      const { trip } = await api.getTrip(tripId);
      setState({ status: TripContextStatus.SUCCESS, tripId, trip, error: null });
    } catch (error) {
      if (error instanceof PlatformApiError && (error.status === 404 || error.status === 403)) {
        setState({ status: TripContextStatus.NOT_FOUND, tripId, trip: null, error: null });
      } else {
        setState({ status: TripContextStatus.ERROR, tripId, trip: null, error: error.message ?? 'No se pudo cargar el viaje.' });
      }
    }
    return getState();
  }

  return { getState, subscribe, resolve };
}

export const connectedContext = createConnectedContextStore();
