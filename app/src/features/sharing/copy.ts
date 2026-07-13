// Copy editorial de Alaia Together. Invitar es compartir una historia, no un
// documento: cálido, claro y honesto, sin perder seguridad.
import type { InvitationStatus } from "./types";

export const inviteCopy = {
  eyebrow: "Alaia",
  invitedTitle: "Te invitaron a compartir una historia.",
  decisionTitle: "¿Quieres formar parte de esta historia?",
  ownerShares: (owner: string, trip: string) => `${owner} quiere compartir ${trip} contigo.`,
  loginPrompt: "Antes de aceptar, inicia sesión con el correo al que llegó esta invitación.",
  loginCta: "Iniciar sesión para continuar →",
  accept: "Aceptar invitación →",
  decline: "Rechazar",
  wrongEmailTitle: "Esta invitación fue enviada a otro correo.",
  wrongEmailText: "Cierra sesión e inicia con el correo al que llegó la invitación para poder aceptarla.",
  logout: "Cerrar sesión",
  backToTrips: "← Volver a Mis viajes",
};

type TerminalVariant = Exclude<InvitationStatus, "pending"> | "not-found" | "error";

export const inviteStatusCopy: Record<TerminalVariant, { title: string; text: string }> = {
  accepted: {
    title: "Ya eres parte de esta historia.",
    text: "Aceptaste esta invitación. Encuentra el viaje entre tus historias.",
  },
  declined: {
    title: "Rechazaste esta invitación.",
    text: "No pasa nada. Si cambias de idea, pídele a quien te invitó que te comparta el enlace otra vez.",
  },
  revoked: {
    title: "Esta invitación ya no está disponible.",
    text: "Quien te invitó la dio de baja. Pídele un nuevo enlace si quieres unirte.",
  },
  expired: {
    title: "Esta invitación venció.",
    text: "El enlace ya no es válido. Pídele a quien te invitó que te comparta uno nuevo.",
  },
  "not-found": {
    title: "No encontramos esta invitación.",
    text: "El enlace no es válido o ya no existe. Pídele a quien te invitó que te lo comparta de nuevo.",
  },
  error: {
    title: "Algo se interrumpió.",
    text: "No pudimos cargar la invitación en este momento. Prueba de nuevo en un rato.",
  },
};
