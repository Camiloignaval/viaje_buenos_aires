import { useState } from "react";
import { ComboboxField } from "@/components/inputs/ComboboxField";
import { useDebouncedValue } from "@/components/inputs/useDebouncedValue";
import { useAccommodationSearch } from "../hooks/useAccommodationSearch";
import type { PlaceOption } from "../types";

interface Props {
  label: string;
  countryCode: string | null;
  cityName: string | null;
  /** Texto a mostrar al montar (p. ej. al volver a este paso ya con algo elegido). */
  initialQuery?: string;
  onChange: (place: PlaceOption) => void;
  autoFocus?: boolean;
}

export function AccommodationCombobox({
  label,
  countryCode,
  cityName,
  initialQuery = "",
  onChange,
  autoFocus,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, 300);

  const search = useAccommodationSearch(countryCode, cityName, debouncedQuery);
  const options = search.data ?? [];

  return (
    <ComboboxField<PlaceOption>
      label={label}
      placeholder="Busca tu hotel, alojamiento o barrio…"
      inputValue={query}
      onInputValueChange={setQuery}
      options={options}
      isLoading={search.isFetching}
      errorMessage={search.isError ? "No pudimos buscar. Prueba de nuevo." : undefined}
      emptyMessage={query.trim().length < 2 ? "Escribe al menos 2 letras." : "Sin resultados."}
      autoFocus={autoFocus}
      getOptionKey={(place) => place.id}
      getOptionLabel={(place) => place.name}
      renderOption={(place) => `${place.name} — ${place.address}`}
      onSelect={(place) => {
        setQuery(place.name);
        onChange(place);
      }}
    />
  );
}
