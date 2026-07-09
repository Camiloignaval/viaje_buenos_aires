// Cliente HTTP delgado hacia los endpoints de autenticación de Aurora Platform
// (api/auth/*, Etapa 3). No mantiene estado — eso es responsabilidad de sessionStore.js.
// `credentials: 'include'` es necesario porque la sesión vive en una cookie HttpOnly
// (aurora_session, ver lib/platformAuth.js) que el JS del browser no puede leer directo.

export class PlatformApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'PlatformApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PlatformApiError(data.error ?? 'Error de la plataforma.', response.status);
  }
  return data;
}

/** Pide un código de acceso por email. Resuelve `{ok: true}` — el código llega por fuera (email). */
export function requestCode(email, { fetchImpl } = {}) {
  return request('/api/auth/request-code', { method: 'POST', body: { email }, fetchImpl });
}

/** Canjea email+código por una sesión. Resuelve `{user, expiresAt}`; la cookie de sesión la setea el server. */
export function verifyCode(email, code, { fetchImpl } = {}) {
  return request('/api/auth/verify-code', { method: 'POST', body: { email, code }, fetchImpl });
}

/** Consulta la sesión actual a partir de la cookie. Resuelve `{user: null}` si no hay sesión válida. */
export function getSession({ fetchImpl } = {}) {
  return request('/api/auth/session', { fetchImpl });
}

/** Cierra la sesión (borra la cookie en el server). */
export function logout({ fetchImpl } = {}) {
  return request('/api/auth/logout', { method: 'POST', fetchImpl });
}
