import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/features/auth/hooks/useSession";

// Gate posterior a RequireAuth: un usuario autenticado sin onboarding completo
// siempre cae a /onboarding antes de llegar a sus viajes.
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  if (user && !user.onboardingCompleted) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/onboarding?returnTo=${returnTo}`} replace />;
  }
  return <>{children}</>;
}
