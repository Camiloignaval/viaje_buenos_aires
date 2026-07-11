import { Navigate } from "react-router-dom";
import { AuroraParticles } from "@/components/animations/AuroraParticles";
import { useSession } from "../hooks/useSession";
import { CheckingSession } from "../components/CheckingSession";
import { LoginForm } from "../components/LoginForm";

// El umbral de Aurora. Default export para lazy() en el router. Con sesión
// autenticada redirige a /trips; en cualquier otro caso (unauthenticated o
// unavailable) muestra el formulario — nunca hay redirect loop porque sólo se
// redirige en estados definitivos.
export default function LoginPage() {
  const { status, user } = useSession();
  if (status === "checking") return <CheckingSession />;
  if (status === "authenticated") {
    return <Navigate to={user?.onboardingCompleted ? "/trips" : "/onboarding"} replace />;
  }

  return (
    <div className="aurora-entrance">
      <AuroraParticles />
      <LoginForm />
    </div>
  );
}
