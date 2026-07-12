import { WizardShell } from "@/components/wizard/WizardShell";
import { DateTimeFields } from "./DateTimeFields";

interface Props {
  value: string;
  cityName: string | null;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

// Fecha y hora separadas (DateTimeFields, no un único datetime-local): se
// combinan en el mismo string local "YYYY-MM-DDTHH:mm" de siempre — nunca se
// interpreta como UTC.
export function ArrivalStep({ value, cityName, onChange, onBack, onNext, canAdvance }: Props) {
  return (
    <WizardShell question="¿Cuándo llegan?" onBack={onBack} onNext={onNext} nextDisabled={!canAdvance}>
      <DateTimeFields
        idPrefix="wizard-arrival"
        dateLabel="Fecha"
        timeLabel="Hora"
        value={value}
        onChange={onChange}
        autoFocus
      />
      {cityName && <p className="datetime-timezone-hint">Hora de {cityName}</p>}
    </WizardShell>
  );
}
