import { OptionGrid } from "@/components/inputs/OptionGrid";
import { WizardShell } from "@/components/wizard/WizardShell";
import { TRAVEL_REASON_OPTIONS } from "../../data/travelOptions";

interface Props {
  value: string | null;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

export function ReasonStep({ value, onChange, onBack, onNext, canAdvance }: Props) {
  return (
    <WizardShell question="¿Qué los trae hasta aquí?" onBack={onBack} onNext={onNext} nextDisabled={!canAdvance}>
      <OptionGrid
        legend="Motivo del viaje"
        options={TRAVEL_REASON_OPTIONS}
        selected={value ? [value] : []}
        onChange={(next) => next[0] && onChange(next[0])}
      />
    </WizardShell>
  );
}
