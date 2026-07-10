// Estado de sesión de Aurora Platform: checking -> anonymous | authenticated.
// No toca DOM ni UI — eso lo hace ConnectedShell (connectedShell.js). El login
// real todavía no está implementado (ver placeholder en modo anonymous).
// Delega toda llamada de red a platformApi.js; acá solo se guarda y notifica el estado.

import * as platformApi from './platformApi.js';

export const SessionStatus = Object.freeze({
  CHECKING: 'checking',
  ANONYMOUS: 'anonymous',
  AUTHENTICATED: 'authenticated',
});

/** Factory para poder inyectar un `api` fake en tests — el export de abajo es el singleton real. */
export function createSessionStore(api = platformApi) {
  let state = { status: SessionStatus.CHECKING, user: null };
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

  /**
   * Se llama al montar la app: consulta la cookie de sesión y resuelve a
   * anonymous o authenticated. Cualquier falla (404, sin red, backend caído)
   * también resuelve a anonymous — nunca debe quedar en checking para
   * siempre, porque mount() la llama fire-and-forget (connectedShell.js).
   */
  async function getSession() {
    try {
      const { user } = await api.getSession();
      setState(user ? { status: SessionStatus.AUTHENTICATED, user } : { status: SessionStatus.ANONYMOUS, user: null });
    } catch {
      setState({ status: SessionStatus.ANONYMOUS, user: null });
    }
    return getState();
  }

  function requestCode(email) {
    return api.requestCode(email);
  }

  async function verifyCode(email, code) {
    const { user } = await api.verifyCode(email, code);
    setState({ status: SessionStatus.AUTHENTICATED, user });
    return user;
  }

  async function logout() {
    await api.logout();
    setState({ status: SessionStatus.ANONYMOUS, user: null });
  }

  return { getState, subscribe, getSession, requestCode, verifyCode, logout };
}

export const sessionStore = createSessionStore();
