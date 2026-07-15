import crypto from 'node:crypto';
import { requireTripMember } from './platformAuth.js';
import { getMemoriesCollection, toObjectId } from './platformMongo.js';

export const SEMANTIC_MEMORY_RECORD_KIND = 'alaia_memory_record_v1';
export const SEMANTIC_MEMORY_IDENTITY_VERSION = 'memory-key-v1';
export const SEMANTIC_MEMORY_LEGACY_PREFIX = 'semantic-v1:';

const SEPARATOR = '\u001f';
const ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const MEMORY_KEY_PATTERN = /^mk1_[a-f0-9]{64}$/;
const ACCEPTED_KEYS = [
  'outcome', 'lifecycle', 'type', 'origin', 'occurredAt', 'scope', 'decisionRef',
  'editorialRef', 'evidence', 'meaning', 'retention', 'dedupe',
];
const RECORD_KEYS = [
  'recordKind', 'memoryKey', 'identityVersion', 'type', 'origin', 'occurredAt', 'createdAt',
  'owner', 'tripRef', 'storyRef', 'decisionRef', 'editorialRef', 'evidence', 'meaning', 'state', 'retention',
];
const PRIVACY_KEY = /(?:email|e-mail|token|secret|password|credential|coordinate|latitude|longitude|rawerror|stack|quote|note|weather|observation|fullpayload|pii|usertext|freetext|fullname|address|phone)/i;
const EDITORIAL_TEXT = Object.freeze({
  'today-01': 'Hoy comienza una nueva historia.',
  'today-02': 'El viaje empieza hoy, a su propio ritmo.',
  'last-day-01': 'Hoy es el último día de este viaje.',
  'last-day-02': 'Este viaje llega hoy a su último día.',
});

export class MemoryEngineError extends Error {
  constructor(code) {
    super(code);
    Object.defineProperty(this, 'message', { enumerable: false, value: code });
    Object.defineProperty(this, 'stack', { enumerable: false, value: undefined });
    this.code = code;
    this.name = 'MemoryEngineError';
  }
}

function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function safeId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function iso(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function containsPrivateData(value, seen = new Set()) {
  if (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return true;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || PRIVACY_KEY.test(key)) return true;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.get || descriptor.set || containsPrivateData(descriptor.value, seen)) return true;
  }
  seen.delete(value);
  return false;
}

function validRef(value, keys) {
  return exactKeys(value, keys) && keys.every((key) => safeId(value[key]));
}

function validAccepted(value) {
  if (containsPrivateData(value) || !exactKeys(value, ACCEPTED_KEYS)
    || value.outcome !== 'accepted' || value.lifecycle !== 'accepted'
    || !['trip_started', 'trip_last_day', 'favorite_marked', 'first_chapter_opened'].includes(value.type)
    || !['companion_editorial', 'authorized_event'].includes(value.origin)
    || !iso(value.occurredAt)
    || !exactKeys(value.scope, ['ownerUserId', 'tripId', 'storyId'])
    || !safeId(value.scope.ownerUserId) || !safeId(value.scope.tripId)
    || (value.scope.storyId !== null && !safeId(value.scope.storyId))
    || !exactKeys(value.meaning, ['code', 'text']) || value.meaning.code !== value.type
    || !exactKeys(value.retention, ['reason', 'explanation'])
    || !exactKeys(value.dedupe, ['version', 'sourceSlot'])
    || value.dedupe.version !== SEMANTIC_MEMORY_IDENTITY_VERSION || !safeId(value.dedupe.sourceSlot)
    || !Array.isArray(value.evidence) || value.evidence.length !== 1
    || !validRef(value.evidence[0], ['kind', 'ref'])) return false;

  if (value.origin === 'companion_editorial') {
    if (!['trip_started', 'trip_last_day'].includes(value.type)
      || !validRef(value.decisionRef, ['id', 'kind'])
      || !validRef(value.editorialRef, ['catalogVersion', 'variantId'])
      || value.editorialRef.catalogVersion !== 'editorial-v1'
      || value.evidence[0].kind !== 'companion_action'
      || value.evidence[0].ref !== value.decisionRef.id
      || value.dedupe.sourceSlot !== value.decisionRef.id
      || value.retention.reason !== 'trip_milestone'
      || value.retention.explanation !== 'travel_milestone_worth_recalling') return false;
    const expectedType = value.decisionRef.kind === 'trip_start_today' ? 'trip_started'
      : value.decisionRef.kind === 'trip_last_day' ? 'trip_last_day' : null;
    return expectedType === value.type && EDITORIAL_TEXT[value.editorialRef.variantId] === value.meaning.text;
  }

  if (value.decisionRef !== null || value.editorialRef !== null || value.meaning.text !== null) return false;
  if (value.type === 'favorite_marked') {
    return value.evidence[0].kind === 'favorite_target'
      && value.dedupe.sourceSlot === `favorite:${value.evidence[0].ref}`
      && value.retention.reason === 'explicit_affinity'
      && value.retention.explanation === 'explicit_preference_worth_recalling';
  }
  return value.type === 'first_chapter_opened'
    && value.evidence[0].kind === 'chapter_target'
    && value.dedupe.sourceSlot === 'first-chapter'
    && value.retention.reason === 'first_story_open'
    && value.retention.explanation === 'first_story_step_worth_recalling';
}

