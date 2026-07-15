// Story Package Health Check Engine.
//
// Inspecciona la calidad técnica de un Story Package y produce un reporte
// estructurado (errores, advertencias, sugerencias) + un Quality Score interno.
// NUNCA modifica contenido, nunca corrige, nunca inventa datos: solo inspecciona,
// clasifica y —cuando existe una corrección objetiva— la propone.
//
// Agnóstico de framework: corre en tests, scripts y CI. La única dependencia
// externa opcional es `assetExists` (resolver de media inyectado), para no
// acoplar el motor al sistema de archivos.
//
// Extensible: `runHealthCheck` acepta checkers adicionales; futuras validaciones
// (metadata IA incompleta, emociones faltantes) se suman sin tocar el núcleo.

import { loadStoryPackage, StoryPackageValidationError } from "@/features/story/engine/storyPackage";
import { calendarDateFrom, calendarOrdinal } from "@/features/story/engine/storyProgress";
import type {
  Activity,
  Place,
  StoryPackage,
} from "@/features/story/engine/types";
import {
  INTELLIGENCE_BOOLEAN_FIELDS,
  INTELLIGENCE_ENUM_FIELDS,
  INTELLIGENCE_KNOWN_FIELDS,
  INTELLIGENCE_TEXT_FIELDS,
  type StoryIntelligence,
} from "@/features/story/engine/intelligence";
import { isSupportedCurrency } from "@/features/context-engine/currencyCatalog";
import type {
  HealthCategory,
  HealthCheckContext,
  HealthFinding,
  HealthReport,
  QualityScore,
  Severity,
} from "./types";
import { checkLivingContext } from "./livingContextCheck";

export type StoryHealthChecker = (
  pkg: StoryPackage,
  ctx: HealthCheckContext,
) => HealthFinding[];

const ALL_CATEGORIES: readonly HealthCategory[] = [
  "metadata",
  "structure",
  "timeline",
  "destination",
  "media",
  "monetary",
  "experience",
  "references",
  "accessibility",
  "context",
  "intelligence",
];

// Monedas que pueden aparecer como texto libre en el copy editorial.
const CURRENCY_TOKEN_PATTERN = /\b(ARS|CLP|USD|EUR|BRL|MXN|GBP|UYU|PEN|COP|JPY)\b/g;
// Palabras que encuadran un monto extranjero como referencia/conversión (permitido).
const REFERENCE_FRAMING_PATTERN = /referencia|cambio|equivale|aproximad|convers|al cambio/i;

