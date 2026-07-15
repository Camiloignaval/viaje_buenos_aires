// Información contextual: pequeñas notas editoriales derivadas de la metadata de
// inteligencia del Story Package (Fase 3). Secundarias por diseño — nunca
// compiten con la narrativa, las fotos ni los recuerdos. Solo existen cuando hay
// dato curado; jamás se inventan. Sin cards, sin badges, sin listas
// interminables: texto breve.

import type { StoryIntelligence } from "@/features/story/engine/intelligence";

export interface ContextualLine {
  id: string;
  text: string;
}

function linesFrom(intel: StoryIntelligence): ContextualLine[] {
  const lines: ContextualLine[] = [];

  if (intel.reservationRecommended === true) lines.push({ id: "reservation", text: "Conviene reservar." });
  if (intel.cashPreferred === true) lines.push({ id: "cash", text: "Mejor llevar algo de efectivo." });
  if (intel.bestMoment) lines.push({ id: "best-moment", text: `El mejor momento: ${intel.bestMoment}.` });
  if (intel.durationEstimate) lines.push({ id: "duration", text: `Tiempo estimado: ${intel.durationEstimate}.` });
  if (intel.walkingDifficulty === "demanding") lines.push({ id: "walking", text: "Se camina bastante." });
  if (intel.rainFriendly === true) lines.push({ id: "rain", text: "Se disfruta igual si llueve." });
  if (intel.familyFriendly === true) lines.push({ id: "family", text: "Lindo para ir en familia." });
  if (intel.photoMoment === true) lines.push({ id: "photo", text: "Un buen momento para una foto." });
  if (intel.crowdLevel === "busy") lines.push({ id: "crowd", text: "Suele llenarse." });
  if (intel.crowdLevel === "quiet") lines.push({ id: "crowd", text: "Suele estar tranquilo." });

  return lines;
}

/**
 * Reúne las líneas contextuales de una actividad y de su lugar asociado, sin
 * duplicar por tipo (id). Devuelve `[]` cuando no hay metadata: sin dato, sin línea.
 */
export function resolveContextualLines(
  ...sources: Array<StoryIntelligence | undefined | null>
): ContextualLine[] {
  const seen = new Set<string>();
  const out: ContextualLine[] = [];
  for (const source of sources) {
    if (!source) continue;
    for (const line of linesFrom(source)) {
      if (seen.has(line.id)) continue;
      seen.add(line.id);
      out.push(line);
    }
  }
  return out;
}
