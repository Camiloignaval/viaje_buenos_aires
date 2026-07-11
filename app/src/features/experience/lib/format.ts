// Helpers de presentación portados VERBATIM de experience/render.js — la copia,
// el tono y los marcadores del índice son parte de la identidad de Aurora.

import { ChapterStatus } from "@/features/story/engine/types";
import type { ChapterStatusValue } from "@/features/story/engine/types";

export type Theme = "dark" | "light";

export const DAY_IN_MS = 24 * 60 * 60 * 1000;

// El índice nunca dice "todavía no"/"bloqueado" (copy negativo, E-6): un capítulo
// futuro solo muestra su fecha y una frase breve propia.
export const STATUS_LABEL: Partial<Record<ChapterStatusValue, string>> = {
  [ChapterStatus.AVAILABLE]: "Hoy",
  [ChapterStatus.STARTED]: "Hoy",
  [ChapterStatus.COMPLETED]: "Vivido",
};

export const CHAPTER_INDEX_MARKER: Record<ChapterStatusValue, string> = {
  [ChapterStatus.AVAILABLE]: "•",
  [ChapterStatus.STARTED]: "•",
  [ChapterStatus.COMPLETED]: "✓",
  [ChapterStatus.LOCKED]: "—",
};

// Una frase breve y distinta por capítulo futuro — nunca la misma promesa repetida.
export const CHAPTER_TEASERS = [
  "Todo empieza acá.",
  "La ciudad se empieza a abrir.",
  "Buenos Aires ya se siente distinta.",
  "Un último regalo antes de volver.",
];

export function teaserForChapter(order: number): string {
  return CHAPTER_TEASERS[order - 1] ?? "Un nuevo capítulo se acerca.";
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "10 de julio" — sin año ni hora, la fecha como una promesa, no un dato técnico. */
export function formatChapterDate(date: Date): string {
  return `${date.getUTCDate()} de ${MONTHS_ES[date.getUTCMonth()]}`;
}

export function normalizeTheme(theme: unknown): Theme {
  return theme === "light" ? "light" : "dark";
}

/** Numeración de capítulo como en el índice de un libro — nunca un badge. */
export function toRoman(number: number): string {
  const table: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = number;
  let roman = "";
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      roman += symbol;
      remaining -= value;
    }
  }
  return roman || String(number);
}
