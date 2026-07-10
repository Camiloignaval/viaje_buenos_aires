// Entrada mínima de Aurora Platform conectada (Etapa 4 — app.html).
// Monta según el estado de sessionStore: checking -> loading sobrio,
// anonymous -> el umbral editorial de Aurora (login passwordless real: pedir
// código + confirmarlo), authenticated -> email + "Mis viajes" (lista + crear) + logout.
// No conoce Story Engine, render.js ni experience.html — esto envuelve a
// Aurora, nunca la reemplaza ni la rediseña. Abrir un viaje solo navega a
// /experience.html?tripId=... — Aurora nunca se renderiza dentro del shell.

import { sessionStore, SessionStatus } from './sessionStore.js';
import { tripStore, TripsStatus } from './tripStore.js';
import { createTripFormController } from './createTripForm.js';
import { createLoginFormController, LoginFormStatus, normalizeCodeInput } from './loginForm.js';
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

/** Exportado solo para testear el markup sin DOM (jsdom-less) — el wiring real vive en mount(). */
export function renderChecking() {
  return `
    <div class="aurora-entrance">
      ${renderAuroraParticles('aurora-particles-subtle')}
      <div class="aurora-loading" role="status" aria-live="polite">
        <p class="aurora-eyebrow">Aurora</p>
        <p class="aurora-loading-text">Revisando tu sesión…</p>
        <div class="aurora-halo" aria-hidden="true">
          <span class="aurora-halo-ring"></span>
          <span class="aurora-halo-orbit"><span class="aurora-halo-light"></span></span>
        </div>
        <p class="aurora-loading-hint">Un instante.</p>
      </div>
    </div>
  `;
}

function renderEmailStep(loginState) {
  const submitting = loginState.status === LoginFormStatus.SUBMITTING;
  const showError = loginState.status === LoginFormStatus.VALIDATION_ERROR || loginState.status === LoginFormStatus.SUBMIT_ERROR;
  return `
    <p class="aurora-eyebrow">Aurora</p>
    <h1 class="aurora-entrance-title">Tus viajes empiezan acá.</h1>
    <p class="aurora-entrance-text">Escribí tu correo y te enviamos un código para entrar.</p>
    <form id="login-email-form" class="aurora-entrance-form" novalidate>
      <label for="login-email-input">Tu correo</label>
      <input
        id="login-email-input"
        type="email"
        name="email"
        value="${escapeHtml(loginState.email)}"
        autocomplete="email"
        placeholder="tu@ejemplo.com"
        autofocus
      />
      <button type="submit" ${submitting ? 'disabled' : ''}>${submitting ? 'Enviando código…' : 'Continuar →'}</button>
      <p class="aurora-entrance-error" role="alert" aria-live="assertive">${showError ? escapeHtml(loginState.error) : ''}</p>
    </form>
    <p class="aurora-entrance-footer">Ya empezaste este viaje.</p>
  `;
}

function renderCodeStep(loginState) {
  const submitting = loginState.status === LoginFormStatus.SUBMITTING;
  const showError = loginState.status === LoginFormStatus.VALIDATION_ERROR || loginState.status === LoginFormStatus.SUBMIT_ERROR;
  return `
    <p class="aurora-eyebrow">Revisa tu correo</p>
    <h1 class="aurora-entrance-title">Te enviamos seis números.</h1>
    <p class="aurora-entrance-text">Escríbelos acá para abrir Aurora.</p>
    <p class="aurora-entrance-email">${escapeHtml(loginState.email)}</p>
    <form id="login-code-form" class="aurora-entrance-form" novalidate>
      <label for="login-code-input">Código</label>
      <input
        id="login-code-input"
        type="text"
        name="code"
        value="${escapeHtml(loginState.code)}"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        pattern="[0-9]*"
        placeholder="••••••"
        class="aurora-code-input"
        autofocus
      />
      <button type="submit" ${submitting ? 'disabled' : ''}>${submitting ? 'Abriendo…' : 'Entrar a Aurora →'}</button>
      <p class="aurora-entrance-error" role="alert" aria-live="assertive">${showError ? escapeHtml(loginState.error) : ''}</p>
    </form>
    <button type="button" class="aurora-entrance-secondary" id="use-another-email">Usar otro correo</button>
  `;
}

// Misma receta de partículas doradas que .index-particles en experience.css/
// render.js (profundidad far/mid/near -> tamaño/velocidad/opacidad/nitidez) —
// valores reutilizados literalmente, sin importar ese archivo (Aurora nunca
// se renderiza dentro del shell, ver nota arriba). Set reducido: acá es solo
// atmósfera de fondo de una pantalla de login, no la escena cinematográfica.
const AURORA_PARTICLE_DEPTH = {
  far: { opacity: 0.5, blur: 0.9 },
  mid: { opacity: 1, blur: 0.15 },
  near: { opacity: 1.3, blur: 0 },
};

