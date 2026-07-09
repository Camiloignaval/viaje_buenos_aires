// Entrada mínima de Aurora Platform conectada (Etapa 4 — app.html).
// Monta según el estado de sessionStore: checking -> loading sobrio,
// anonymous -> placeholder de login (el flujo real llega en un próximo commit),
// authenticated -> email + "Mis viajes" (lista + crear) + logout funcional.
// No conoce Story Engine, render.js ni experience.html — esto envuelve a
// Aurora, nunca la reemplaza ni la rediseña. Abrir un viaje solo navega a
// /experience.html?tripId=... — Aurora nunca se renderiza dentro del shell.

import { sessionStore, SessionStatus } from './sessionStore.js';
import { tripStore, TripsStatus } from './tripStore.js';
import { createTripFormController } from './createTripForm.js';
import { tripUrl } from './tripsList.js';

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

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function renderChecking() {
  return `<p class="connected-loading">Cargando tu sesión…</p>`;
}

function renderAnonymous() {
  return `
    <div class="connected-card">
      <h1>Aurora</h1>
      <p class="connected-hint">Iniciá sesión para ver tus viajes.</p>
      <p class="connected-placeholder">(El login todavía no está conectado — llega en un próximo commit.)</p>
    </div>
  `;
}

function renderTripsSection(tripsState) {
  if (tripsState.status === TripsStatus.LOADING) {
    return `<p class="connected-loading">Buscando tus viajes…</p>`;
  }
  if (tripsState.status === TripsStatus.ERROR) {
    return `
      <p class="connected-error">${escapeHtml(tripsState.error)}</p>
      <button type="button" class="connected-link-button" id="trips-retry">Reintentar</button>
    `;
  }
  if (tripsState.status === TripsStatus.EMPTY) {
    return `<p class="connected-placeholder">Todavía no armaste ningún viaje.</p>`;
  }
  return `
    <ul class="trips-index">
      ${tripsState.trips
        .map(
          (trip) => `
        <li>
          <button type="button" class="trip-entry" data-trip-id="${escapeHtml(trip.id)}">
            <span class="trip-entry-title">${escapeHtml(trip.title)}</span>
            <span class="trip-entry-destination">${escapeHtml(trip.destination)}</span>
          </button>
        </li>`
        )
        .join('')}
    </ul>
  `;
}

function renderCreateTripForm(formState) {
  if (!formState.open) {
    return `<button type="button" class="connected-link-button" id="open-create-trip">+ Crear viaje</button>`;
  }
  return `
    <form id="create-trip-form" class="create-trip-form" novalidate>
      <label>
        Título
        <input type="text" name="title" value="${escapeHtml(formState.title)}" />
      </label>
      ${formState.errors.title ? `<p class="connected-error">${escapeHtml(formState.errors.title)}</p>` : ''}
      <label>
        Destino
        <input type="text" name="destination" value="${escapeHtml(formState.destination)}" />
      </label>
      ${formState.errors.destination ? `<p class="connected-error">${escapeHtml(formState.errors.destination)}</p>` : ''}
      ${formState.submitError ? `<p class="connected-error">${escapeHtml(formState.submitError)}</p>` : ''}
      <div class="create-trip-actions">
        <button type="button" id="cancel-create-trip">Cancelar</button>
        <button type="submit" ${formState.submitting ? 'disabled' : ''}>${formState.submitting ? 'Creando…' : 'Crear viaje'}</button>
      </div>
    </form>
  `;
}

function renderAuthenticated(email, tripsState, formState) {
  return `
    <div class="connected-card connected-card-wide">
      <p class="connected-email">${escapeHtml(email)}</p>
      <h2>Mis viajes</h2>
      ${renderTripsSection(tripsState)}
      ${renderCreateTripForm(formState)}
      <button type="button" class="connected-logout" id="logout-button">Cerrar sesión</button>
    </div>
  `;
}

function wireAuthenticated(container, { store, trips, form }) {
  container.querySelector('#logout-button')?.addEventListener('click', () => {
    store.logout();
  });

  container.querySelector('#trips-retry')?.addEventListener('click', () => {
    trips.loadTrips();
  });

  container.querySelector('#open-create-trip')?.addEventListener('click', () => {
    form.open();
  });

  container.querySelector('#cancel-create-trip')?.addEventListener('click', () => {
    form.cancel();
  });

  const formEl = container.querySelector('#create-trip-form');
  formEl?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(formEl);
    form.submit({ title: data.get('title') ?? '', destination: data.get('destination') ?? '' });
  });

  container.querySelectorAll('.trip-entry').forEach((button) => {
    button.addEventListener('click', () => {
      window.location.href = tripUrl(button.dataset.tripId);
    });
  });
}

function renderRoot(container, { session, trips, form }, actions) {
  const view = describeState(session);
  if (view.mode === 'checking') {
    container.innerHTML = renderChecking();
    return;
  }
  if (view.mode === 'anonymous') {
    container.innerHTML = renderAnonymous();
    return;
  }
  container.innerHTML = renderAuthenticated(view.email, trips, form);
  wireAuthenticated(container, actions);
}

export function mount(container, store = sessionStore, trips = tripStore) {
  const form = createTripFormController(trips);
  let tripsUnsubscribe = null;

  function renderCurrent() {
    renderRoot(container, { session: store.getState(), trips: trips.getState(), form: form.getState() }, { store, trips, form });
  }

  form.subscribe(renderCurrent);
  store.subscribe((sessionState) => {
    if (sessionState.status === SessionStatus.AUTHENTICATED) {
      if (!tripsUnsubscribe) {
        tripsUnsubscribe = trips.subscribe(renderCurrent);
        trips.loadTrips();
      }
    } else if (tripsUnsubscribe) {
      tripsUnsubscribe();
      tripsUnsubscribe = null;
      form.cancel();
    }
    renderCurrent();
  });

  renderCurrent();
  store.getSession();
}

if (typeof document !== 'undefined') {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    mount(appContainer);
  }
}