function finding(
  category: HealthCategory,
  severity: Severity,
  code: string,
  message: string,
  extra?: { path?: string; suggestion?: string },
): HealthFinding {
  return { category, severity, code, message, ...extra };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isValidCalendarDate(value: unknown): boolean {
  if (!isNonEmptyString(value)) return false;
  try {
    calendarDateFrom(value);
    return true;
  } catch {
    return false;
  }
}

// --- Checkers ---------------------------------------------------------------

function checkMetadata(pkg: StoryPackage): HealthFinding[] {
  const out: HealthFinding[] = [];
  const meta = pkg.metadata;

  if (!isNonEmptyString(pkg.storyId)) {
    out.push(finding("metadata", "critical", "metadata.missing-story-id", "El paquete no declara un storyId."));
  }
  if (!isNonEmptyString(pkg.schemaVersion)) {
    out.push(finding("metadata", "warning", "metadata.missing-schema-version", "Falta schemaVersion; dificulta migraciones futuras."));
  }
  if (!isNonEmptyString(meta?.destination)) {
    out.push(finding("metadata", "critical", "metadata.missing-destination", "metadata.destination está vacío."));
  }
  if (!isNonEmptyString(meta?.title)) {
    out.push(finding("metadata", "critical", "metadata.missing-title", "metadata.title está vacío."));
  }
  if (!isNonEmptyString(meta?.language)) {
    out.push(finding("metadata", "warning", "metadata.missing-language", "metadata.language está vacío.", {
      suggestion: 'Declarar el idioma del contenido, ej. "es".',
    }));
  }

  const start = meta?.travelDates?.start;
  const end = meta?.travelDates?.end;
  if (!isValidCalendarDate(start) || !isValidCalendarDate(end)) {
    out.push(finding("metadata", "critical", "metadata.invalid-travel-dates", "metadata.travelDates.start/end no son fechas calendario válidas (YYYY-MM-DD)."));
  } else if (calendarOrdinal(calendarDateFrom(start as string)) > calendarOrdinal(calendarDateFrom(end as string))) {
    out.push(finding("metadata", "critical", "metadata.reversed-travel-dates", `travelDates.start (${start}) es posterior a end (${end}).`));
  }

  return out;
}

function checkStructure(pkg: StoryPackage): HealthFinding[] {
  const out: HealthFinding[] = [];
  const chapters = pkg.chapters ?? [];

  const seenIds = new Set<string>();
  const seenOrders = new Set<number>();
  chapters.forEach((chapter, index) => {
    const path = `chapters[${index}]`;
    if (!isNonEmptyString(chapter.id)) {
      out.push(finding("structure", "critical", "structure.chapter-missing-id", "Capítulo sin id.", { path }));
    } else if (seenIds.has(chapter.id)) {
      out.push(finding("structure", "critical", "structure.duplicate-chapter-id", `id de capítulo duplicado: ${chapter.id}.`, { path }));
    } else {
      seenIds.add(chapter.id);
    }

    if (typeof chapter.order !== "number") {
      out.push(finding("structure", "warning", "structure.chapter-missing-order", "Capítulo sin order numérico.", { path }));
    } else if (seenOrders.has(chapter.order)) {
      out.push(finding("structure", "warning", "structure.duplicate-chapter-order", `order de capítulo duplicado: ${chapter.order}.`, { path }));
    } else {
      seenOrders.add(chapter.order);
    }

    if (!isNonEmptyString(chapter.title)) {
      out.push(finding("structure", "warning", "structure.chapter-missing-title", "Capítulo sin título.", { path }));
    }
  });

  // Los orders deberían formar una secuencia 1..n sin huecos.
  const orders = [...seenOrders].sort((a, b) => a - b);
  const expected = orders.length > 0 && orders[0] === 1 && orders[orders.length - 1] === orders.length;
  if (orders.length > 0 && !expected) {
    out.push(finding("structure", "info", "structure.non-sequential-orders", `Los order de capítulos no forman una secuencia 1..${orders.length}: [${orders.join(", ")}].`));
  }

  const special = pkg.specialChapter;
  if (special && isNonEmptyString(special.id) && seenIds.has(special.id)) {
    out.push(finding("structure", "critical", "structure.special-chapter-id-collision", `specialChapter.id (${special.id}) colisiona con un capítulo regular.`, { path: "specialChapter" }));
  }

  return out;
}

function checkTimeline(pkg: StoryPackage): HealthFinding[] {
  const out: HealthFinding[] = [];
  const chapters = [...(pkg.chapters ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const rangeStart = isValidCalendarDate(pkg.metadata?.travelDates?.start)
    ? calendarOrdinal(calendarDateFrom(pkg.metadata.travelDates.start))
    : null;
  const rangeEnd = isValidCalendarDate(pkg.metadata?.travelDates?.end)
    ? calendarOrdinal(calendarDateFrom(pkg.metadata.travelDates.end))
    : null;

  let previousOrdinal: number | null = null;
  chapters.forEach((chapter) => {
    if (chapter.date === undefined) return;
    const path = `chapters(order=${chapter.order}).date`;
    if (!isValidCalendarDate(chapter.date)) {
      out.push(finding("timeline", "warning", "timeline.invalid-chapter-date", `Fecha de capítulo inválida: ${String(chapter.date)}.`, { path }));
      return;
    }
    const ordinal = calendarOrdinal(calendarDateFrom(chapter.date));
    if (previousOrdinal !== null && ordinal < previousOrdinal) {
      out.push(finding("timeline", "warning", "timeline.out-of-order-date", `La fecha del capítulo ${chapter.id} rompe el orden cronológico.`, { path }));
    }
    if ((rangeStart !== null && ordinal < rangeStart) || (rangeEnd !== null && ordinal > rangeEnd)) {
      out.push(finding("timeline", "warning", "timeline.date-outside-travel-range", `La fecha del capítulo ${chapter.id} (${chapter.date}) cae fuera del rango del viaje.`, { path }));
    }
    previousOrdinal = ordinal;
  });

  return out;
}

function checkDestination(pkg: StoryPackage): HealthFinding[] {
  const out: HealthFinding[] = [];
  if (!isNonEmptyString(pkg.metadata?.destination)) {
    out.push(finding("destination", "warning", "destination.missing", "No se declara destino."));
  }
  return out;
}

function collectMediaRefs(pkg: StoryPackage): Array<{ ref: string; path: string }> {
  const refs: Array<{ ref: string; path: string }> = [];
  const rootHero = pkg.assets?.heroImage;
  if (isNonEmptyString(rootHero)) refs.push({ ref: rootHero, path: "assets.heroImage" });

  (pkg.chapters ?? []).forEach((chapter, ci) => {
    const hero = chapter.assets?.heroImage;
    if (isNonEmptyString(hero)) refs.push({ ref: hero, path: `chapters[${ci}].assets.heroImage` });
    (chapter.activities ?? []).forEach((activity, ai) => {
      if (isNonEmptyString(activity.image)) {
        refs.push({ ref: activity.image, path: `chapters[${ci}].activities[${ai}].image` });
      }
    });
  });
  return refs;
}

function checkMedia(pkg: StoryPackage, ctx: HealthCheckContext): HealthFinding[] {
  const out: HealthFinding[] = [];
  const refs = collectMediaRefs(pkg);

  if (!ctx.assetExists) {
    if (refs.length > 0) {
      out.push(finding("media", "info", "media.not-verified", `${refs.length} referencias de media no verificadas (sin resolver de assets).`));
    }
    return out;
  }

  const assetExists = ctx.assetExists;
  const seen = new Map<string, number>();
  for (const { ref, path } of refs) {
    seen.set(ref, (seen.get(ref) ?? 0) + 1);
    if (!assetExists(ref)) {
      out.push(finding("media", "warning", "media.missing-asset", `El asset referenciado no existe: ${ref}.`, {
        path,
        suggestion: "Corregir la ruta o agregar el archivo.",
      }));
    }
  }
  for (const [ref, count] of seen) {
    if (count > 1) {
      out.push(finding("media", "info", "media.duplicate-ref", `El asset ${ref} se referencia ${count} veces.`));
    }
  }
  return out;
}

function checkMonetary(pkg: StoryPackage): HealthFinding[] {
  const out: HealthFinding[] = [];
  const budget = asRecord(pkg.budget);
  const localCurrency = isNonEmptyString(budget?.currency) ? String(budget?.currency).toUpperCase() : null;

  if (localCurrency && !isSupportedCurrency(localCurrency)) {
    out.push(finding("monetary", "warning", "monetary.unsupported-budget-currency", `budget.currency no está soportada: ${localCurrency}.`, { path: "budget.currency" }));
  }

  (pkg.collections ?? []).forEach((collection, ci) => {
    (collection.items ?? []).forEach((item, ii) => {
      if (isNonEmptyString(item.currency) && !isSupportedCurrency(item.currency)) {
        out.push(finding("monetary", "warning", "monetary.unsupported-item-currency", `Moneda de item no soportada: ${item.currency}.`, {
          path: `collections[${ci}].items[${ii}].currency`,
        }));
      }
    });
  });

  // Consistencia editorial: montos en moneda extranjera sin encuadre de referencia.
  const places = collectPlaces(pkg);
  places.forEach(({ place, path }) => {
    const text = place.recommendation;
    if (!isNonEmptyString(text)) return;
    const tokens = new Set((text.match(CURRENCY_TOKEN_PATTERN) ?? []).map((t) => t.toUpperCase()));
    for (const token of tokens) {
      if (localCurrency && token !== localCurrency && !REFERENCE_FRAMING_PATTERN.test(text)) {
        out.push(finding("monetary", "warning", "monetary.unframed-foreign-currency", `Menciona ${token} (moneda no local) sin encuadrarla como referencia.`, {
          path: `${path}.recommendation`,
          suggestion: `Encuadrar como referencia (ej. "como referencia, ... al cambio del momento") o expresar en ${localCurrency}.`,
        }));
      }
    }
  });

  return out;
}

function collectPlaces(pkg: StoryPackage): Array<{ place: Place; path: string }> {
  const out: Array<{ place: Place; path: string }> = [];
  const catalog = pkg.placesCatalog;
  (catalog?.restaurants ?? []).forEach((place, i) => out.push({ place, path: `placesCatalog.restaurants[${i}]` }));
  (catalog?.cafes ?? []).forEach((place, i) => out.push({ place, path: `placesCatalog.cafes[${i}]` }));
  return out;
}

function checkExperience(pkg: StoryPackage): HealthFinding[] {
  const out: HealthFinding[] = [];
  (pkg.chapters ?? []).forEach((chapter, ci) => {
    const hasContent =
      (chapter.activities?.length ?? 0) > 0 ||
      isNonEmptyString(chapter.copy?.open) ||
      isNonEmptyString(chapter.copy?.close) ||
      isNonEmptyString(chapter.ourMoment);
    if (!hasContent) {
      out.push(finding("experience", "warning", "experience.empty-chapter", `El capítulo ${chapter.id} no tiene actividades ni copy.`, { path: `chapters[${ci}]` }));
    }
  });
  return out;
}

function checkReferences(pkg: StoryPackage): HealthFinding[] {
  const out: HealthFinding[] = [];
  const chapterIds = new Set((pkg.chapters ?? []).map((c) => c.id).filter(isNonEmptyString));
  const placeIds = new Set(collectPlaces(pkg).map(({ place }) => place.id).filter(isNonEmptyString));

  const seenActivityIds = new Set<string>();
  (pkg.chapters ?? []).forEach((chapter, ci) => {
    (chapter.activities ?? []).forEach((activity, ai) => {
      const path = `chapters[${ci}].activities[${ai}]`;
      if (isNonEmptyString(activity.id)) {
        if (seenActivityIds.has(activity.id)) {
          out.push(finding("references", "warning", "references.duplicate-activity-id", `id de actividad duplicado: ${activity.id}.`, { path }));
        } else {
          seenActivityIds.add(activity.id);
        }
      }
      if (isNonEmptyString(activity.relatedPlaceId) && !placeIds.has(activity.relatedPlaceId)) {
        out.push(finding("references", "warning", "references.dangling-place-ref", `relatedPlaceId inexistente: ${activity.relatedPlaceId}.`, { path }));
      }
    });
  });

  (pkg.photoSpots ?? []).forEach((spot, i) => {
    if (isNonEmptyString(spot.relatedChapterId) && !chapterIds.has(spot.relatedChapterId)) {
      out.push(finding("references", "warning", "references.dangling-chapter-ref", `photoSpot con relatedChapterId inexistente: ${spot.relatedChapterId}.`, { path: `photoSpots[${i}]` }));
    }
  });

  (pkg.collections ?? []).forEach((collection, ci) => {
    (collection.items ?? []).forEach((item, ii) => {
      if (isNonEmptyString(item.relatedChapterId) && !chapterIds.has(item.relatedChapterId)) {
        out.push(finding("references", "warning", "references.dangling-chapter-ref", `collection item con relatedChapterId inexistente: ${item.relatedChapterId}.`, { path: `collections[${ci}].items[${ii}]` }));
      }
    });
  });

  collectPlaces(pkg).forEach(({ place, path }) => {
    if (isNonEmptyString(place.relatedChapterId) && !chapterIds.has(place.relatedChapterId)) {
      out.push(finding("references", "warning", "references.dangling-chapter-ref", `lugar con relatedChapterId inexistente: ${place.relatedChapterId}.`, { path }));
    }
  });

  return out;
}

function checkAccessibility(pkg: StoryPackage): HealthFinding[] {
  const out: HealthFinding[] = [];
  (pkg.chapters ?? []).forEach((chapter, ci) => {
    (chapter.activities ?? []).forEach((activity: Activity, ai) => {
      if (isNonEmptyString(activity.image) && !isNonEmptyString(activity.moment) && !isNonEmptyString(activity.title)) {
        out.push(finding("accessibility", "warning", "accessibility.image-without-text", "Actividad con imagen pero sin texto para alt (moment/title).", {
          path: `chapters[${ci}].activities[${ai}]`,
        }));
      }
    });
  });
  return out;
}

function checkContext(pkg: StoryPackage): HealthFinding[] {
  const out: HealthFinding[] = [];
  const budget = asRecord(pkg.budget);
  if (!isNonEmptyString(budget?.currency)) {
    out.push(finding("context", "info", "context.no-local-currency-hint", "El paquete no declara una moneda local (budget.currency); el Context Engine no puede inferir la moneda del destino desde la historia.", {
      suggestion: "Declarar budget.currency con la moneda local del destino.",
    }));
  }
  return out;
}

function validateIntelligence(intel: StoryIntelligence, path: string): HealthFinding[] {
  const out: HealthFinding[] = [];
  const record = intel as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (!INTELLIGENCE_KNOWN_FIELDS.includes(key)) {
      out.push(finding("intelligence", "info", "intelligence.unknown-field", `Campo de intelligence desconocido: ${key}.`, { path }));
    }
  }

  for (const [field, allowed] of Object.entries(INTELLIGENCE_ENUM_FIELDS)) {
    const value = record[field];
    if (value !== undefined && !(allowed as readonly string[]).includes(value as string)) {
      out.push(finding("intelligence", "warning", "intelligence.invalid-enum", `intelligence.${field} tiene un valor inválido: ${String(value)} (esperado: ${allowed.join(" | ")}).`, { path }));
    }
  }

  for (const field of INTELLIGENCE_BOOLEAN_FIELDS) {
    const value = record[field];
    if (value !== undefined && typeof value !== "boolean") {
      out.push(finding("intelligence", "warning", "intelligence.invalid-boolean", `intelligence.${field} debe ser booleano.`, { path }));
    }
  }

  for (const field of INTELLIGENCE_TEXT_FIELDS) {
    const value = record[field];
    if (value !== undefined && !isNonEmptyString(value)) {
      out.push(finding("intelligence", "warning", "intelligence.empty-text", `intelligence.${field} está vacío; omitir el campo si no hay dato.`, { path }));
    }
  }

  if (intel.indoor === true && intel.outdoor === true) {
    out.push(finding("intelligence", "warning", "intelligence.indoor-outdoor-conflict", "intelligence declara indoor y outdoor a la vez.", { path }));
  }

  return out;
}

function checkIntelligence(pkg: StoryPackage): HealthFinding[] {
  const out: HealthFinding[] = [];
  (pkg.chapters ?? []).forEach((chapter, ci) => {
    (chapter.activities ?? []).forEach((activity, ai) => {
      if (activity.intelligence) {
        out.push(...validateIntelligence(activity.intelligence, `chapters[${ci}].activities[${ai}].intelligence`));
      }
    });
  });
  collectPlaces(pkg).forEach(({ place, path }) => {
    if (place.intelligence) {
      out.push(...validateIntelligence(place.intelligence, `${path}.intelligence`));
    }
  });
  return out;
}

const DEFAULT_CHECKERS: readonly StoryHealthChecker[] = [
  checkMetadata,
  checkStructure,
  checkTimeline,
  checkDestination,
  checkMedia,
  checkMonetary,
  checkExperience,
  checkReferences,
  checkAccessibility,
  checkContext,
  checkIntelligence,
  checkLivingContext,
];

const SEVERITY_PENALTY: Record<Severity, number> = { critical: 40, warning: 12, info: 4 };

function computeScore(findings: HealthFinding[]): QualityScore {
  const dimensions = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 100])) as Record<HealthCategory, number>;
  for (const f of findings) {
    dimensions[f.category] = Math.max(0, dimensions[f.category] - SEVERITY_PENALTY[f.severity]);
  }
  const values = Object.values(dimensions);
  const overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return { overall, dimensions };
}

