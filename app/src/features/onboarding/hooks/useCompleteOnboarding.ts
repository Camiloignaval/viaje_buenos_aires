import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding } from "../api/onboardingApi";
import { sessionQueryKey } from "@/features/auth/hooks/useSession";
import type { OnboardingInput } from "../types";

// Escribe la sesión actualizada directo en el cache (igual que useLoginFlow):
// la app entera pasa a onboardingCompleted:true sin refetch.
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardingInput) => completeOnboarding(input),
    onSuccess: (data) => {
      queryClient.setQueryData(sessionQueryKey, { user: data.user });
    },
  });
}