const AURORA_ENTRANCE_PARTICLES = [
  ...[
    [6, 1.3, 66, 40, -6],
    [19, 1.5, 72, 12, 10],
    [48, 1.4, 68, 5, 7],
    [77, 1.5, 63, 20, 9],
  ].map((p) => [...p, 'far']),
  ...[
    [24, 2.7, 44, 6, 12],
    [52, 2.8, 46, 24, 9],
    [80, 2.6, 42, 37, 13],
  ].map((p) => [...p, 'mid']),
  ...[
    [15, 3.6, 24, 8, -15],
    [70, 3.4, 22, 3, -13],
  ].map((p) => [...p, 'near']),
];

const AURORA_ENTRANCE_GLINTS = [
  [14, 22, 1.3, 8.5, 1.0, 'far'],
  [81, 15, 1.4, 8.8, 3.0, 'far'],
  [38, 30, 2.0, 5.4, 2.0, 'near'],
  [66, 58, 2.2, 5.8, 0.5, 'near'],
];

function renderAuroraParticles(extraClass = '') {
  const rising = AURORA_ENTRANCE_PARTICLES.map(([left, size, duration, delay, drift, depth]) => {
    const { opacity, blur } = AURORA_PARTICLE_DEPTH[depth];
    return `<span class="aurora-particle aurora-particle-rise" style="--p-left:${left}%;--p-size:${size}px;--p-duration:${duration}s;--p-delay:-${delay}s;--p-drift:${drift}px;--p-opacity:${opacity};--p-blur:${blur}px"></span>`;
  }).join('');
  const glints = AURORA_ENTRANCE_GLINTS.map(([left, top, size, duration, delay, depth]) => {
    const { opacity, blur } = AURORA_PARTICLE_DEPTH[depth];
    return `<span class="aurora-particle aurora-particle-glint" style="--p-left:${left}%;--p-top:${top}%;--p-size:${size}px;--p-duration:${duration}s;--p-delay:-${delay}s;--p-opacity:${opacity};--p-blur:${blur}px"></span>`;
  }).join('');
  return `<div class="aurora-particles ${extraClass}" aria-hidden="true">${rising}${glints}</div>`;
}

/** Exportado solo para testear el markup sin DOM (jsdom-less) — el wiring real vive en mount(). */
export function renderAnonymous(loginState) {
  const step = loginState.codeRequested ? 'code' : 'email';
  return `
    <div class="aurora-entrance">
      ${renderAuroraParticles()}
      <div class="aurora-entrance-content" data-step="${step}">
        ${step === 'code' ? renderCodeStep(loginState) : renderEmailStep(loginState)}
      </div>
    </div>
  `;
}

// Numeración de capítulo como en el índice de experience.html — mismo algoritmo
// que toRoman() en experience/render.js, duplicado literalmente (este archivo
// no importa nada de Story Engine, ver nota arriba).
function toRoman(number) {
  const table = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let remaining = number;
  let roman = '';
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      roman += symbol;
      remaining -= value;
    }
  }
  return roman || String(number);
}

/** Cada viaje es un capítulo del índice — mismo lenguaje que .chapter-index en experience.css. */
function renderTripsIndex(trips) {
  return `
    <ul class="trips-index">
      ${trips
        .map(
          (trip, index) => `
        <li class="trip-index-item">
          <button type="button" class="trip-entry" data-trip-id="${escapeHtml(trip.id)}">
            <span class="trip-entry-number" aria-hidden="true">${toRoman(index + 1)}</span>
            <span class="trip-entry-text">
              <span class="trip-entry-title">${escapeHtml(trip.title)}</span>
              <span class="trip-entry-status">${escapeHtml(trip.destination)}</span>
            </span>
            <span class="trip-entry-enter" aria-hidden="true">Entrar →</span>
          </button>
        </li>`
        )
        .join('')}
    </ul>
  `;
}

/** La escena vacía es el umbral de un libro sin escribir, no un mensaje técnico: "Crear viaje" es lo único que importa acá. */
function renderTripsEmptyScene() {
  return `
    <div class="trips-empty">
      <p class="trips-empty-text">Todavía no empezaste ningún viaje. Cuando lo hagas, va a abrirse acá como el primer capítulo.</p>
      <button type="button" class="trips-create-link trips-create-link-primary" id="open-create-trip">Crear viaje →</button>
    </div>
  `;
}

function renderTripsSection(tripsState) {
  if (tripsState.status === TripsStatus.LOADING) {
    return `<p class="trips-loading">Buscando tus viajes…</p>`;
  }
  if (tripsState.status === TripsStatus.ERROR) {
    return `
      <p class="trips-error">${escapeHtml(tripsState.error)}</p>
      <button type="button" class="trips-create-link" id="trips-retry">Reintentar</button>
    `;
  }
  if (tripsState.status === TripsStatus.EMPTY) {
    return renderTripsEmptyScene();
  }
  return renderTripsIndex(tripsState.trips);
}

