import { AccommodationCombobox } from "../AccommodationCombobox";
import { WizardShell } from "@/components/wizard/WizardShell";
import type { TripAccommodation } from "../../types";

interface Props {
  countryCode: string | null;
  cityName: string | null;
  value: TripAccommodation | null;
  onChange: (accommodation: TripAccommodation | null) => void;
  onBack: () => void;
  onNext: () => void;
}

// Campo opcional (spec 5): "Omitir por ahora" guarda type:"unknown" y avanza
// igual que si hubiera elegido un alojamiento real.
export function AccommodationStep({ countryCode, cityName, value, onChange, onBack, onNext }: Props) {
  return (
    <WizardShell
      question="¿Desde dónde empieza cada día?"
      onBack={onBack}
      onNext={onNext}
      extraAction={
        <button type="button" className="trip-form-cancel" onClick={() => onChange({ type: "unknown" })}>
          Omitir por ahora
        </button>
      }
    >
      <p className="combobox-helper">Busca tu hotel, alojamiento o barrio.</p>
      <AccommodationCombobox
        label="Alojamiento"
        countryCode={countryCode}
        cityName={cityName}
        initialQuery={value?.name ?? ""}
        onChange={(place) =>
          onChange({
            type: place.type,
            name: place.name,
            address: place.address,
            ...(place.neighborhood ? { neighborhood: place.neighborhood } : {}),
            latitude: place.latitude,
            longitude: place.longitude,
            placeId: place.placeId,
          })
        }
        autoFocus
      />
    </WizardShell>
  );
}
