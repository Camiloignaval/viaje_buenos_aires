import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeState, renderChecking, renderAnonymous, renderAuthenticated } from './connectedShell.js';
import { SessionStatus } from './sessionStore.js';
import { LoginFormStatus } from './loginForm.js';
import { TripsStatus } from './tripStore.js';

test('describeState en checking', () => {
  assert.deepEqual(describeState({ status: SessionStatus.CHECKING, user: null }), { mode: 'checking' });
});

test('describeState en anonymous', () => {
  assert.deepEqual(describeState({ status: SessionStatus.ANONYMOUS, user: null }), { mode: 'anonymous' });
});

test('describeState en authenticated expone el email del user', () => {
  const state = { status: SessionStatus.AUTHENTICATED, user: { id: '1', email: 'kari@example.com' } };
  assert.deepEqual(describeState(state), { mode: 'authenticated', email: 'kari@example.com' });
});

test('checking: es la misma composición editorial de página completa, con aria-live y sin spinner/skeleton', () => {
  const markup = renderChecking();
  assert.match(markup, /class="aurora-entrance"/);
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /Revisando tu sesión…/);
  assert.match(markup, />Aurora</);
  assert.doesNotMatch(markup, /spinner/);
  assert.doesNotMatch(markup, /skeleton/);
  assert.doesNotMatch(markup, /Cargando tu sesión/);
});

const idleLoginState = { status: LoginFormStatus.IDLE, email: '', code: '', codeRequested: false, error: null };
const idleFormState = { open: false, title: '', destination: '', errors: {}, submitting: false, submitError: null };
const emptyTripsState = { status: TripsStatus.EMPTY, trips: [], error: null };

test('paso email: aparece en anonymous con la composición editorial (no una card genérica)', () => {
  const markup = renderAnonymous(idleLoginState);
  assert.match(markup, /class="aurora-entrance"/);
  assert.match(markup, /id="login-email-form"/);
  assert.match(markup, /Tus viajes empiezan acá\./);
  assert.match(markup, /Continuar →/);
  assert.doesNotMatch(markup, /Mis viajes/);
});

test('paso email: submitting deshabilita el botón y muestra "Enviando código…"', () => {
  const markup = renderAnonymous({ ...idleLoginState, status: LoginFormStatus.SUBMITTING });
  assert.match(markup, /Enviando código…/);
  assert.match(markup, /<button type="submit" disabled>/);
});

test('paso email: un error de validación o de envío se muestra junto al campo', () => {
  const markup = renderAnonymous({ ...idleLoginState, status: LoginFormStatus.VALIDATION_ERROR, error: 'Ingresa un correo válido.' });
  assert.match(markup, /aria-live="assertive"/);
  assert.match(markup, /Ingresa un correo válido\./);
});

test('tras pedir el código, anonymous muestra el paso de confirmación, no el de email', () => {
  const markup = renderAnonymous({ status: LoginFormStatus.SENT, email: 'kari@example.com', code: '', codeRequested: true, error: null });
  assert.doesNotMatch(markup, /id="login-email-form"/);
  assert.match(markup, /id="login-code-form"/);
  assert.match(markup, /Revisa tu correo/);
  assert.match(markup, /Te enviamos seis números\./);
  assert.match(markup, /kari@example\.com/);
});

test('paso código: el input acepta hasta 6 dígitos numéricos y preserva lo tipeado', () => {
  const markup = renderAnonymous({ status: LoginFormStatus.VALIDATION_ERROR, email: 'kari@example.com', code: '123', codeRequested: true, error: 'Ingresa los 6 dígitos que te enviamos.' });
  assert.match(markup, /maxlength="6"/);
  assert.match(markup, /inputmode="numeric"/);
  assert.match(markup, /autocomplete="one-time-code"/);
  assert.match(markup, /value="123"/);
  assert.match(markup, /Ingresa los 6 dígitos que te enviamos\./);
});

test('paso código: submitting muestra "Abriendo…" y ofrece volver a cambiar el correo', () => {
  const markup = renderAnonymous({ status: LoginFormStatus.SUBMITTING, email: 'kari@example.com', code: '123456', codeRequested: true, error: null });
  assert.match(markup, /Abriendo…/);
  assert.match(markup, /id="use-another-email"/);
  assert.match(markup, /Usar otro correo/);
});

test('el login no aparece en authenticated', () => {
  const markup = renderAuthenticated('kari@example.com', emptyTripsState, idleFormState);
  assert.match(markup, /Mis viajes/);
  assert.doesNotMatch(markup, /login-email-form/);
  assert.doesNotMatch(markup, /login-code-form/);
  assert.doesNotMatch(markup, /aurora-entrance/);
});

test('crear viaje es su propia página editorial, no un modal colgado de "Mis viajes"', () => {
  const openFormState = { open: true, title: '', destination: '', errors: {}, submitting: false, submitError: null };
  const markup = renderAuthenticated('kari@example.com', emptyTripsState, openFormState);
  assert.match(markup, /Empecemos un nuevo viaje\./);
  assert.match(markup, /Dale un nombre a esta historia\./);
  assert.match(markup, /id="create-trip-form"/);
  assert.match(markup, />Volver</);
  assert.doesNotMatch(markup, /Cancelar/);
  assert.doesNotMatch(markup, /Mis viajes/);
  assert.doesNotMatch(markup, /kari@example\.com/);
});