function renderCreateTripToggle() {
  return `<button type="button" class="trips-create-link" id="open-create-trip">+ Un nuevo viaje</button>`;
}

function renderCreateTripForm(formState) {
  return `
    <form id="create-trip-form" class="trip-form" novalidate>
      <label for="trip-title-input">Título</label>
      <input id="trip-title-input" type="text" name="title" value="${escapeHtml(formState.title)}" autofocus />
      ${formState.errors.title ? `<p class="trips-error">${escapeHtml(formState.errors.title)}</p>` : ''}
      <label for="trip-destination-input">Destino</label>
      <input id="trip-destination-input" type="text" name="destination" value="${escapeHtml(formState.destination)}" />
      ${formState.errors.destination ? `<p class="trips-error">${escapeHtml(formState.errors.destination)}</p>` : ''}
      ${formState.submitError ? `<p class="trips-error">${escapeHtml(formState.submitError)}</p>` : ''}
      <div class="trip-form-actions">
        <button type="button" class="trip-form-cancel" id="cancel-create-trip">Volver</button>
        <button type="submit" class="trip-form-submit" ${formState.submitting ? 'disabled' : ''}>${formState.submitting ? 'Creando…' : 'Crear viaje →'}</button>
      </div>
    </form>
  `;
}

/** Crear viaje es su propia página editorial (no un modal CRUD colgado de "Mis viajes"). */
function renderCreateTripPage(formState) {
  return `
    <div class="trips-page">
      ${renderAuroraParticles('aurora-particles-subtle')}
      <div class="trips-page-content">
        <p class="aurora-eyebrow">Aurora</p>
        <h1 class="trips-title">Empecemos un nuevo viaje.</h1>
        <p class="trips-account">Dale un nombre a esta historia.</p>
        ${renderCreateTripForm(formState)}
      </div>
    </div>
  `;
}

/** Exportado solo para testear el markup sin DOM (jsdom-less) — el wiring real vive en mount(). */
export function renderAuthenticated(email, tripsState, formState) {
  if (formState.open) {
    return renderCreateTripPage(formState);
  }
  const hasTrips = tripsState.status === TripsStatus.EMPTY ? false : tripsState.trips?.length > 0;
  const showEmptyScene = tripsState.status === TripsStatus.EMPTY;
  return `
    <div class="trips-page">
      ${renderAuroraParticles('aurora-particles-subtle')}
      <div class="trips-page-content">
        <p class="aurora-eyebrow">Aurora</p>
        <h1 class="trips-title">Mis viajes</h1>
        ${showEmptyScene ? '' : `<p class="trips-account">${escapeHtml(email)}</p>`}
        ${renderTripsSection(tripsState)}
        ${hasTrips ? renderCreateTripToggle() : ''}
        <button type="button" class="trips-logout" id="logout-button">Cerrar sesión</button>
      </div>
    </div>
  `;
}

function wireAnonymous(container, { login }) {
  const emailForm = container.querySelector('#login-email-form');
  emailForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(emailForm);
    login.requestAccess(data.get('email') ?? '');
  });

  const codeForm = container.querySelector('#login-code-form');
  codeForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(codeForm);
    login.confirmCode(data.get('code') ?? '');
  });

  // Filtra a solo-dígitos en vivo (también cubre pegar el código completo, ya
  // que pegar dispara el mismo evento 'input') — la validación real sigue
  // viviendo en loginForm.js, esto es puramente cosmético.
  const codeInput = container.querySelector('#login-code-input');
  codeInput?.addEventListener('input', () => {
    codeInput.value = normalizeCodeInput(codeInput.value);
  });

  container.querySelector('#use-another-email')?.addEventListener('click', () => {
    login.reset();
  });
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

function renderRoot(container, { session, trips, form, login }, actions) {
  const view = describeState(session);
  if (view.mode === 'checking') {
    container.innerHTML = renderChecking();
    return;
  }
  if (view.mode === 'anonymous') {
    container.innerHTML = renderAnonymous(login);
    wireAnonymous(container, actions);
    return;
  }
  container.innerHTML = renderAuthenticated(view.email, trips, form);
  wireAuthenticated(container, actions);
}

export function mount(container, store = sessionStore, trips = tripStore) {
  const form = createTripFormController(trips);
  const login = createLoginFormController(store);
  let tripsUnsubscribe = null;

  function renderCurrent() {
    renderRoot(
      container,
      { session: store.getState(), trips: trips.getState(), form: form.getState(), login: login.getState() },
      { store, trips, form, login }
    );
  }

  form.subscribe(renderCurrent);
  login.subscribe(renderCurrent);
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
      login.reset();
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
