import { applyCors } from '../../../lib/cors.js';
import { requireTripMember, requireUser } from '../../../lib/platformAuth.js';
import { createSemanticMemoryRepository } from '../../../lib/platformMemory.js';
import { getBaseStory } from '../../../lib/platformStories.js';

const BODY_KEYS = [
  'outcome', 'lifecycle', 'type', 'origin', 'occurredAt', 'scope', 'decisionRef',
  'editorialRef', 'evidence', 'meaning', 'retention', 'dedupe',
];
const MEMORY_TEXT = Object.freeze({
  trip_started: Object.freeze({
    'today-01': 'Hoy comienza una nueva historia.',
    'today-02': 'El viaje empieza hoy, a su propio ritmo.',
  }),
  trip_last_day: Object.freeze({
    'last-day-01': 'Hoy es el último día de este viaje.',
    'last-day-02': 'Este viaje llega hoy a su último día.',
  }),
});
const ID = /^[A-Za-z0-9._:-]{1,128}$/;

function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function safeId(value) {
  return typeof value === 'string' && ID.test(value);
}

function iso(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

function exactGetQuery(query) {
  return exactKeys(query, ['tripId', 'storyId']) && safeId(query.tripId) && safeId(query.storyId);
}

function acceptedMilestone(value, scope) {
  if (!exactKeys(value, BODY_KEYS)
    || value.outcome !== 'accepted' || value.lifecycle !== 'accepted'
    || !['trip_started', 'trip_last_day'].includes(value.type)
    || value.origin !== 'companion_editorial' || !iso(value.occurredAt)
    || !exactKeys(value.scope, ['ownerUserId', 'tripId', 'storyId'])
    || value.scope.ownerUserId !== scope.ownerUserId
    || value.scope.tripId !== scope.tripId
    || value.scope.storyId !== scope.storyId
    || !exactKeys(value.decisionRef, ['id', 'kind'])
    || !safeId(value.decisionRef.id) || !safeId(value.decisionRef.kind)
    || !exactKeys(value.editorialRef, ['catalogVersion', 'variantId'])
    || value.editorialRef.catalogVersion !== 'editorial-v1' || !safeId(value.editorialRef.variantId)
    || !Array.isArray(value.evidence) || value.evidence.length !== 1
    || !exactKeys(value.evidence[0], ['kind', 'ref'])
    || value.evidence[0].kind !== 'companion_action' || value.evidence[0].ref !== value.decisionRef.id
    || !exactKeys(value.meaning, ['code', 'text']) || value.meaning.code !== value.type
    || !exactKeys(value.retention, ['reason', 'explanation'])
    || value.retention.reason !== 'trip_milestone'
    || value.retention.explanation !== 'travel_milestone_worth_recalling'
    || !exactKeys(value.dedupe, ['version', 'sourceSlot'])
    || value.dedupe.version !== 'memory-key-v1' || value.dedupe.sourceSlot !== value.decisionRef.id) return false;
  const expectedKind = value.type === 'trip_started' ? 'trip_start_today' : 'trip_last_day';
  return value.decisionRef.kind === expectedKind
    && MEMORY_TEXT[value.type]?.[value.editorialRef.variantId] === value.meaning.text;
}

function safeMemoryProjection(record) {
  const text = record?.meaning?.text;
  if (!record || !['trip_started', 'trip_last_day'].includes(record.type) || typeof text !== 'string') return null;
  if (!Object.values(MEMORY_TEXT[record.type]).includes(text)) return null;
  return Object.freeze({ type: record.type, text });
}

function invalid(res) {
  return res.status(400).json({ error: 'Solicitud inválida.' });
}

function unavailable(res) {
  return res.status(503).json({ error: 'Los recuerdos no están disponibles.' });
}

export function createSemanticMemoriesHandler(dependencies = {}) {
  const cors = dependencies.applyCors ?? applyCors;
  const authenticate = dependencies.requireUser ?? requireUser;
  const authorizeTrip = dependencies.requireTripMember ?? requireTripMember;
  const repositoryFor = dependencies.createSemanticMemoryRepository ?? createSemanticMemoryRepository;
  const resolveStory = dependencies.getBaseStory ?? getBaseStory;

  return async function semanticMemoriesHandler(req, res) {
    if (cors(req, res)) return;
    if (!['GET', 'POST'].includes(req.method)) {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const tripId = req.query?.tripId;
    if (!safeId(tripId)) return invalid(res);

    const user = await authenticate(req, res);
    if (!user) return;
    const context = await authorizeTrip(req, res, tripId);
    if (!context) return;
    const ownerUserId = String(user.userId);
    if (String(context.user?.userId) !== ownerUserId || String(context.trip?._id) !== tripId) {
      return res.status(403).json({ error: 'Sin acceso.' });
    }
    if (req.method === 'GET' && !exactGetQuery(req.query)) return invalid(res);
    if (req.method === 'POST' && !exactKeys(req.query, ['tripId'])) return invalid(res);

    try {
      const body = req.method === 'POST' ? readBody(req) : null;
      const storyId = req.method === 'GET' ? req.query.storyId : body?.scope?.storyId;
      const story = safeId(context.trip?.baseStoryId) ? await resolveStory(context.trip.baseStoryId) : null;
      if (!safeId(storyId) || story?.packageStoryId !== storyId) return invalid(res);
      const scope = { ownerUserId, tripId, storyId };
      const repository = repositoryFor(
        { req, tripId },
        { requireTripMember: async () => context },
      );
      if (req.method === 'GET') {
        const record = await repository.getLatestAndRemember(scope);
        if (!record) return res.status(200).json({ memory: null });
        const memory = safeMemoryProjection(record);
        return memory ? res.status(200).json({ memory }) : unavailable(res);
      }
      if (!acceptedMilestone(body, scope)) return invalid(res);
      const result = await repository.persistOnce(body);
      if (result?.state === 'persisted' && result.type === body.type) {
        return res.status(200).json({ status: 'persisted', type: result.type });
      }
      if (result?.outcome === 'discard' && result.reason === 'duplicate' && result.type === body.type) {
        return res.status(200).json({ status: 'duplicate', type: result.type });
      }
      return unavailable(res);
    } catch {
      return unavailable(res);
    }
  };
}

export default createSemanticMemoriesHandler();
