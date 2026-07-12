import { WizardShell } from "@/components/wizard/WizardShell";
import { MAX_EXPECTED_TRAVELERS } from "../../data/travelOptions";

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

export function TravelersStep({ value, onChange, onBack, onNext, canAdvance }: Props) {
  return (
    <WizardShell
      question="¿Cuántas personas compartirán esta historia?"
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!canAdvance}
    >
      <label htmlFor="wizard-travelers-input">Personas</label>
      <input
        id="wizard-travelers-input"
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_EXPECTED_TRAVELERS}
        autoFocus
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
      />
    </WizardShell>
  );
}
