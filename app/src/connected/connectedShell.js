// Entrada mínima de Aurora Platform conectada (Etapa 4 — app.html).
// Monta según el estado de sessionStore: checking -> loading sobrio,
// anonymous -> placeholder de login (el flujo real llega en el próximo commit),
// authenticated -> email + placeholder de "Mis viajes" + logout funcional.
// No conoce Story Engine, render.js ni experience.html — esto envuelve a
// Aurora, nunca la reemplaza ni la rediseña.

import { sessionStore, SessionStatus } from './sessionStore.js';

/** Traduce el estado de sessionStore a un view model plano — sin tocar el DOM, testable sin jsdom. */
export function describeState(state) {
  if (state.status === SessionStatus.AUTHENTICATED) {
    return { mode: 'authenticated', email: state.user?.email ?? '' };
  }
  if (state.status === SessionStatus.ANONYMOUS) {
    return { mode: 'anonymous' };
  }
  return { mode: 'checking' };
}

function renderChecking() {
  return `<p class="connected-loading">Cargando tu sesión…</p>`;
}

function renderAnonymous() {
  return `
    <div class="connected-card">
      <h1>Aurora</h1>
      <p class="connected-hint">Iniciá sesión para ver tus viajes.</p>
      <p class="connected-placeholder">(El login todavía no está conectado — llega en el próximo commit.)</p>
    </div>
  `;
}

function renderAuthenticated(email) {
  return `
    <div class="connected-card">
      <p class="connected-email">${email}</p>
      <h2>Mis viajes</h2>
      <p class="connected-placeholder">(Todavía no hay viajes para mostrar acá.)</p>
      <button type="button" class="connected-logout" id="logout-button">Cerrar sesión</button>
    </div>
  `;
}

export function render(container, state, store = sessionStore) {
  const view = describeState(state);
  if (view.mode === 'checking') {
    container.innerHTML = renderChecking();
    return;
  }
  if (view.mode === 'anonymous') {
    container.innerHTML = renderAnonymous();
    return;
  }
  container.innerHTML = renderAuthenticated(view.email);
  container.querySelector('#logout-button')?.addEventListener('click', () => {
    store.logout();
  });
}

export function mount(container, store = sessionStore) {
  render(container, store.getState(), store);
  store.subscribe((state) => render(container, state, store));
  store.getSession();
}

if (typeof document !== 'undefined') {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    mount(appContainer);
  }
}
