// Travel Context: el snapshot contextual de un viaje resuelto por composición.
// Responde "dónde ocurre esta historia" (país, ciudad, huso horario) y "cómo
// se lee ese lugar" (moneda local, locale, idioma, sistema métrico, ciclo
// horario) para que cualquier pantalla obtenga contexto sin conocer su origen.
//
// Es el primer nivel del Context Engine no financiero. Resolución SÍNCRONA por
// composición sobre currencyCatalog + localeCatalog: no hace red ni toca
// almacenamiento, por eso no se registra como ContextModule async. Reutiliza el
// timezone ya resuelto aguas arriba (tz-lookup al crear el viaje): nunca lo
// recalcula, para no duplicar la fuente de verdad.

import { currencyForCountry, isSupportedCurrency } from "./currencyCatalog";
import {
  buildLocale,
  hourCycleForCountry,
  languageForCountry,
  metricSystemForCountry,
  normalizeCountryCode,
  type HourCycle,
  type MetricSystem,
} from "./localeCatalog";
import type { CurrencyCode } from "./types";

export type { DistanceUnit, HourCycle, MetricSystem, TemperatureUnit } from "./localeCatalog";

/** El snapshot que consume la UI. Todo campo desconocido es `null`, nunca inventado. */
export interface TravelContext {
  country: { code: string | null; name: string | null };
  city: string | null;
  /** Huso horario IANA del destino (ej. "America/Argentina/Buenos_Aires"). */
  timezone: string | null;
  /** Moneda local del destino (distinta de la moneda preferida del viajero). */
  currency: CurrencyCode | null;
  /** Locale BCP-47 para Intl (ej. "es-AR"). */
  locale: string | null;
  /** Idioma predominante del destino (ISO 639-1, ej. "es", "pt", "ja"). */
  language: string | null;
  metricSystem: MetricSystem;
  hourCycle: HourCycle;
}

export interface TravelContextInput {
  countryCode?: string | null;
  countryName?: string | null;
  city?: string | null;
  /** Timezone ya resuelto aguas arriba; el engine no lo calcula. */
  timezone?: string | null;
  /** Idioma predominante del destino declarado por el Story Package (override). */
  destinationLanguage?: string | null;
  /** Moneda local declarada explícitamente; si no, se deriva del país. */
  localCurrency?: string | null;
}

function cleanString(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resuelve el Travel Context desde datos ya disponibles (destino del viaje y,
 * opcionalmente, overrides del Story Package). Nunca lanza: ante datos
 * ausentes o corruptos devuelve `null` en cada campo y los defaults métricos.
 */
export function resolveTravelContext(input: TravelContextInput = {}): TravelContext {
  const code = normalizeCountryCode(input.countryCode);
  const language = cleanString(input.destinationLanguage)?.toLowerCase() ?? languageForCountry(code);

  const explicitCurrency = String(input.localCurrency ?? "").trim().toUpperCase();
  const currency = isSupportedCurrency(explicitCurrency)
    ? explicitCurrency
    : currencyForCountry(code);

  return {
    country: { code, name: cleanString(input.countryName) },
    city: cleanString(input.city),
    timezone: cleanString(input.timezone),
    currency,
    locale: buildLocale(language, code),
    language,
    metricSystem: metricSystemForCountry(code),
    hourCycle: hourCycleForCountry(code),
  };
}

/** Contexto vacío pero válido, para viajes sin destino estructurado (legacy). */
export const EMPTY_TRAVEL_CONTEXT: TravelContext = resolveTravelContext();
