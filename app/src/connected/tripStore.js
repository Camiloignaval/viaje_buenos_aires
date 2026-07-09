// Estado de la lista de viajes de Aurora Platform: loading -> empty | success | error.
// Delega toda llamada de red a platformApi.js — acá solo se guarda y notifica el estado.

import * as platformApi from './platformApi.js';

export const TripsStatus = Object.freeze({
  LOADING: 'loading',
  EMPTY: 'empty',
  SUCCESS: 'success',
  ERROR: 'error',
});

/** Factory para poder inyectar un `api` fake en tests — el export de abajo es el singleton real. */
export function createTripStore(api = platformApi) {
  let state = { status: TripsStatus.LOADING, trips: [], error: null };
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

  /** Carga los viajes del usuario. La API ya los devuelve por updatedAt desc; se re-ordena acá como red de seguridad. */
  async function loadTrips() {
    setState({ status: TripsStatus.LOADING, trips: state.trips, error: null });
    try {
      const { trips } = await api.listTrips();
      const sorted = [...trips].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      setState(sorted.length ? { status: TripsStatus.SUCCESS, trips: sorted, error: null } : { status: TripsStatus.EMPTY, trips: [], error: null });
    } catch (error) {
      setState({ status: TripsStatus.ERROR, trips: [], error: error.message ?? 'No se pudieron cargar los viajes.' });
    }
  }

  /** Crea un viaje y refresca la lista. Si la creación falla, no toca el estado de la lista — solo propaga el error. */
  async function createTrip(input) {
    const { trip } = await api.createTrip(input);
    await loadTrips();
    return trip;
  }

  return { getState, subscribe, loadTrips, createTrip };
}

export const tripStore = createTripStore();
