import { applyCors } from '../../../lib/cors.js';
import { requireTripRole } from '../../../lib/platformAuth.js';
import { getMemoriesCollection, getTripStatesCollection, toObjectId } from '../../../lib/platformMongo.js';
import { sendPlatformError } from '../../../lib/platformErrors.js';
import {
  clientMemoryToDocument,
  ensureTripSyncIndexes,
  mergeTripSyncState,
  nonSemanticMemoryFilter,
  publicTripSyncState,
} from '../../../lib/platformSync.js';

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

function tripIdFrom(req) {
  return req.query?.tripId ?? req.query?.id;
}

export function createTripSyncHandler(dependencies = {}) {
  const cors = dependencies.applyCors ?? applyCors;
  const authorize = dependencies.requireTripRole ?? requireTripRole;
  const memoriesCollection = dependencies.getMemoriesCollection ?? getMemoriesCollection;
  const tripStatesCollection = dependencies.getTripStatesCollection ?? getTripStatesCollection;
  const objectId = dependencies.toObjectId ?? toObjectId;
  const ensureIndexes = dependencies.ensureTripSyncIndexes ?? ensureTripSyncIndexes;
  const sendError = dependencies.sendPlatformError ?? sendPlatformError;
  const now = dependencies.now ?? (() => new Date().toISOString());

  return async function handler(req, res) {
    if (cors(req, res)) return;

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const tripId = tripIdFrom(req);

    try {
      const context = await authorize(req, res, tripId, ['owner', 'editor']);
      if (!context) return;

      const tripObjectId = objectId(tripId, 'tripId');
      const body = readBody(req);
      const tripStates = await tripStatesCollection();
      const memories = await memoriesCollection();

      await ensureIndexes({ tripStates, memories });

      const remoteTripState = await tripStates.findOne({ tripId: tripObjectId });
      const remoteMemories = await memories.find(nonSemanticMemoryFilter({ tripId: tripObjectId })).toArray();
      const merged = mergeTripSyncState({
        incomingChapterStatuses: body.chapterStatuses,
        incomingMemories: body.memories,
        remoteTripState,
        remoteMemories,
      });

      const updatedAt = now();
      await tripStates.updateOne(
        { tripId: tripObjectId },
        { $set: { tripId: tripObjectId, chapterStatuses: merged.chapterStatuses, updatedAt }, $setOnInsert: { createdAt: updatedAt } },
        { upsert: true },
      );

      await Promise.all(
        merged.memories.map((memory) => {
          const document = clientMemoryToDocument(memory, tripObjectId);
          if (!document) return undefined;
          const { createdAt, ...doc } = document;
          return memories.updateOne(
            nonSemanticMemoryFilter({ tripId: tripObjectId, legacyId: doc.legacyId }),
            { $set: doc, $setOnInsert: { createdAt } },
            { upsert: true },
          );
        }),
      );

      return res.status(200).json(publicTripSyncState(merged));
    } catch (error) {
      return sendError(res, error);
    }
  };
}

export default createTripSyncHandler();
