// Carga y valida la forma mínima de un Story Package (ver STORY_PACKAGE_SCHEMA_v1.4.md).
// No interpreta contenido ni conoce ninguna historia en particular.
// Port TS 1:1 de story/storyPackage/storyPackage.js — misma lógica y mensajes.

import type { StoryPackage } from "./types";

const REQUIRED_ROOT_FIELDS = [
  "storyId",
  "schemaVersion",
  "metadata",
  "storyMood",
  "unlockRulesDefault",
  "chapters",
  "baseCopy",
] as const;

const REQUIRED_METADATA_FIELDS = [
  "destination",
  "title",
  "travelDates",
  "language",
] as const;
const REQUIRED_CHAPTER_FIELDS = ["id", "order", "title"] as const;
const REQUIRED_SPECIAL_CHAPTER_FIELDS = [
  "id",
  "order",
  "title",
  "date",
  "kind",
  "breaksNarrativeRules",
  "prompts",
] as const;

export class StoryPackageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryPackageValidationError";
  }
}

function assertFields(
  value: unknown,
  fields: readonly string[],
  context: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new StoryPackageValidationError(`${context}: se esperaba un objeto.`);
  }
  const record = value as Record<string, unknown>;
  const missing = fields.filter((field) => !(field in record));
  if (missing.length > 0) {
    throw new StoryPackageValidationError(
      `${context}: faltan los campos obligatorios [${missing.join(", ")}]`,
    );
  }
}

/**
 * Valida que `raw` tenga la forma mínima de un Story Package y lo devuelve tal cual.
 * Lanza StoryPackageValidationError con un mensaje legible si falta algo obligatorio.
 */
export function loadStoryPackage(raw: unknown): StoryPackage {
  assertFields(raw, REQUIRED_ROOT_FIELDS, "Story Package");
  const pkg = raw as Record<string, unknown>;
  assertFields(pkg.metadata, REQUIRED_METADATA_FIELDS, "metadata");

  const metadata = pkg.metadata as { travelDates?: { start?: unknown; end?: unknown } };
  if (!metadata.travelDates?.start || !metadata.travelDates?.end) {
    throw new StoryPackageValidationError(
      "metadata.travelDates debe tener start y end.",
    );
  }

  const storyMood = pkg.storyMood as { primary?: unknown };
  if (!storyMood?.primary) {
    throw new StoryPackageValidationError("storyMood.primary es obligatorio.");
  }

  if (!Array.isArray(pkg.chapters) || pkg.chapters.length === 0) {
    throw new StoryPackageValidationError(
      "chapters debe ser una lista con al menos un capítulo.",
    );
  }

  pkg.chapters.forEach((chapter, index) => {
    assertFields(chapter, REQUIRED_CHAPTER_FIELDS, `chapters[${index}]`);
  });

  if (pkg.specialChapter) {
    assertFields(
      pkg.specialChapter,
      REQUIRED_SPECIAL_CHAPTER_FIELDS,
      "specialChapter",
    );
  }

  return raw as StoryPackage;
}
