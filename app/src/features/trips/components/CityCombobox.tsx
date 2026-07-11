import { useEffect, useState } from "react";
import { ComboboxField } from "@/components/inputs/ComboboxField";
import { useDebouncedValue } from "@/components/inputs/useDebouncedValue";
import { useCitySearch } from "../hooks/useCitySearch";
import type { CityOption } from "../types";

interface Props {
  label: string;
  countryCode: string | null;
  value: CityOption | null;
  onChange: (city: CityOption) => void;
  autoFocus?: boolean;
}

// Búsqueda restringida al país elegido, debounced (300ms) y cacheada por
// TanStack Query — cancela la búsqueda anterior al cambiar la query/país
// porque cada combinación es una queryKey distinta.
export function CityCombobox({ label, countryCode, value, onChange, autoFocus }: Props) {
  const [query, setQuery] = useState(value?.name ?? "");
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value?.id]);

  const search = useCitySearch(countryCode, debouncedQuery);
  const options = search.data ?? [];
  // Mientras el debounce todavía no "asentó" la búsqueda, options/isFetching
  // reflejan la query anterior — sin este flag se llega a mostrar "Sin
  // resultados" de una búsqueda vieja mientras el usuario todavía está
  // tipeando la nueva.
  const isSettling = query.trim() !== debouncedQuery.trim();

  return (
    <ComboboxField<CityOption>
      label={label}
      placeholder={countryCode ? "Buscá tu ciudad…" : "Elegí primero un país"}
      inputValue={query}
      onInputValueChange={setQuery}
      options={options}
      isLoading={isSettling || search.isFetching}
      errorMessage={search.isError ? "No pudimos buscar ciudades. Probá de nuevo." : undefined}
      emptyMessage={
        query.trim().length < 2 ? "Escribí al menos 2 letras." : "No encontramos una ciudad con ese nombre."
      }
      disabled={!countryCode}
      autoFocus={autoFocus}
      getOptionKey={(city) => city.id}
      getOptionLabel={(city) => city.name}
      renderOption={(city) => `${city.name}${city.adminName ? `, ${city.adminName}` : ""}`}
      onSelect={(city) => {
        setQuery(city.name);
        onChange(city);
      }}
    />
  );
}
