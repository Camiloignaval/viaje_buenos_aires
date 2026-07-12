import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/authApi";
import { sessionQueryKey } from "./useSession";

// Al cerrar sesión, la RequireAuth reacciona al cambio de cache y redirige a /login.
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(sessionQueryKey, { user: null });
    },
  });
}
