// Contrato runtime autoritativo de Story Package. No conoce destinos concretos.
const ROOT_FIELDS = ['storyId', 'schemaVersion', 'metadata', 'storyMood', 'unlockRulesDefault', 'chapters', 'baseCopy'];
const METADATA_FIELDS = ['destination', 'title', 'travelDates', 'language'];
const CHAPTER_FIELDS = ['id', 'order', 'title'];
const SPECIAL_FIELDS = ['id', 'order', 'title', 'date', 'kind', 'breaksNarrativeRules', 'prompts'];

export class StoryPackageValidationError extends Error {
  constructor(message, issues = []) {
    super(message);
    this.name = 'StoryPackageValidationError';
    this.issues = issues;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireFields(value, fields, path, issues) {
  if (!isObject(value)) {
    issues.push(`${path}: se esperaba un objeto.`);
    return false;
  }
  for (const field of fields) if (!(field in value)) issues.push(`${path}: falta ${field}.`);
  return true;
}

function requireText(value, path, issues) {
  if (typeof value !== 'string' || value.trim() === '') issues.push(`${path}: debe ser texto no vacío.`);
}

function validateMediaReferences(value, path, issues) {
  if (Array.isArray(value)) return value.forEach((item, index) => validateMediaReferences(item, `${path}[${index}]`, issues));
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (/(image|video)$/i.test(key) && child != null && (typeof child !== 'string' || child.trim() === '')) {
      issues.push(`${childPath}: la referencia de media debe ser texto no vacío.`);
    }
    validateMediaReferences(child, childPath, issues);
  }
}

export function validateStoryPackage(raw) {
  const issues = [];
  if (!requireFields(raw, ROOT_FIELDS, 'Story Package', issues)) return issues;
  requireText(raw.storyId, 'storyId', issues);
  requireText(raw.schemaVersion, 'schemaVersion', issues);

  if (requireFields(raw.metadata, METADATA_FIELDS, 'metadata', issues)) {
    requireText(raw.metadata.destination, 'metadata.destination', issues);
    requireText(raw.metadata.title, 'metadata.title', issues);
    requireText(raw.metadata.language, 'metadata.language', issues);
    if (!isObject(raw.metadata.travelDates)) issues.push('metadata.travelDates: se esperaba un objeto.');
    else {
      requireText(raw.metadata.travelDates.start, 'metadata.travelDates.start', issues);
      requireText(raw.metadata.travelDates.end, 'metadata.travelDates.end', issues);
      if (raw.metadata.travelDates.end < raw.metadata.travelDates.start) issues.push('metadata.travelDates: end debe ser posterior o igual a start.');
    }
  }

  if (!isObject(raw.storyMood)) issues.push('storyMood: se esperaba un objeto.');
  else requireText(raw.storyMood.primary, 'storyMood.primary', issues);
  if (!isObject(raw.unlockRulesDefault)) issues.push('unlockRulesDefault: se esperaba un objeto.');
  if (!isObject(raw.baseCopy)) issues.push('baseCopy: se esperaba un objeto.');

  if (!Array.isArray(raw.chapters) || raw.chapters.length === 0) issues.push('chapters: debe contener al menos un capítulo.');
  else {
    const ids = new Set();
    const orders = new Set();
    const activityIds = new Set();
    raw.chapters.forEach((chapter, index) => {
      const path = `chapters[${index}]`;
      if (!requireFields(chapter, CHAPTER_FIELDS, path, issues)) return;
      requireText(chapter.id, `${path}.id`, issues);
      requireText(chapter.title, `${path}.title`, issues);
      if (!Number.isInteger(chapter.order) || chapter.order < 1) issues.push(`${path}.order: debe ser un entero positivo.`);
      if (ids.has(chapter.id)) issues.push(`${path}.id: id duplicado "${chapter.id}".`);
      if (orders.has(chapter.order)) issues.push(`${path}.order: orden duplicado ${chapter.order}.`);
      ids.add(chapter.id); orders.add(chapter.order);
      if (chapter.activities != null && !Array.isArray(chapter.activities)) issues.push(`${path}.activities: debe ser una lista.`);
      for (const [activityIndex, activity] of (chapter.activities ?? []).entries()) {
        requireText(activity?.id, `${path}.activities[${activityIndex}].id`, issues);
        if (activityIds.has(activity?.id)) issues.push(`${path}.activities[${activityIndex}].id: id duplicado "${activity?.id}".`);
        activityIds.add(activity?.id);
      }
    });
  }

  if (raw.specialChapter) requireFields(raw.specialChapter, SPECIAL_FIELDS, 'specialChapter', issues);
  validateMediaReferences(raw, 'Story Package', issues);
  return issues;
}

export function loadStoryPackage(raw) {
  const issues = validateStoryPackage(raw);
  if (issues.length) throw new StoryPackageValidationError(`Story Package inválido:\n- ${issues.join('\n- ')}`, issues);
  return raw;
}
