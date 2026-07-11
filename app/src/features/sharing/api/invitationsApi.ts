import { platformRequest } from "@/services/platformClient";
import type { CreateInvitationResult, InvitationPreview, PendingInvitation } from "../types";

/** Preview público sanitizado de una invitación (sin sesión). 404 si no existe. */
export function getInvitationPreview(token: string) {
  return platformRequest<{ invitation: InvitationPreview }>(
    `/api/invitations/${encodeURIComponent(token)}`,
  );
}

/** Acepta la invitación (requiere sesión con el email invitado). Devuelve el tripId. */
export function acceptInvitation(token: string) {
  return platformRequest<{ tripId: string; alreadyAccepted?: boolean }>(
    `/api/invitations/${encodeURIComponent(token)}/accept`,
    { method: "POST" },
  );
}

/** Rechaza la invitación (requiere sesión). El token queda inutilizable. */
export function declineInvitation(token: string) {
  return platformRequest<{ status: string }>(
    `/api/invitations/${encodeURIComponent(token)}/decline`,
    { method: "POST" },
  );
}

/** Crea una invitación por email (solo owner). Devuelve inviteUrl (solo aquí). */
export function createInvitation(tripId: string, email: string) {
  return platformRequest<CreateInvitationResult>(
    `/api/trips/${encodeURIComponent(tripId)}/invitations`,
    { method: "POST", body: { email } },
  );
}

/** Invitaciones pendientes del viaje (solo owner), enmascaradas. */
export function listTripInvitations(tripId: string) {
  return platformRequest<{ invitations: PendingInvitation[] }>(
    `/api/trips/${encodeURIComponent(tripId)}/invitations`,
  );
}

/** Revoca una invitación pendiente (solo owner). */
export function revokeInvitation(tripId: string, invitationId: string) {
  return platformRequest<{ status: string }>(
    `/api/trips/${encodeURIComponent(tripId)}/invitations/${encodeURIComponent(invitationId)}/revoke`,
    { method: "POST" },
  );
}
