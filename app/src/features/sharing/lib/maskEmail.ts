// Enmascara un email igual que el backend (platformInvitations.maskEmail): primer
// carácter del local + puntos + dominio. Se usa para comparar el correo de sesión
// contra el `invitedEmailMasked` del preview SIN conocer el email invitado real,
// y así mostrar el estado "otro correo" de forma proactiva. El server valida igual
// en /accept (403), así que esta comparación es solo UX, no seguridad.
export function maskEmail(email: string): string {
  const raw = String(email ?? "");
  const at = raw.indexOf("@");
  if (at <= 0) return "•••";
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  return `${local.slice(0, 1)}${"•".repeat(Math.max(1, local.length - 1))}@${domain}`;
}
