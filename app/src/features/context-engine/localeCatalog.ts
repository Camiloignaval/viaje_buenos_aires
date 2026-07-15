// Catálogo de contexto locale por país: idioma predominante del destino,
// sistema métrico y ciclo horario. Espejo conceptual de currencyCatalog —
// una fila por país, extensible sin tocar el resto del Context Engine —,
// aplicado al contexto no monetario. No conoce UI, red ni almacenamiento.

export type DistanceUnit = "metric" | "imperial";
export type TemperatureUnit = "celsius" | "fahrenheit";

export interface MetricSystem {
  /** Distancias: kilómetros (metric) o millas (imperial). */
  distance: DistanceUnit;
  /** Temperatura: Celsius o Fahrenheit. */
  temperature: TemperatureUnit;
}

/** Ciclo horario predominante: 24h (h23) o 12h con AM/PM (h12). */
export type HourCycle = "h23" | "h12";

/** Defaults conservadores para un país desconocido: métrico, Celsius, 24h. */
export const DEFAULT_METRIC_SYSTEM: MetricSystem = {
  distance: "metric",
  temperature: "celsius",
};
export const DEFAULT_HOUR_CYCLE: HourCycle = "h23";

interface CountryLocaleEntry {
  /** Idioma predominante del destino (ISO 639-1). */
  language: string;
  metricSystem: MetricSystem;
  hourCycle: HourCycle;
}

// Una fila por país (ISO 3166-1 alpha-2). Alineado con el alcance de
// currencyCatalog; agregar un país acá no afecta a los módulos existentes.
// Solo EE.UU. es imperial+Fahrenheit; Reino Unido conserva millas pero mide
// en Celsius. El resto usa el sistema métrico y grados Celsius.
const COUNTRY_LOCALE_MAP: Record<string, CountryLocaleEntry> = {
  AR: { language: "es", metricSystem: DEFAULT_METRIC_SYSTEM, hourCycle: "h23" },
  CL: { language: "es", metricSystem: DEFAULT_METRIC_SYSTEM, hourCycle: "h23" },
  UY: { language: "es", metricSystem: DEFAULT_METRIC_SYSTEM, hourCycle: "h23" },
  PE: { language: "es", metricSystem: DEFAULT_METRIC_SYSTEM, hourCycle: "h23" },
  CO: { language: "es", metricSystem: DEFAULT_METRIC_SYSTEM, hourCycle: "h23" },
  MX: { language: "es", metricSystem: DEFAULT_METRIC_SYSTEM, hourCycle: "h12" },
  ES: { language: "es", metricSystem: DEFAULT_METRIC_SYSTEM, hourCycle: "h23" },
  BR: { language: "pt", metricSystem: DEFAULT_METRIC_SYSTEM, hourCycle: "h23" },
  JP: { language: "ja", metricSystem: DEFAULT_METRIC_SYSTEM, hourCycle: "h23" },
  US: { language: "en", metricSystem: { distance: "imperial", temperature: "fahrenheit" }, hourCycle: "h12" },
  GB: { language: "en", metricSystem: { distance: "imperial", temperature: "celsius" }, hourCycle: "h12" },
};

/** Normaliza un código de país a ISO 3166-1 alpha-2 en mayúsculas, o `null`. */
export function normalizeCountryCode(countryCode: string | null | undefined): string | null {
  const normalized = String(countryCode ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

/** Idioma predominante del destino para un país, o `null` si no se conoce. */
export function languageForCountry(countryCode: string | null | undefined): string | null {
  const code = normalizeCountryCode(countryCode);
  return code ? (COUNTRY_LOCALE_MAP[code]?.language ?? null) : null;
}

/** Sistema métrico del país; defaults métrico+Celsius si no se conoce. */
export function metricSystemForCountry(countryCode: string | null | undefined): MetricSystem {
  const code = normalizeCountryCode(countryCode);
  return code ? (COUNTRY_LOCALE_MAP[code]?.metricSystem ?? DEFAULT_METRIC_SYSTEM) : DEFAULT_METRIC_SYSTEM;
}

/** Ciclo horario del país; default 24h si no se conoce. */
export function hourCycleForCountry(countryCode: string | null | undefined): HourCycle {
  const code = normalizeCountryCode(countryCode);
  return code ? (COUNTRY_LOCALE_MAP[code]?.hourCycle ?? DEFAULT_HOUR_CYCLE) : DEFAULT_HOUR_CYCLE;
}

/**
 * Construye un locale BCP-47 a partir de idioma y país: `es` + `AR` → `es-AR`.
 * Si falta el país devuelve solo el idioma; si falta el idioma, `null`.
 */
export function buildLocale(
  language: string | null | undefined,
  countryCode: string | null | undefined,
): string | null {
  const lang = String(language ?? "").trim().toLowerCase();
  if (!lang) return null;
  const code = normalizeCountryCode(countryCode);
  return code ? `${lang}-${code}` : lang;
}
