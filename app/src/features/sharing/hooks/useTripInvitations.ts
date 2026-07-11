import { useQuery } from "@tanstack/react-query";
import { listTripInvitations } from "../api/invitationsApi";

export const tripInvitationsQueryKey = (tripId: string) => ["trip-invitations", tripId] as const;

// Invitaciones pendientes del viaje (solo owner). `enabled` evita pegarle al
// endpoint (403) cuando el usuario no es owner.
export function useTripInvitations(tripId: string, enabled: boolean) {
  return useQuery({
    queryKey: tripInvitationsQueryKey(tripId),
    queryFn: () => listTripInvitations(tripId),
    enabled: enabled && Boolean(tripId),
    retry: false,
  });
}
