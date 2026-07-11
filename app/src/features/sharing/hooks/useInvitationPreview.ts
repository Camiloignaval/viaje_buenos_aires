import { useQuery } from "@tanstack/react-query";
import { getInvitationPreview } from "../api/invitationsApi";

export const invitationQueryKey = (token: string) => ["invitation", token] as const;

// Preview público: no se reintenta (un 404/410 es definitivo; no hay sesión que
// recuperar). El error se maneja en la página para mostrar el estado honesto.
export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: invitationQueryKey(token),
    queryFn: () => getInvitationPreview(token),
    retry: false,
    enabled: Boolean(token),
  });
}
