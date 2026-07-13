import { formatHumanDateRange } from "./dateFormat";
import { describeNights } from "./duration";

const ISO_COUNTRY_CODE = /^[A-Z]{2}$/;

export interface CountryIdentity {
  mark: string;
  label: string;
}

/** Convierte ISO alpha-2 a sus dos regional indicators Unicode. */
export function countryCodeToFlagEmoji(countryCode: string | null | undefined): string | null {
  const code = String(countryCode ?? "").trim().toUpperCase();
  if (!ISO_COUNTRY_CODE.test(code)) return null;

  return [...code]
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

/** Identidad mínima y genérica para cualquier destino ISO, sin assets remotos. */
export function countryIdentity(countryCode: string, countryName: string): CountryIdentity | null {
  const mark = countryCodeToFlagEmoji(countryCode);
  if (!mark) return null;

  return {
    mark,
    label: countryName.trim() || "País del destino",
  };
}

/** Fechas de portada: humanas, breves y defensivas frente a viajes legacy. */
export function coverDateLine(startDateTime?: string, endDateTime?: string): string | null {
  if (!startDateTime || !endDateTime) return null;
  try {
    return `${formatHumanDateRange(startDateTime, endDateTime)} · ${describeNights(startDateTime, endDateTime)}`;
  } catch {
    return null;
  }
}
