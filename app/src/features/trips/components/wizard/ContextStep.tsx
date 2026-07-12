import { WizardShell } from "@/components/wizard/WizardShell";

const TRAVEL_CONTEXT_MAX_LENGTH = 500;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ContextStep({ value, onChange, onBack, onNext }: Props) {
  return (
    <WizardShell
      question="¿Hay algo que te gustaría que Alaia tuviera presente durante este viaje?"
      onBack={onBack}
      onNext={onNext}
    >
      <label htmlFor="wizard-context-input">Contexto (opcional)</label>
      <textarea
        id="wizard-context-input"
        autoFocus
        rows={4}
        maxLength={TRAVEL_CONTEXT_MAX_LENGTH}
        placeholder="Nos gusta caminar. Preferimos empezar tarde. Uno de nosotros es vegetariano…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="combobox-helper">
        {value.length}/{TRAVEL_CONTEXT_MAX_LENGTH}
      </p>
    </WizardShell>
  );
}
