import { EDITORIAL_V1_KINDS, EDITORIAL_V1_VARIANT_IDS } from "./catalog";
import {
  EditorialContractError,
  type EditorialCatalog,
  type EditorialErrorCode,
  type EditorialVariant,
} from "./contracts";

const MAX_TEXT_CODE_POINTS = 160;
const WORD_EDGE_LEFT = "(?:^|[^\\p{L}])";
const WORD_EDGE_RIGHT = "(?=$|[^\\p{L}])";
const FORBIDDEN_LANGUAGE = [
  "debes?",
  "no\\s+olvid(?:es|e)",
  "tienes?\\s+que",
  "urgent\\p{L}*",
  "important\\p{L}*",
  "alert\\p{L}*",
  "vos",
  "tenes",
  "podes",
  "queres",
  "veni",
  "mira",
  "disfruta",
  "recorda",
  "preparate",
  "aprovecha",
  "haz",
  "recuerda",
  "revisa",
  "cambia",
  "lleva",
  "envia",
  "activa",
  "pulsa",
  "abre\\s+la\\s+app",
  "notificacion(?:es)?",
  "mensaje\\s+enviado",
  "sistema",
  "push",
] as const;
const FORBIDDEN_PATTERNS = FORBIDDEN_LANGUAGE.map(
  (pattern) => new RegExp(`${WORD_EDGE_LEFT}${pattern}${WORD_EDGE_RIGHT}`, "u"),
);
const MARKUP = /<\/?[a-z][^>]*>|\[[^\]]+\]\([^)]*\)|\*\*|__|`|_[^_]+_|(?:^|\s)[#>*_-]\s/iu;
const EMOJI = /\p{Extended_Pictographic}/u;
const SUSTAINED_CAPS = /(?:^|[^\p{L}])\p{Lu}{4,}(?:\s+\p{Lu}{4,})*(?=$|[^\p{L}])/u;
const REPEATED_PUNCTUATION = /([?.,;:\-])\1|¿¿/u;

function fail(code: EditorialErrorCode): never {
  throw new EditorialContractError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeForComparison(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es-CL");
}

function hasPlaceholderSyntax(text: string): boolean {
  return /[{}]/u.test(text) || /\\[{}]/u.test(text);
}

function hasForbiddenTone(text: string): boolean {
  const normalized = normalizeForComparison(text);
  return text.includes("!")
    || MARKUP.test(text)
    || EMOJI.test(text)
    || SUSTAINED_CAPS.test(text)
    || REPEATED_PUNCTUATION.test(text)
    || FORBIDDEN_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function validateEditorialText(value: unknown): string {
  if (typeof value !== "string") fail("INVALID_TEXT");
  if (hasPlaceholderSyntax(value)) fail("PLACEHOLDER_NOT_ALLOWED");
  if (
    value.length === 0
    || value !== value.trim()
    || value !== value.normalize("NFC")
    || /[\r\n\t]/u.test(value)
    || / {2,}/u.test(value)
    || (value.match(/[.?]/gu)?.length ?? 0) > 2
  ) fail("INVALID_TEXT");
  if (Array.from(value).length > MAX_TEXT_CODE_POINTS) fail("TEXT_TOO_LONG");
  if (hasForbiddenTone(value)) fail("FORBIDDEN_TEXT");
  return value;
}

function validateVariantShape(value: unknown): asserts value is EditorialVariant {
  if (!isRecord(value) || typeof value.id !== "string" || !EDITORIAL_V1_VARIANT_IDS.includes(value.id as never)) {
    fail("INVALID_CATALOG");
  }
  validateEditorialText(value.text);
}

export function validateEditorialCatalog(value: unknown): EditorialCatalog {
  if (!isRecord(value) || value.version !== "editorial-v1" || !isRecord(value.entries)) {
    fail("INVALID_CATALOG");
  }
  if (value.locale !== "es-CL") fail("INVALID_LOCALE");

  const entryKeys = Object.keys(value.entries);
  if (entryKeys.some((kind) => !EDITORIAL_V1_KINDS.includes(kind as never))) fail("INVALID_CATALOG");

  const seenIds = new Set<string>();
  for (const kind of EDITORIAL_V1_KINDS) {
    const variants = value.entries[kind];
    if (!Array.isArray(variants) || variants.length === 0) fail("MISSING_KIND");
    if (variants.length < 2) fail("INVALID_CATALOG");
    for (const variant of variants) {
      validateVariantShape(variant);
      if (seenIds.has(variant.id)) fail("DUPLICATE_VARIANT_ID");
      seenIds.add(variant.id);
    }
  }

  return value as unknown as EditorialCatalog;
}
