import { CityCombobox } from "../CityCombobox";
import { WizardShell } from "@/components/wizard/WizardShell";
import type { CityOption } from "../../types";

interface Props {
  countryCode: string | null;
  value: CityOption | null;
  onChange: (city: CityOption) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

export function CityStep({ countryCode, value, onChange, onBack, onNext, canAdvance }: Props) {
  return (
    <WizardShell question="¿En qué ciudad empieza?" onBack={onBack} onNext={onNext} nextDisabled={!canAdvance}>
      <CityCombobox label="Ciudad" countryCode={countryCode} value={value} onChange={onChange} autoFocus />
    </WizardShell>
  );
}
