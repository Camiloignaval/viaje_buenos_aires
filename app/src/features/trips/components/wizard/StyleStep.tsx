import { OptionGrid } from "@/components/inputs/OptionGrid";
import { WizardShell } from "@/components/wizard/WizardShell";
import { MAX_TRAVEL_STYLES, TRAVEL_STYLE_OPTIONS } from "../../data/travelOptions";

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

export function StyleStep({ value, onChange, onBack, onNext, canAdvance }: Props) {
  return (
    <WizardShell question="¿Cómo imaginan este viaje?" onBack={onBack} onNext={onNext} nextDisabled={!canAdvance}>
      <p className="combobox-helper">Puedes elegir hasta dos.</p>
      <OptionGrid
        legend="Estilo del viaje"
        options={TRAVEL_STYLE_OPTIONS}
        selected={value}
        onChange={onChange}
        multiple
        maxSelected={MAX_TRAVEL_STYLES}
      />
    </WizardShell>
  );
}
