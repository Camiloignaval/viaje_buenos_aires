import { applyCors } from '../../../lib/cors.js';
import { requireTripRole } from '../../../lib/platformAuth.js';
import { getMemoriesCollection, getTripStatesCollection, toObjectId } from '../../../lib/platformMongo.js';
import { clientMemoryToDocument, ensureTripSyncIndexes, mergeTripSyncState, publicTripSyncState } from '../../../lib/platformSync.js';

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

function tripIdFrom(req) {
  return req.query?.tripId ?? req.query?.id;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const tripId = tripIdFrom(req);

  try {
    const context = await requireTripRole(req, res, tripId, ['owner', 'editor']);
    if (!context) return;

    const tripObjectId = toObjectId(tripId, 'tripId');
    const body = readBody(req);
    const tripStates = await getTripStatesCollection();
    const memories = await getMemoriesCollection();

    await ensureTripSyncIndexes({ tripStates, memories });

    const remoteTripState = await tripStates.findOne({ tripId: tripObjectId });
    const remoteMemories = await memories.find({ tripId: tripObjectId }).toArray();
    const merged = mergeTripSyncState({
      incomingChapterStatuses: body.chapterStatuses,
      incomingMemories: body.memories,
      remoteTripState,
      remoteMemories,
    });

    const now = new Date().toISOString();
    await tripStates.updateOne(
      { tripId: tripObjectId },
      { $set: { tripId: tripObjectId, chapterStatuses: merged.chapterStatuses, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );

    await Promise.all(
      merged.memories.map((memory) => {
        const { createdAt, ...doc } = clientMemoryToDocument(memory, tripObjectId);
        return memories.updateOne(
          { tripId: tripObjectId, legacyId: doc.legacyId },
          { $set: doc, $setOnInsert: { createdAt } },
          { upsert: true }
        );
      })
    );

    return res.status(200).json(publicTripSyncState(merged));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
