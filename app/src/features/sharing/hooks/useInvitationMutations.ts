import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInvitation, revokeInvitation } from "../api/invitationsApi";
import { tripInvitationsQueryKey } from "./useTripInvitations";

// Crear / revocar invitaciones (owner). Ambas refrescan la lista de pendientes.
export function useCreateInvitation(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => createInvitation(tripId, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripInvitationsQueryKey(tripId) }),
  });
}

export function useRevokeInvitation(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(tripId, invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripInvitationsQueryKey(tripId) }),
  });
}
