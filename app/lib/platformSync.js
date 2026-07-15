import { mergeChapterStatuses, mergeMemories } from '../src/sync/syncMerge.js';
import { toObjectId } from './platformMongo.js';
import {
  SEMANTIC_MEMORY_LEGACY_PREFIX,
  SEMANTIC_MEMORY_RECORD_KIND,
} from './platformMemory.js';

const SEMANTIC_CONTRACT_FIELDS = new Set([
  'recordKind', 'memoryKey', 'identityVersion', 'owner', 'tripRef', 'storyRef',
  'decisionRef', 'editorialRef', 'evidence', 'meaning', 'state', 'retention', 'origin',
]);

function asPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()) : [];
}

function timestamp(memory) {
  return memory.updatedAt ?? memory.createdAt ?? new Date(0).toISOString();
}

export function normalizeChapterStatuses(input = {}) {
  return Object.fromEntries(
    Object.entries(asPlainObject(input)).filter(([chapterId, status]) => chapterId && typeof status === 'string' && status.trim())
  );
}

export function isSemanticMemoryDocument(value = {}) {
  const memory = asPlainObject(value);
  return memory.recordKind === SEMANTIC_MEMORY_RECORD_KIND
    || String(memory.legacyId ?? memory.id ?? '').startsWith(SEMANTIC_MEMORY_LEGACY_PREFIX);
}

export function isSemanticMemoryWrite(value = {}) {
  const memory = asPlainObject(value);
  return isSemanticMemoryDocument(memory)
    || Object.keys(memory).some((key) => SEMANTIC_CONTRACT_FIELDS.has(key));
}

export function nonSemanticMemoryFilter(filter = {}) {
  return {
    $and: [
      { ...filter },
      { recordKind: { $ne: SEMANTIC_MEMORY_RECORD_KIND } },
      { legacyId: { $not: /^semantic-v1:/ } },
    ],
  };
}

export function normalizeClientMemory(memory = {}) {
  if (isSemanticMemoryWrite(memory)) return null;
  const legacyId = String(memory.legacyId ?? memory.id ?? '').trim();
  if (!legacyId) return null;

  const now = new Date().toISOString();
  const createdAt = memory.createdAt ?? memory.updatedAt ?? now;
  const updatedAt = memory.updatedAt ?? createdAt;

  return {
    id: legacyId,
    legacyId,
    storyId: typeof memory.storyId === 'string' ? memory.storyId : null,
    chapterId: typeof memory.chapterId === 'string' ? memory.chapterId : null,
    activityId: memory.activityId ?? null,
    note: typeof memory.note === 'string' ? memory.note : '',
    photos: cleanArray(memory.photos),
    videos: cleanArray(memory.videos),
    favorite: Boolean(memory.favorite),
    archived: Boolean(memory.archived),
    createdAt,
    updatedAt,
  };
}

export function normalizeClientMemories(memories = []) {
  if (!Array.isArray(memories)) return [];
  return memories.map(normalizeClientMemory).filter(Boolean);
}

export function memoryDocumentToClientMemory(doc = {}) {
  if (isSemanticMemoryDocument(doc)) return null;
  const legacyId = String(doc.legacyId ?? '').trim();
  return normalizeClientMemory({
    ...doc,
    id: legacyId,
    legacyId,
  });
}

export function clientMemoryToDocument(memory, tripId) {
  const normalized = normalizeClientMemory(memory);
  if (!normalized) return null;
  return {
    tripId: toObjectId(tripId, 'tripId'),
    legacyId: normalized.legacyId,
    storyId: normalized.storyId,
    chapterId: normalized.chapterId,
    activityId: normalized.activityId,
    note: normalized.note,
    photos: normalized.photos,
    videos: normalized.videos,
    favorite: normalized.favorite,
    archived: normalized.archived,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
  };
}

export function mergeTripSyncState({ incomingChapterStatuses = {}, incomingMemories = [], remoteTripState = null, remoteMemories = [] } = {}) {
  const mergedChapterStatuses = mergeChapterStatuses(
    normalizeChapterStatuses(incomingChapterStatuses),
    normalizeChapterStatuses(remoteTripState?.chapterStatuses)
  );

  const localMemories = normalizeClientMemories(incomingMemories);
  const serverMemories = remoteMemories.map(memoryDocumentToClientMemory).filter(Boolean);
  const mergedMemories = mergeMemories(localMemories, serverMemories).sort((a, b) => timestamp(a).localeCompare(timestamp(b)));

  return { chapterStatuses: mergedChapterStatuses, memories: mergedMemories };
}

export function publicTripSyncState(state) {
  return {
    chapterStatuses: state.chapterStatuses,
    memories: state.memories.map(({ id, storyId, chapterId, activityId, note, photos, videos, favorite, archived, createdAt, updatedAt }) => ({
      id,
      storyId,
      chapterId,
      activityId,
      note,
      photos,
      videos,
      favorite,
      archived,
      createdAt,
      updatedAt,
    })),
  };
}

export async function ensureTripSyncIndexes({ tripStates, memories }) {
  await Promise.all([
    tripStates.createIndex({ tripId: 1 }, { unique: true }),
    memories.createIndex({ tripId: 1, legacyId: 1 }, { unique: true }),
  ]);
}
