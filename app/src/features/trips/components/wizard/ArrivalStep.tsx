import { WizardShell } from "@/components/wizard/WizardShell";
import { firstDayHint } from "../../lib/duration";
import { DateTimeFields } from "./DateTimeFields";

interface Props {
  value: string;
  cityName: string | null;
  timeZone?: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
  initialOpen?: "date" | "time";
}

// Fecha y hora separadas (DateTimeFields, no un único datetime-local): se
// combinan en el mismo string local "YYYY-MM-DDTHH:mm" de siempre — nunca se
// interpreta como UTC.
export function ArrivalStep({ value, cityName, timeZone, onChange, onBack, onNext, canAdvance, initialOpen }: Props) {
  const contextualHint = value ? firstDayHint(value) : null;
  return (
    <WizardShell question="¿Cuándo llegan?" onBack={onBack} onNext={onNext} nextDisabled={!canAdvance}>
      <DateTimeFields
        idPrefix="wizard-arrival"
        dateLabel="Fecha"
        timeLabel="Hora"
        value={value}
        onChange={onChange}
        cityName={cityName}
        timeZone={timeZone}
        initialOpen={initialOpen}
      />
      {contextualHint && <p className="datetime-contextual-hint">{contextualHint}</p>}
    </WizardShell>
  );
}
