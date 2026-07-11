import { WizardShell } from "@/components/wizard/WizardShell";
import { DateTimeFields } from "./DateTimeFields";

interface Props {
  value: string;
  minDateTime: string;
  cityName: string | null;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
}

// Mismo día que la llegada está permitido (con hora posterior) — por eso el
// mínimo del input de fecha es el DÍA de la llegada, no el día siguiente. La
// combinación exacta (mismo día + hora anterior) se valida por comparación de
// strings, igual que siempre: el formato local es lexicográficamente ordenable.
export function DepartureStep({ value, minDateTime, cityName, onChange, onBack, onNext, canAdvance }: Props) {
  const showError = value.length > 0 && minDateTime.length > 0 && value <= minDateTime;
  const minDate = minDateTime ? minDateTime.slice(0, 10) : undefined;

  return (
    <WizardShell question="¿Cuándo vuelven?" onBack={onBack} onNext={onNext} nextDisabled={!canAdvance}>
      <DateTimeFields
        idPrefix="wizard-departure"
        dateLabel="Fecha"
        timeLabel="Hora"
        value={value}
        onChange={onChange}
        min={minDate}
        autoFocus
      />
      {cityName && <p className="datetime-timezone-hint">Hora de {cityName}</p>}
      {showError && <p className="trips-error">La vuelta debe ser después de la llegada.</p>}
    </WizardShell>
  );
}
