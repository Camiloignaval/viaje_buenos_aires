import { useMutation } from "@tanstack/react-query";
import { acceptInvitation, declineInvitation } from "../api/invitationsApi";

// Aceptar / rechazar una invitación. La navegación y el reflejo de estados los
// decide la página (no auto-navega desde el hook).
export function useAcceptInvitation(token: string) {
  return useMutation({ mutationFn: () => acceptInvitation(token) });
}

export function useDeclineInvitation(token: string) {
  return useMutation({ mutationFn: () => declineInvitation(token) });
}
