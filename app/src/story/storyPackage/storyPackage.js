// Carga y valida la forma mínima de un Story Package (ver STORY_PACKAGE_SCHEMA_v1.4.md).
// No interpreta contenido ni conoce ninguna historia en particular.

const REQUIRED_ROOT_FIELDS = [
  'storyId',
  'schemaVersion',
  'metadata',
  'storyMood',
  'unlockRulesDefault',
  'chapters',
  'baseCopy',
];

const REQUIRED_METADATA_FIELDS = ['destination', 'title', 'travelDates', 'language'];
const REQUIRED_CHAPTER_FIELDS = ['id', 'order', 'title'];
const REQUIRED_SPECIAL_CHAPTER_FIELDS = [
  'id',
  'order',
  'title',
  'date',
  'kind',
  'breaksNarrativeRules',
  'prompts',
];

export class StoryPackageValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StoryPackageValidationError';
  }
}

function assertFields(value, fields, context) {
  if (!value || typeof value !== 'object') {
    throw new StoryPackageValidationError(`${context}: se esperaba un objeto.`);
  }
  const missing = fields.filter((field) => !(field in value));
  if (missing.length > 0) {
    throw new StoryPackageValidationError(`${context}: faltan los campos obligatorios [${missing.join(', ')}]`);
  }
}

/**
 * Valida que `raw` tenga la forma mínima de un Story Package y lo devuelve tal cual.
 * Lanza StoryPackageValidationError con un mensaje legible si falta algo obligatorio.
 */
export function loadStoryPackage(raw) {
  assertFields(raw, REQUIRED_ROOT_FIELDS, 'Story Package');
  assertFields(raw.metadata, REQUIRED_METADATA_FIELDS, 'metadata');

  if (!raw.metadata.travelDates?.start || !raw.metadata.travelDates?.end) {
    throw new StoryPackageValidationError('metadata.travelDates debe tener start y end.');
  }

  if (!raw.storyMood?.primary) {
    throw new StoryPackageValidationError('storyMood.primary es obligatorio.');
  }

  if (!Array.isArray(raw.chapters) || raw.chapters.length === 0) {
    throw new StoryPackageValidationError('chapters debe ser una lista con al menos un capítulo.');
  }

  raw.chapters.forEach((chapter, index) => {
    assertFields(chapter, REQUIRED_CHAPTER_FIELDS, `chapters[${index}]`);
  });

  if (raw.specialChapter) {
    assertFields(raw.specialChapter, REQUIRED_SPECIAL_CHAPTER_FIELDS, 'specialChapter');
  }

  return raw;
}