function countBySeverity(findings: HealthFinding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, warning: 0, info: 0 };
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}

function buildReport(storyId: string | null, findings: HealthFinding[]): HealthReport {
  const counts = countBySeverity(findings);
  const score = computeScore(findings);
  const status = counts.critical > 0 ? "issues" : "ok";
  const summary = `Story ${storyId ?? "(sin id)"}: ${counts.critical} críticos, ${counts.warning} advertencias, ${counts.info} sugerencias. Quality score ${score.overall}/100.`;
  return { storyId, status, findings, counts, score, summary };
}

/**
 * Ejecuta el Health Check sobre un objeto crudo. Si el paquete no supera la
 * validación mínima de forma, devuelve un reporte con un único hallazgo crítico
 * en lugar de lanzar. `extraCheckers` permite extender el motor sin tocarlo.
 */
export function runHealthCheck(
  raw: unknown,
  ctx: HealthCheckContext = {},
  extraCheckers: readonly StoryHealthChecker[] = [],
): HealthReport {
  const rawId = asRecord(raw)?.storyId;
  const storyId = isNonEmptyString(rawId) ? rawId : null;

  let pkg: StoryPackage;
  try {
    pkg = loadStoryPackage(raw) as StoryPackage;
  } catch (error) {
    if (error instanceof StoryPackageValidationError) {
      const findings = [finding("metadata", "critical", "structure.invalid-package", error.message)];
      return buildReport(storyId, findings);
    }
    throw error;
  }

  const findings = [...DEFAULT_CHECKERS, ...extraCheckers].flatMap((checker) => {
    try {
      return checker(pkg, ctx);
    } catch (error) {
      return [finding("metadata", "warning", "checker.threw", `Un checker lanzó una excepción: ${(error as Error).message}`)];
    }
  });

  return buildReport(pkg.storyId ?? storyId, findings);
}
