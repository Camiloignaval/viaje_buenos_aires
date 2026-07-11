import { Navigate } from "react-router-dom";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";
import { useSession } from "../hooks/useSession";
import { CheckingSession } from "../components/CheckingSession";
import { LoginForm } from "../components/LoginForm";

// El umbral de Alaia. Default export para lazy() en el router. Con sesión
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
    <div className="alaia-entrance">
      <AlaiaParticles />
      <LoginForm />
    </div>
  );
}
