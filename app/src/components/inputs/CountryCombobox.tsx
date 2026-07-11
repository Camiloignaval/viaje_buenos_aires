import { useEffect, useMemo, useState } from "react";
import countries from "@/data/countries.json";
import { normalizeSearchText, scoreTextMatch } from "@/lib/searchNormalize";
import { ComboboxField } from "./ComboboxField";

export interface CountryOption {
  code: string;
  name: string;
}

interface Props {
  label: string;
  placeholder?: string;
  value: CountryOption | null;
  onChange: (country: CountryOption) => void;
  autoFocus?: boolean;
}

// Catálogo JSON local (sin red): filtra en el cliente por nombre o código ISO.
export function CountryCombobox({ label, placeholder = "Buscá un país…", value, onChange, autoFocus }: Props) {
  const [query, setQuery] = useState(value?.name ?? "");

  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value?.code]);

  const options = useMemo(() => {
    const normalized = normalizeSearchText(query);
    if (!normalized) return countries.slice(0, 8);
    return countries
      .filter(
        (country) => scoreTextMatch(country.name, normalized) > 0 || country.code.toLowerCase() === normalized,
      )
      .sort((a, b) => scoreTextMatch(b.name, normalized) - scoreTextMatch(a.name, normalized))
      .slice(0, 8);
  }, [query]);

  return (
    <ComboboxField<CountryOption>
      label={label}
      placeholder={placeholder}
      inputValue={query}
      onInputValueChange={setQuery}
      options={options}
      emptyMessage="No encontramos ese país."
      autoFocus={autoFocus}
      getOptionKey={(country) => country.code}
      getOptionLabel={(country) => country.name}
      onSelect={(country) => {
        setQuery(country.name);
        onChange(country);
      }}
    />
  );
}
