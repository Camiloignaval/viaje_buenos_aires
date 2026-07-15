// Preparativos inteligentes: notas editoriales derivadas del Travel Context, no
// una checklist manual. Responden "¿qué necesito saber antes de vivir esta
// historia?" y se derivan del Context Engine + metadata del Story Package —
// nunca hardcodeadas. Cada nota existe SOLO cuando hay dato: sin contexto, sin
// nota (jamás se inventa). Sin contadores ni lenguaje de tareas.

import { resolveTravelContext, type TravelContext } from "@/features/context-engine/travelContext";
import type { StoryPackage } from "@/features/story/engine/types";

export type PreparationCategory =
  | "documentation"
  | "money"
  | "connectivity"
  | "electricity"
  | "climate"
  | "language"
  | "transport"
  | "recommendation";

export interface PreparationNote {
  id: string;
  category: PreparationCategory;
  text: string;
}

// Nombres en español para copy editorial. Presentación, no dominio.
const LANGUAGE_NAMES: Record<string, string> = {
  es: "español",
  pt: "portugués",
  ja: "japonés",
  en: "inglés",
};

const CURRENCY_NAMES: Record<string, string> = {
  ARS: "peso argentino",
  CLP: "peso chileno",
  BRL: "real brasileño",
  USD: "dólar estadounidense",
  EUR: "euro",
  JPY: "yen japonés",
  MXN: "peso mexicano",
  GBP: "libra esterlina",
  UYU: "peso uruguayo",
  PEN: "sol peruano",
  COP: "peso colombiano",
};

const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina",
  CL: "Chile",
  BR: "Brasil",
  US: "Estados Unidos",
  ES: "España",
  JP: "Japón",
  MX: "México",
  GB: "Reino Unido",
  UY: "Uruguay",
  PE: "Perú",
  CO: "Colombia",
};

export interface TravelPreparationsOptions {
  /** País de residencia del viajero (para saber si el viaje es internacional). */
  residenceCountryCode?: string | null;
}

/**
 * Deriva las notas de preparativos desde el Travel Context. Devuelve solo las
 * que tienen dato real; el orden es editorial (lo humano antes que lo logístico).
 */
export function resolveTravelPreparations(
  context: TravelContext,
  options: TravelPreparationsOptions = {},
): PreparationNote[] {
  const notes: PreparationNote[] = [];
  const countryName = context.country.code ? COUNTRY_NAMES[context.country.code] ?? context.country.name : context.country.name;

  // Idioma predominante del destino.
  if (context.language) {
    const languageName = LANGUAGE_NAMES[context.language] ?? context.language;
    notes.push({
      id: "prep-language",
      category: "language",
      text: countryName
        ? `En ${countryName} se habla ${languageName}.`
        : `El idioma del destino es el ${languageName}.`,
    });
  }

  // Moneda local — Alaia ya la conoce y la convierte; nunca cotizaciones.
  if (context.currency) {
    const currencyName = CURRENCY_NAMES[context.currency] ?? context.currency;
    notes.push({
      id: "prep-money",
      category: "money",
      text: `La moneda local es el ${currencyName} (${context.currency}). Alaia muestra los precios locales y su referencia para vos.`,
    });
  }

  // Documentación: solo si sabemos que el viaje cruza una frontera.
  const residence = String(options.residenceCountryCode ?? "").trim().toUpperCase();
  if (residence && context.country.code && residence !== context.country.code) {
    notes.push({
      id: "prep-documentation",
      category: "documentation",
      text: "Es un viaje a otro país: revisen que el documento con el que viajan esté vigente.",
    });
  }

  return notes;
}

/**
 * Resuelve el Travel Context de una historia desde su propia metadata declarada
 * (el destino pertenece a la historia). El timezone real del viaje vive en el
 * Trip y se usa para el estado temporal, no para estos preparativos.
 */
export function travelContextFromStory(story: StoryPackage): TravelContext {
  return resolveTravelContext({
    countryCode: story.metadata.destinationCountryCode,
    countryName: COUNTRY_NAMES[String(story.metadata.destinationCountryCode ?? "").toUpperCase()] ?? null,
    city: story.metadata.destination,
    destinationLanguage: story.metadata.destinationLanguage,
    localCurrency: story.budget?.currency,
  });
}
