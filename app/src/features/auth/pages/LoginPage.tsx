import { Navigate, useSearchParams } from "react-router-dom";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";
import { useSession } from "../hooks/useSession";
import { CheckingSession } from "../components/CheckingSession";
import { LoginForm } from "../components/LoginForm";
import { safeReturnTo } from "../lib/safeReturnTo";

// El umbral de Alaia. Default export para lazy() en el router. Con sesión
// autenticada redirige: si hay un `returnTo` interno válido (p. ej. una
// invitación), vuelve ahí — así el invitado retoma la decisión sin perder el
// enlace ni exigir onboarding en el camino. Sin returnTo, va a /trips o a
// /onboarding según el perfil. En cualquier otro estado muestra el formulario;
// nunca hay redirect loop porque sólo se redirige en estados definitivos.
export default function LoginPage() {
  const { status, user } = useSession();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  if (status === "checking") return <CheckingSession />;
  if (status === "authenticated") {
    if (returnTo) return <Navigate to={returnTo} replace />;
    return <Navigate to={user?.onboardingCompleted ? "/trips" : "/onboarding"} replace />;
  }

  return (
    <div className="alaia-entrance">
      <AlaiaParticles />
      <LoginForm />
    </div>
  );
}
