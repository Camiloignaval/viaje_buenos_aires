import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "@/features/auth/hooks/useSession";

// Gate posterior a RequireAuth: un usuario autenticado sin onboarding completo
// siempre cae a /onboarding antes de llegar a sus viajes.
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { user } = useSession();
  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
