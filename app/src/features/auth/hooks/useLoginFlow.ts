import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestCode, verifyCode } from "../api/authApi";
import { sessionQueryKey } from "./useSession";

// Las dos mutaciones del login passwordless. Al confirmar el código, escribe la
// sesión directo en el cache → toda la app pasa a authenticated sin refetch.
export function useLoginFlow() {
  const queryClient = useQueryClient();

  const request = useMutation({
    mutationFn: (email: string) => requestCode(email),
  });

  const verify = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      verifyCode(email, code),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, { user: data.user });
    },
  });

  return { request, verify };
}
