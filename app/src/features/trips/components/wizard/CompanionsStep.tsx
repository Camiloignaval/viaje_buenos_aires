import { OptionGrid } from "@/components/inputs/OptionGrid";
import { WizardShell } from "@/components/wizard/WizardShell";
import { TRAVEL_COMPANIONS_OPTIONS } from "../../data/travelOptions";

interface Props {
  value: string | null;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

export function CompanionsStep({ value, onChange, onBack, onNext, canAdvance }: Props) {
  return (
    <WizardShell
      question="¿Quiénes vivirán esta historia contigo?"
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!canAdvance}
    >
      <OptionGrid
        legend="Compañía de viaje"
        options={TRAVEL_COMPANIONS_OPTIONS}
        selected={value ? [value] : []}
        onChange={(next) => next[0] && onChange(next[0])}
      />
    </WizardShell>
  );
}
