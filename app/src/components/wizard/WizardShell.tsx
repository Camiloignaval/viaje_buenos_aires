import type { ReactNode } from "react";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";

interface Props {
  question: string;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  extraAction?: ReactNode;
  eyebrow?: string;
}

// Marco editorial de "una conversación por pantalla" — misma receta visual
// que Experience (fondo, halo, partículas, alaia-reveal escalonado, sin
// cards). Lo comparten el onboarding y el wizard de creación de viaje: es el
// primer encuentro con Alaia, nunca un formulario administrativo.
export function WizardShell({
  question,
  children,
  onBack,
  onNext,
  nextLabel = "Continuar →",
  nextDisabled = false,
  nextLoading = false,
  extraAction,
  eyebrow = "Alaia",
}: Props) {
  return (
    <div className="trips-page">
      <AlaiaParticles subtle />
      <div className="trips-page-content">
        <p className="alaia-eyebrow alaia-reveal alaia-reveal-1">{eyebrow}</p>
        <h1 className="trips-title alaia-reveal alaia-reveal-2">{question}</h1>
        <div className="trip-form alaia-reveal alaia-reveal-3">{children}</div>
        {extraAction}
        <div className="trip-form-actions">
          {onBack && (
            <button type="button" className="trip-form-cancel" onClick={onBack}>
              Volver
            </button>
          )}
          {onNext && (
            <button
              type="button"
              className="trip-form-submit"
              onClick={onNext}
              disabled={nextDisabled || nextLoading}
            >
              {nextLoading ? "Guardando…" : nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
