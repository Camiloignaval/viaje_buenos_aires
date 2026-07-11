import { CountryCombobox, type CountryOption } from "@/components/inputs/CountryCombobox";
import { WizardShell } from "@/components/wizard/WizardShell";

interface Props {
  value: CountryOption | null;
  onChange: (country: CountryOption) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

export function CountryStep({ value, onChange, onBack, onNext, canAdvance }: Props) {
  return (
    <WizardShell question="¿A qué país van?" onBack={onBack} onNext={onNext} nextDisabled={!canAdvance}>
      <CountryCombobox label="País" value={value} onChange={onChange} autoFocus />
    </WizardShell>
  );
}
