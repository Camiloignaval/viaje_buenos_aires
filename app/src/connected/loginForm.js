// Estado y validación del login passwordless real de Aurora Platform.
// Usa exclusivamente sessionStore.requestCode()/verifyCode() (Etapa 3) — no
// duplica llamadas de red ni maneja JWT/tokens acá: la cookie HttpOnly la
// setea el server (ver lib/platformAuth.js), este módulo solo guarda texto
// tipeado y el estado del formulario. No guarda nada en localStorage.
//
// El backend real (lib/platformAuthCodes.js) es un código de 6 dígitos por
// email, no un link clickeable — por eso el flujo tiene dos pasos: pedir el
// código y después confirmarlo. En dev, sin proveedor de email configurado,
// el código queda solo en la consola del server (deliverAuthCode).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_CODE_LENGTH = 6;

export const LoginFormStatus = Object.freeze({
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  SENT: 'sent',
  VALIDATION_ERROR: 'validation-error',
  SUBMIT_ERROR: 'submit-error',
});

export function normalizeEmailInput(value) {
  return String(value ?? '').trim();
}

/** Validación mínima: obligatorio + formato básico. Nunca revela si el correo tiene cuenta o no. */
export function validateEmail(value) {
  const email = normalizeEmailInput(value);
  if (!email) {
    return 'Ingresa tu correo.';
  }
  if (!EMAIL_PATTERN.test(email)) {
    return 'Ingresa un correo válido.';
  }
  return null;
}

/** Solo dígitos, máximo 6 — así un código pegado con espacios/guiones ("123 456") también funciona. */
export function normalizeCodeInput(value) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, AUTH_CODE_LENGTH);
}

function initialState() {
  return { status: LoginFormStatus.IDLE, email: '', code: '', codeRequested: false, error: null };
}

/** Factory para poder inyectar un `session` fake en tests (requestCode/verifyCode, como sessionStore). */
export function createLoginFormController(session) {
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

  function reset() {
    setState(initialState());
  }

  /** Paso 1: valida y pide el código de acceso para `email`. No envía si es inválido. */
  async function requestAccess(email) {
    const trimmed = normalizeEmailInput(email);
    const validationError = validateEmail(trimmed);
    if (validationError) {
      setState({ ...state, status: LoginFormStatus.VALIDATION_ERROR, email: trimmed, error: validationError });
      return false;
    }

    setState({ ...state, status: LoginFormStatus.SUBMITTING, email: trimmed, error: null });
    try {
      await session.requestCode(trimmed);
      setState({ ...state, status: LoginFormStatus.SENT, email: trimmed, codeRequested: true, error: null });
      return true;
    } catch {
      setState({ ...state, status: LoginFormStatus.SUBMIT_ERROR, email: trimmed, error: 'No pudimos enviar el código. Intentá nuevamente.' });
      return false;
    }
  }

  /** Paso 2: confirma el código recibido. Al éxito, sessionStore ya queda authenticated. */
  async function confirmCode(code) {
    const normalized = normalizeCodeInput(code);
    if (normalized.length !== AUTH_CODE_LENGTH) {
      setState({ ...state, code: normalized, status: LoginFormStatus.VALIDATION_ERROR, error: 'Ingresa los 6 dígitos que te enviamos.' });
      return false;
    }

    setState({ ...state, code: normalized, status: LoginFormStatus.SUBMITTING, error: null });
    try {
      await session.verifyCode(state.email, normalized);
      return true;
    } catch {
      setState({ ...state, status: LoginFormStatus.SUBMIT_ERROR, error: 'El código no es correcto. Intentá nuevamente.' });
      return false;
    }
  }

  return { getState, subscribe, reset, requestAccess, confirmCode };
}