function memoryKey(accepted) {
  const canonical = [
    accepted.dedupe.version,
    accepted.scope.ownerUserId,
    accepted.scope.tripId,
    accepted.scope.storyId ?? '-',
    accepted.type,
    accepted.origin,
    accepted.dedupe.sourceSlot,
  ].join(SEPARATOR);
  return `mk1_${crypto.createHash('sha256').update(canonical, 'utf8').digest('hex')}`;
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) freeze(item);
  return Object.freeze(value);
}

function projectedRecord(doc) {
  return {
    recordKind: doc.recordKind,
    memoryKey: doc.memoryKey,
    identityVersion: doc.identityVersion,
    type: doc.type,
    origin: doc.origin,
    occurredAt: doc.occurredAt,
    createdAt: doc.createdAt,
    owner: { userId: doc.owner.userId },
    tripRef: { tripId: doc.tripRef.tripId },
    storyRef: doc.storyRef ? { storyId: doc.storyRef.storyId } : null,
    decisionRef: doc.decisionRef ? { ...doc.decisionRef } : null,
    editorialRef: doc.editorialRef ? { ...doc.editorialRef } : null,
    evidence: doc.evidence.map((item) => ({ ...item })),
    meaning: { ...doc.meaning },
    state: doc.state,
    retention: { ...doc.retention },
  };
}

function validPublicRecord(record) {
  if (containsPrivateData(record) || !exactKeys(record, RECORD_KEYS)
    || record.recordKind !== SEMANTIC_MEMORY_RECORD_KIND
    || !MEMORY_KEY_PATTERN.test(record.memoryKey)
    || record.identityVersion !== SEMANTIC_MEMORY_IDENTITY_VERSION
    || !['persisted', 'remembered', 'archived'].includes(record.state)
    || !exactKeys(record.owner, ['userId']) || !safeId(record.owner.userId)
    || !exactKeys(record.tripRef, ['tripId']) || !safeId(record.tripRef.tripId)
    || (record.storyRef !== null && (!exactKeys(record.storyRef, ['storyId']) || !safeId(record.storyRef.storyId)))) return false;
  const evidence = Array.isArray(record.evidence) ? record.evidence[0] : null;
  const sourceSlot = record.origin === 'companion_editorial' ? record.decisionRef?.id
    : record.type === 'favorite_marked' ? `favorite:${evidence?.ref}` : 'first-chapter';
  return validAccepted({
    outcome: 'accepted',
    lifecycle: 'accepted',
    type: record.type,
    origin: record.origin,
    occurredAt: record.occurredAt,
    scope: {
      ownerUserId: record.owner.userId,
      tripId: record.tripRef.tripId,
      storyId: record.storyRef?.storyId ?? null,
    },
    decisionRef: record.decisionRef,
    editorialRef: record.editorialRef,
    evidence: record.evidence,
    meaning: record.meaning,
    retention: record.retention,
    dedupe: { version: SEMANTIC_MEMORY_IDENTITY_VERSION, sourceSlot },
  });
}

function publicRecord(doc) {
  let record;
  try {
    record = projectedRecord(doc);
  } catch {
    throw new MemoryEngineError('SCHEMA_REJECTED');
  }
  if (!validPublicRecord(record)) throw new MemoryEngineError('SCHEMA_REJECTED');
  return freeze(record);
}

