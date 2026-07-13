import { WizardShell } from "@/components/wizard/WizardShell";
import { lastDayHint } from "../../lib/duration";
import { DateTimeFields } from "./DateTimeFields";

interface Props {
  value: string;
  minDateTime: string;
  cityName: string | null;
  timeZone?: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
  initialOpen?: "date" | "time";
}

// Mismo día que la llegada está permitido (con hora posterior) — por eso el
// mínimo del input de fecha es el DÍA de la llegada, no el día siguiente. La
// combinación exacta (mismo día + hora anterior) se valida por comparación de
// strings, igual que siempre: el formato local es lexicográficamente ordenable.
export function DepartureStep({ value, minDateTime, cityName, timeZone, onChange, onBack, onNext, canAdvance, initialOpen }: Props) {
  const showError = value.length > 0 && minDateTime.length > 0 && value <= minDateTime;
  const minDate = minDateTime ? minDateTime.slice(0, 10) : undefined;
  const contextualHint = value ? lastDayHint(value) : null;

  return (
    <WizardShell question="¿Cuándo vuelven?" onBack={onBack} onNext={onNext} nextDisabled={!canAdvance}>
      <DateTimeFields
        idPrefix="wizard-departure"
        dateLabel="Fecha"
        timeLabel="Hora"
        value={value}
        onChange={onChange}
        min={minDate}
        cityName={cityName}
        timeZone={timeZone}
        initialOpen={initialOpen}
      />
      {contextualHint && <p className="datetime-contextual-hint">{contextualHint}</p>}
      {showError && <p className="trips-error">La vuelta debe ser después de la llegada.</p>}
    </WizardShell>
  );
}
