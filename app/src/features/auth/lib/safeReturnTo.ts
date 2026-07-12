// Rutas internas permitidas como destino post-login. Un `returnTo` solo se honra
// si apunta a una de estas (o a una subruta). Todo lo demás se descarta para
// evitar open redirects (//host, https://…, javascript:, backslashes, etc.).
const ALLOWED_PREFIXES = ["/invite/", "/trips", "/experience", "/onboarding"] as const;

// Fallback interno cuando no hay un returnTo válido.
export const DEFAULT_RETURN_TO = "/trips";

export function safeReturnTo(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;

  // Debe ser una ruta interna absoluta: empieza con "/" pero NO con "//"
  // (protocol-relative) ni "/\". Sin esquema ni backslashes.
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (raw.includes("\\") || raw.includes("://")) return null;

  const path = raw.split(/[?#]/, 1)[0];
  const allowed = ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
  return allowed ? raw : null;
}
