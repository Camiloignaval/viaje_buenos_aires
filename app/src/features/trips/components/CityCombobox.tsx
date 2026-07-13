import { useEffect, useState } from "react";
import { ComboboxField } from "@/components/inputs/ComboboxField";
import { useDebouncedValue } from "@/components/inputs/useDebouncedValue";
import { useCitySearch } from "../hooks/useCitySearch";
import type { CityOption } from "../types";

interface Props {
  label: string;
  countryCode: string | null;
  value: CityOption | null;
  onChange: (city: CityOption | null) => void;
  autoFocus?: boolean;
}

// Búsqueda restringida al país elegido, debounced (300ms) y cacheada por
// TanStack Query — cancela por AbortSignal la búsqueda anterior al cambiar la
// query/país y cachea cada combinación en una queryKey distinta.
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
  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 2;
  const isSettling = canSearch && trimmedQuery !== debouncedQuery.trim();
  const emptyMessage =
    trimmedQuery.length === 0
      ? "Escribe una ciudad."
      : trimmedQuery.length === 1
        ? "Escribe al menos 2 letras."
        : "No encontramos una ciudad con ese nombre.";

  return (
    <ComboboxField<CityOption>
      label={label}
      placeholder={countryCode ? "Busca tu ciudad…" : "Elige primero un país"}
      inputValue={query}
      onInputValueChange={(nextQuery) => {
        setQuery(nextQuery);
        if (value && nextQuery.trim() !== value.name) onChange(null);
      }}
      options={options}
      isLoading={canSearch && (isSettling || search.isFetching)}
      errorMessage={search.isError ? "No pudimos buscar ahora. Inténtalo nuevamente." : undefined}
      emptyMessage={emptyMessage}
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
