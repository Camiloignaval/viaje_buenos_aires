import { OptionGrid } from "@/components/inputs/OptionGrid";
import { WizardShell } from "@/components/wizard/WizardShell";
import { TRAVEL_BUDGET_STYLE_OPTIONS } from "../../data/travelOptions";

interface Props {
  value: string | null;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

// La filosofía del viaje primero — nunca empezar preguntando dinero.
export function BudgetStyleStep({ value, onChange, onBack, onNext, canAdvance }: Props) {
  return (
    <WizardShell
      question="¿Cómo les gustaría vivir este viaje?"
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!canAdvance}
    >
      <OptionGrid
        legend="Forma de vivir el viaje"
        options={TRAVEL_BUDGET_STYLE_OPTIONS}
        selected={value ? [value] : []}
        onChange={(next) => next[0] && onChange(next[0])}
      />
    </WizardShell>
  );
}
