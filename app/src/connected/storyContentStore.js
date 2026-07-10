// Contenido narrativo del viaje conectado: local -> loading -> empty | success | error.
// Se deriva de connectedContext (nunca lo modifica, solo se suscribe) y usa
// platformApi para traer la story del `baseStoryId` del viaje ya resuelto.
// No renderiza nada — es solo el store; Aurora sigue local hasta que un
// bloque futuro decida leer y pintar este contenido.

import { getStory as apiGetStory, PlatformApiError } from './platformApi.js';
import { connectedContext, TripContextStatus } from './connectedContext.js';

export const StoryContentStatus = Object.freeze({
  LOCAL: 'local',
  LOADING: 'loading',
  EMPTY: 'empty',
  SUCCESS: 'success',
  ERROR: 'error',
});

function initialState() {
  return { status: StoryContentStatus.LOCAL, story: null, error: null };
}

/** Factory para poder inyectar `context`/`api` fakes en tests — el export de abajo es el singleton real. */
export function createStoryContentStore(context, api = { getStory: apiGetStory }) {
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
      setState({ status: StoryContentStatus.LOADING, story: null, error: null });
      return;
    }

    if (contextState.status === TripContextStatus.NOT_FOUND || contextState.status === TripContextStatus.ERROR) {
      setState({ status: StoryContentStatus.ERROR, story: null, error: contextState.error ?? 'No se pudo determinar la historia del viaje.' });
      return;
    }

    const baseStoryId = contextState.trip?.baseStoryId;
    if (!baseStoryId) {
      setState({ status: StoryContentStatus.EMPTY, story: null, error: null });
      return;
    }

    setState({ status: StoryContentStatus.LOADING, story: null, error: null });
    try {
      const { story } = await api.getStory(baseStoryId);
      setState(story ? { status: StoryContentStatus.SUCCESS, story, error: null } : { status: StoryContentStatus.EMPTY, story: null, error: null });
    } catch (error) {
      if (error instanceof PlatformApiError && error.status === 404) {
        setState({ status: StoryContentStatus.EMPTY, story: null, error: null });
      } else {
        setState({ status: StoryContentStatus.ERROR, story: null, error: error.message ?? 'No se pudo cargar la historia.' });
      }
    }
  }

  context.subscribe(syncWithContext);
  syncWithContext(context.getState());

  return { getState, subscribe };
}

export const storyContentStore = createStoryContentStore(connectedContext);
