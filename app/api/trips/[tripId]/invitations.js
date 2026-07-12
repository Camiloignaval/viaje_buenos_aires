import { applyCors } from '../../../lib/cors.js';
import { requireTripRole } from '../../../lib/platformAuth.js';
import { getUsersCollection, toObjectId } from '../../../lib/platformMongo.js';
import { sendPlatformError } from '../../../lib/platformErrors.js';
import { createInvitation, listPendingInvitations } from '../../../lib/platformInvitations.js';

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

// GET  /api/trips/:tripId/invitations           → lista pendientes (owner)
// POST /api/trips/:tripId/invitations { email } → crea invitación   (owner)
export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const tripId = req.query?.tripId;

  try {
    if (req.method === 'GET') {
      const context = await requireTripRole(req, res, tripId, ['owner']);
      if (!context) return;
      const invitations = await listPendingInvitations({ tripId });
      return res.status(200).json({ invitations });
    }

    if (req.method === 'POST') {
      const context = await requireTripRole(req, res, tripId, ['owner']);
      if (!context) return;

      const users = await getUsersCollection();
      const owner = await users.findOne({ _id: toObjectId(context.user.userId, 'userId') });
      if (!owner) return res.status(401).json({ error: 'Inicia sesión para invitar.' });

      const result = await createInvitation({ trip: context.trip, owner, email: readBody(req).email });
      return res.status(201).json({
        invitationId: String(result.invitation._id),
        inviteUrl: result.inviteUrl,
        expiresAt: result.expiresAt,
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
