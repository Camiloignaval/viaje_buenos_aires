import { platformRequest } from "@/services/platformClient";
import type { User } from "@/features/auth/types";
import type { OnboardingInput } from "../types";

/** Completa el perfil mínimo (displayName + país de residencia). El email ya está en la sesión. */
export function completeOnboarding(input: OnboardingInput) {
  return platformRequest<{ user: User }>("/api/users/onboarding", {
    method: "POST",
    body: input,
  });
}