function documentFrom(accepted, resolvedMemoryKey, tripObjectId, createdAt) {
  const record = {
    recordKind: SEMANTIC_MEMORY_RECORD_KIND,
    memoryKey: resolvedMemoryKey,
    identityVersion: SEMANTIC_MEMORY_IDENTITY_VERSION,
    type: accepted.type,
    origin: accepted.origin,
    occurredAt: accepted.occurredAt,
    createdAt,
    owner: { userId: accepted.scope.ownerUserId },
    tripRef: { tripId: accepted.scope.tripId },
    storyRef: accepted.scope.storyId ? { storyId: accepted.scope.storyId } : null,
    decisionRef: accepted.decisionRef ? { ...accepted.decisionRef } : null,
    editorialRef: accepted.editorialRef ? { ...accepted.editorialRef } : null,
    evidence: accepted.evidence.map((item) => ({ ...item })),
    meaning: { ...accepted.meaning },
    state: 'persisted',
    retention: { ...accepted.retention },
  };
  return {
    ...record,
    tripId: tripObjectId,
    legacyId: `${SEMANTIC_MEMORY_LEGACY_PREFIX}${resolvedMemoryKey}`,
  };
}

function duplicate(type) {
  return Object.freeze({ outcome: 'discard', reason: 'duplicate', type });
}

function isDuplicateError(error) {
  return error?.code === 11000 || error?.codeName === 'DuplicateKey';
}

export function createSemanticMemoryRepository(
  { req, tripId },
  dependencies = {},
) {
  const authenticate = dependencies.requireTripMember ?? requireTripMember;
  const collectionFor = dependencies.getMemoriesCollection ?? getMemoriesCollection;
  const objectId = dependencies.toObjectId ?? toObjectId;
  const now = dependencies.now ?? (() => new Date().toISOString());

  async function contextFor(scope) {
    let context;
    try {
      context = await authenticate(req, null, tripId);
    } catch {
      throw new MemoryEngineError('OWNERSHIP_DENIED');
    }
    if (!context || !exactKeys(scope, ['ownerUserId', 'tripId', 'storyId'])
      || String(context.user?.userId) !== scope.ownerUserId
      || String(context.trip?._id) !== scope.tripId
      || String(tripId) !== scope.tripId) throw new MemoryEngineError('OWNERSHIP_DENIED');
    return context;
  }

  return Object.freeze({
    async persistOnce(accepted) {
      if (!validAccepted(accepted)) throw new MemoryEngineError('SCHEMA_REJECTED');
      await contextFor(accepted.scope);
      let tripObjectId;
      let createdAt;
      try {
        tripObjectId = objectId(tripId, 'tripId');
        createdAt = now();
      } catch {
        throw new MemoryEngineError('SCHEMA_REJECTED');
      }
      if (!iso(createdAt)) throw new MemoryEngineError('SCHEMA_REJECTED');
      const resolvedMemoryKey = memoryKey(accepted);
      const document = documentFrom(accepted, resolvedMemoryKey, tripObjectId, createdAt);
      try {
        const memories = await collectionFor();
        const result = await memories.updateOne(
          { tripId: tripObjectId, legacyId: document.legacyId },
          { $setOnInsert: document },
          { upsert: true },
        );
        if (!result?.upsertedCount) return duplicate(accepted.type);
        return publicRecord(document);
      } catch (error) {
        if (isDuplicateError(error)) return duplicate(accepted.type);
        throw new MemoryEngineError('REPOSITORY_FAILURE');
      }
    },

    async getAndRemember(resolvedMemoryKey, scope) {
      if (!MEMORY_KEY_PATTERN.test(resolvedMemoryKey) || containsPrivateData(scope)
        || !exactKeys(scope, ['ownerUserId', 'tripId', 'storyId'])
        || !safeId(scope.ownerUserId) || !safeId(scope.tripId)
        || (scope.storyId !== null && !safeId(scope.storyId))) throw new MemoryEngineError('SCHEMA_REJECTED');
      await contextFor(scope);
      let tripObjectId;
      try {
        tripObjectId = objectId(tripId, 'tripId');
      } catch {
        throw new MemoryEngineError('SCHEMA_REJECTED');
      }
      try {
        const memories = await collectionFor();
        const filter = {
          tripId: tripObjectId,
          legacyId: `${SEMANTIC_MEMORY_LEGACY_PREFIX}${resolvedMemoryKey}`,
          recordKind: SEMANTIC_MEMORY_RECORD_KIND,
          'owner.userId': scope.ownerUserId,
          ...(scope.storyId === null ? { storyRef: null } : { 'storyRef.storyId': scope.storyId }),
          state: { $in: ['persisted', 'remembered'] },
        };
        const current = await memories.findOne(filter);
        if (!current) return null;
        publicRecord(current);
        const document = await memories.findOneAndUpdate(
          filter,
          { $set: { state: 'remembered' } },
          { returnDocument: 'after' },
        );
        return document ? publicRecord(document) : null;
      } catch (error) {
        if (error instanceof MemoryEngineError) throw error;
        throw new MemoryEngineError('REPOSITORY_FAILURE');
      }
    },
  });
}
