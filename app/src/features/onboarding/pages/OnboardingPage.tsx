import { useState } from "react";
import { Navigate } from "react-router-dom";
import { WizardShell } from "@/components/wizard/WizardShell";
import { CountryCombobox, type CountryOption } from "@/components/inputs/CountryCombobox";
import { useSession } from "@/features/auth/hooks/useSession";
import { CheckingSession } from "@/features/auth/components/CheckingSession";
import { useCompleteOnboarding } from "../hooks/useCompleteOnboarding";
import { onboardingSchema } from "../validation/onboardingSchema";

type OnboardingStep = "name" | "country";

// El primer encuentro de Alaia con una persona: una pregunta por pantalla,
// nunca un formulario de dos campos. El email ya vive en la sesión, no se
// vuelve a pedir. Default export para lazy() en el router.
export default function OnboardingPage() {
  const { status, user } = useSession();
  const complete = useCompleteOnboarding();
  const [step, setStep] = useState<OnboardingStep>("name");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState<CountryOption | null>(null);

  if (status === "checking") return <CheckingSession />;
  if (user?.onboardingCompleted) return <Navigate to="/trips" replace />;

  const canAdvanceName = displayName.trim().length > 0;
  const canSubmit = country !== null;

  async function handleSubmit() {
    const result = onboardingSchema.safeParse({
      displayName,
      residenceCountryCode: country?.code ?? "",
    });
    if (!result.success) return; // no debería pasar: ambos pasos ya validaron antes de llegar acá.

    try {
      await complete.mutateAsync(result.data);
    } catch {
      // complete.isError alimenta el mensaje de abajo.
    }
  }

  if (step === "name") {
    return (
      <WizardShell
        question="¿Cómo quieres que te llamemos?"
        onNext={() => setStep("country")}
        nextDisabled={!canAdvanceName}
      >
        <label htmlFor="onboarding-name-input">Nombre</label>
        <input
          id="onboarding-name-input"
          type="text"
          autoFocus
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canAdvanceName) {
              event.preventDefault();
              setStep("country");
            }
          }}
        />
      </WizardShell>
    );
  }

  return (
    <WizardShell
      question="¿Desde dónde viajás?"
      onBack={() => setStep("name")}
      onNext={handleSubmit}
      nextLabel="Continuar →"
      nextDisabled={!canSubmit}
      nextLoading={complete.isPending}
    >
      <CountryCombobox label="País de residencia" value={country} onChange={setCountry} autoFocus />
      {complete.isError && (
        <p className="trips-error">
          {complete.error instanceof Error ? complete.error.message : "No pudimos guardar tus datos."}
        </p>
      )}
    </WizardShell>
  );
}
