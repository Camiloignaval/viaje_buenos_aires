// Cliente HTTP delgado hacia Aurora Platform (api/auth/*, api/trips/*,
// api/stories/*). No mantiene estado — eso es de los hooks de cada feature.
// `credentials: "include"` es obligatorio: la sesión vive en una cookie
// HttpOnly (aurora_session, lib/platformAuth.js) que el JS no puede leer.
//
// Port TS del núcleo del viejo platformApi.js. El contrato de red no cambia.

export class PlatformApiError extends Error {
  readonly status: number;
  // Ruta que falló. Da contexto para el manejo global de errores: p. ej. un 401
  // de `/api/auth/verify-code` (código incorrecto) NO es lo mismo que un 401 de
  // `/api/trips` (sesión vencida). `path` optativo por compatibilidad.
  readonly path: string;

  constructor(message: string, status: number, path = "") {
    super(message);
    this.name = "PlatformApiError";
    this.status = status;
    this.path = path;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function platformRequest<T>(
  path: string,
  { method = "GET", body }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data as { error?: string }).error ?? "Error de la plataforma.";
    throw new PlatformApiError(message, response.status, path);
  }
  return data as T;
}
