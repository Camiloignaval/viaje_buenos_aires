import { WizardShell } from "@/components/wizard/WizardShell";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

export function TitleStep({ value, onChange, onBack, onNext, canAdvance }: Props) {
  return (
    <WizardShell question="¿Cómo se llama esta historia?" onBack={onBack} onNext={onNext} nextDisabled={!canAdvance}>
      <label htmlFor="wizard-title-input">Título</label>
      <input
        id="wizard-title-input"
        type="text"
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && canAdvance) {
            event.preventDefault();
            onNext();
          }
        }}
      />
    </WizardShell>
  );
}
