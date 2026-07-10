import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoginFormController, validateEmail, normalizeCodeInput, LoginFormStatus } from './loginForm.js';

function fakeSession(overrides = {}) {
  return {
    requestCode: async () => ({ ok: true }),
    verifyCode: async () => ({ id: '1', email: 'kari@example.com' }),
    ...overrides,
  };
}

test('validateEmail exige correo', () => {
  assert.equal(validateEmail(''), 'Ingresa tu correo.');
  assert.equal(validateEmail('   '), 'Ingresa tu correo.');
});

test('validateEmail exige formato básico válido', () => {
  assert.equal(validateEmail('no-es-un-correo'), 'Ingresa un correo válido.');
  assert.equal(validateEmail('kari@example.com'), null);
});

test('normalizeCodeInput se queda solo con dígitos, hasta 6', () => {
  assert.equal(normalizeCodeInput('123456'), '123456');
  assert.equal(normalizeCodeInput('123-456'), '123456');
  assert.equal(normalizeCodeInput('123 456 789'), '123456');
  assert.equal(normalizeCodeInput('abc123def456'), '123456');
  assert.equal(normalizeCodeInput(''), '');
  assert.equal(normalizeCodeInput(null), '');
});

test('arranca en idle, sin código pedido todavía', () => {
  const login = createLoginFormController(fakeSession());
  assert.deepEqual(login.getState(), { status: LoginFormStatus.IDLE, email: '', code: '', codeRequested: false, error: null });
});

test('requestAccess con correo vacío no llama a la API y expone el error de validación', async () => {
  let called = false;
  const login = createLoginFormController(fakeSession({ requestCode: async () => { called = true; } }));
  const ok = await login.requestAccess('   ');
  assert.equal(ok, false);
  assert.equal(called, false);
  assert.equal(login.getState().status, LoginFormStatus.VALIDATION_ERROR);
  assert.equal(login.getState().error, 'Ingresa tu correo.');
});

test('requestAccess con correo inválido no llama a la API', async () => {
  let called = false;
  const login = createLoginFormController(fakeSession({ requestCode: async () => { called = true; } }));
  const ok = await login.requestAccess('no-es-un-correo');
  assert.equal(ok, false);
  assert.equal(called, false);
  assert.equal(login.getState().status, LoginFormStatus.VALIDATION_ERROR);
});

test('requestAccess válido pasa por submitting y llega a sent con codeRequested', async () => {
  const seenStatus = [];
  const login = createLoginFormController(fakeSession());
  login.subscribe((state) => seenStatus.push(state.status));

  const ok = await login.requestAccess('  Kari@Example.com  ');

  assert.equal(ok, true);
  assert.deepEqual(seenStatus, [LoginFormStatus.SUBMITTING, LoginFormStatus.SENT]);
  assert.deepEqual(login.getState(), {
    status: LoginFormStatus.SENT,
    email: 'Kari@Example.com',
    code: '',
    codeRequested: true,
    error: null,
  });
});

test('requestAccess ante un error de la API queda en submit-error, sin marcar codeRequested', async () => {
  const login = createLoginFormController(fakeSession({ requestCode: async () => { throw new Error('sin conexión'); } }));
  const ok = await login.requestAccess('kari@example.com');
  assert.equal(ok, false);
  const state = login.getState();
  assert.equal(state.status, LoginFormStatus.SUBMIT_ERROR);
  assert.equal(state.codeRequested, false);
  assert.equal(state.error, 'No pudimos enviar el código. Intentá nuevamente.');
});

test('confirmCode con código incompleto no llama a verifyCode y preserva lo tipeado', async () => {
  let called = false;
  const login = createLoginFormController(fakeSession({ verifyCode: async () => { called = true; } }));
  await login.requestAccess('kari@example.com');
  const ok = await login.confirmCode('123');
  assert.equal(ok, false);
  assert.equal(called, false);
  const state = login.getState();
  assert.equal(state.status, LoginFormStatus.VALIDATION_ERROR);
  assert.equal(state.code, '123');
  assert.equal(state.error, 'Ingresa los 6 dígitos que te enviamos.');
});

test('confirmCode normaliza el código pegado (con espacios/guiones) antes de validar/enviar', async () => {
  let receivedCode = null;
  const login = createLoginFormController(fakeSession({ verifyCode: async (email, code) => { receivedCode = code; return { id: '1', email }; } }));
  await login.requestAccess('kari@example.com');
  const ok = await login.confirmCode('123-456');
  assert.equal(ok, true);
  assert.equal(receivedCode, '123456');
});

test('confirmCode válido delega en session.verifyCode (que autentica) y resuelve true', async () => {
  let receivedArgs = null;
  const login = createLoginFormController(
    fakeSession({ verifyCode: async (email, code) => { receivedArgs = { email, code }; return { id: '1', email }; } })
  );
  await login.requestAccess('kari@example.com');
  const ok = await login.confirmCode('123456');
  assert.equal(ok, true);
  assert.deepEqual(receivedArgs, { email: 'kari@example.com', code: '123456' });
});

test('confirmCode ante un código inválido/vencido queda en submit-error', async () => {
  const login = createLoginFormController(fakeSession({ verifyCode: async () => { throw new Error('Código expirado o inválido.'); } }));
  await login.requestAccess('kari@example.com');
  const ok = await login.confirmCode('000000');
  assert.equal(ok, false);
  const state = login.getState();
  assert.equal(state.status, LoginFormStatus.SUBMIT_ERROR);
  assert.equal(state.error, 'El código no es correcto. Intentá nuevamente.');
});

test('confirmCode marca submitting mientras espera la verificación', async () => {
  const seenStatus = [];
  const login = createLoginFormController(fakeSession());
  await login.requestAccess('kari@example.com');
  login.subscribe((state) => seenStatus.push(state.status));

  await login.confirmCode('123456');

  assert.deepEqual(seenStatus, [LoginFormStatus.SUBMITTING]);
});

test('reset() vuelve al estado inicial', async () => {
  const login = createLoginFormController(fakeSession());
  await login.requestAccess('kari@example.com');
  login.reset();
  assert.deepEqual(login.getState(), { status: LoginFormStatus.IDLE, email: '', code: '', codeRequested: false, error: null });
});
