import { useEffect, useState } from "react";

// Debounce genérico para inputs de búsqueda (ciudad, alojamiento): evita
// disparar una query por cada tecla.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
